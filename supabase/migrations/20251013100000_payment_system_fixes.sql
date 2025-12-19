-- ========================================================================
-- PAYMENT SYSTEM FIXES - WEEK 1 CRITICAL
-- ========================================================================
-- This migration adds all missing payment-related fields and tables
-- to support a complete, secure payment system with Stripe
-- ========================================================================

BEGIN;

-- ========================================================================
-- STEP 1: Update bookings table with missing payment fields
-- ========================================================================

-- Add payment status field
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded'));

-- Add Stripe payment tracking fields
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add refund tracking fields
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS refund_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Add guest information fields (for non-logged-in bookings)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- Add indexes for payment lookups
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent
  ON public.bookings(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session
  ON public.bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
  ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created
  ON public.bookings(status, created_at DESC);

COMMENT ON COLUMN public.bookings.payment_status IS
  'Current payment status: pending, paid, failed, refunded, partially_refunded';
COMMENT ON COLUMN public.bookings.payment_intent_id IS
  'Stripe PaymentIntent ID for tracking and refunds';
COMMENT ON COLUMN public.bookings.stripe_session_id IS
  'Stripe Checkout Session ID for payment verification';

-- ========================================================================
-- STEP 2: Create payment_transactions table for audit trail
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type VARCHAR(20) NOT NULL
    CHECK (transaction_type IN ('charge', 'refund', 'partial_refund', 'failed_charge', 'dispute')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,
  stripe_session_id TEXT,

  -- Status tracking
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  failure_reason TEXT,
  failure_code TEXT,

  -- Additional metadata
  payment_method_type VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Indexes for payment transactions
CREATE INDEX idx_payment_transactions_booking
  ON public.payment_transactions(booking_id);
CREATE INDEX idx_payment_transactions_payment_intent
  ON public.payment_transactions(stripe_payment_intent_id);
CREATE INDEX idx_payment_transactions_session
  ON public.payment_transactions(stripe_session_id);
CREATE INDEX idx_payment_transactions_created
  ON public.payment_transactions(created_at DESC);
CREATE INDEX idx_payment_transactions_status
  ON public.payment_transactions(status, transaction_type);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their own transactions
DROP POLICY IF EXISTS "Users can view their own payment transactions"
  ON public.payment_transactions;
CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      JOIN public.profiles p ON (p.id = b.guest_id OR p.id = b.host_id)
      WHERE p.user_id = auth.uid()
    )
  );

-- System can insert and update
DROP POLICY IF EXISTS "System can manage payment transactions"
  ON public.payment_transactions;
CREATE POLICY "System can manage payment transactions"
  ON public.payment_transactions FOR ALL
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

COMMENT ON TABLE public.payment_transactions IS
  'Complete audit trail of all payment transactions including charges, refunds, and failures';

-- ========================================================================
-- STEP 3: Create stripe_webhook_events table for idempotency
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stripe event details
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,

  -- Related entities
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  payment_intent_id TEXT,
  session_id TEXT,

  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processing_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  -- Event data
  payload JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- Indexes for webhook events
CREATE UNIQUE INDEX idx_webhook_events_event_id
  ON public.stripe_webhook_events(event_id);
CREATE INDEX idx_webhook_events_booking
  ON public.stripe_webhook_events(booking_id);
CREATE INDEX idx_webhook_events_payment_intent
  ON public.stripe_webhook_events(payment_intent_id);
CREATE INDEX idx_webhook_events_processed
  ON public.stripe_webhook_events(processed, created_at);
CREATE INDEX idx_webhook_events_type
  ON public.stripe_webhook_events(event_type);

-- Enable RLS (admin-only access)
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view webhook events"
  ON public.stripe_webhook_events;
CREATE POLICY "Admins can view webhook events"
  ON public.stripe_webhook_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can manage webhook events"
  ON public.stripe_webhook_events;
CREATE POLICY "System can manage webhook events"
  ON public.stripe_webhook_events FOR ALL
  WITH CHECK (true);

GRANT SELECT ON public.stripe_webhook_events TO authenticated;
GRANT ALL ON public.stripe_webhook_events TO service_role;

COMMENT ON TABLE public.stripe_webhook_events IS
  'Tracks all Stripe webhook events for idempotency and debugging';

-- ========================================================================
-- STEP 4: Create function to calculate booking amount
-- ========================================================================

CREATE OR REPLACE FUNCTION public.calculate_booking_amount(
  property_uuid UUID,
  check_in_date DATE,
  check_out_date DATE,
  guests_count INTEGER
)
RETURNS TABLE (
  amount DECIMAL(10,2),
  nights INTEGER,
  price_per_night DECIMAL(10,2),
  currency VARCHAR(3),
  breakdown JSONB
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  property_price DECIMAL(10,2);
  night_count INTEGER;
  total_amount DECIMAL(10,2);
  cleaning_fee DECIMAL(10,2) := 0;
  service_fee DECIMAL(10,2) := 0;
BEGIN
  -- Get property price (qualify column name to avoid ambiguity)
  SELECT p.price_per_night INTO property_price
  FROM public.properties p
  WHERE p.id = property_uuid AND p.is_active = true;

  IF property_price IS NULL THEN
    RAISE EXCEPTION 'Property not found or not active';
  END IF;

  -- Calculate nights
  night_count := check_out_date - check_in_date;

  IF night_count < 1 THEN
    RAISE EXCEPTION 'Check-out must be after check-in';
  END IF;

  -- Calculate base amount
  total_amount := property_price * night_count;

  -- Add cleaning fee (flat rate, can be customized per property)
  cleaning_fee := 25.00;

  -- Add service fee (10% of subtotal)
  service_fee := ROUND((total_amount + cleaning_fee) * 0.10, 2);

  -- Final total
  total_amount := total_amount + cleaning_fee + service_fee;

  RETURN QUERY SELECT
    total_amount,
    night_count,
    property_price,
    'USD'::VARCHAR(3),
    jsonb_build_object(
      'subtotal', property_price * night_count,
      'cleaning_fee', cleaning_fee,
      'service_fee', service_fee,
      'total', total_amount,
      'nights', night_count,
      'price_per_night', property_price
    );
END;
$$;

COMMENT ON FUNCTION public.calculate_booking_amount IS
  'Calculates the total booking amount server-side to prevent client manipulation.
   Returns amount, nights, price breakdown for validation and display.';

-- ========================================================================
-- STEP 5: Create function to cleanup abandoned bookings
-- ========================================================================

CREATE OR REPLACE FUNCTION public.cleanup_abandoned_bookings()
RETURNS TABLE (
  deleted_count INTEGER,
  booking_ids UUID[]
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_ids UUID[];
  count INTEGER;
BEGIN
  -- Delete bookings that are:
  -- 1. Status = 'pending'
  -- 2. Payment status = 'pending'
  -- 3. Created more than 1 hour ago (card) OR more than 24 hours ago (bank transfer)
  WITH deleted AS (
    DELETE FROM public.bookings
    WHERE status = 'pending'
    AND payment_status = 'pending'
    AND (
      (payment_method = 'bank_transfer' AND created_at < NOW() - INTERVAL '24 hours')
      OR ((payment_method IS NULL OR payment_method <> 'bank_transfer') AND created_at < NOW() - INTERVAL '1 hour')
    )
    RETURNING id
  )
  SELECT ARRAY_AGG(id), COUNT(*) INTO deleted_ids, count FROM deleted;

  RETURN QUERY SELECT count, deleted_ids;
END;
$$;

COMMENT ON FUNCTION public.cleanup_abandoned_bookings IS
  'Removes abandoned bookings (pending for >1 hour) to keep database clean.
   Returns count and IDs of deleted bookings.';

-- ========================================================================
-- STEP 6: Update existing bookings with default payment_status
-- ========================================================================

-- Set payment_status for existing bookings based on current status
UPDATE public.bookings
SET payment_status = CASE
  WHEN status = 'confirmed' THEN 'paid'
  WHEN status = 'cancelled' THEN 'failed'
  ELSE 'pending'
END
WHERE payment_status IS NULL;

-- ========================================================================
-- STEP 7: Create updated_at trigger for payment_transactions
-- ========================================================================

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- ========================================================================
-- SUCCESS MESSAGE
-- ========================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =================================================================';
  RAISE NOTICE '✅ PAYMENT SYSTEM FIXES - WEEK 1 CRITICAL';
  RAISE NOTICE '✅ =================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was added:';
  RAISE NOTICE '  1. ✅ Updated bookings table with payment fields';
  RAISE NOTICE '  2. ✅ Created payment_transactions table for audit trail';
  RAISE NOTICE '  3. ✅ Created stripe_webhook_events for idempotency';
  RAISE NOTICE '  4. ✅ Added calculate_booking_amount() function';
  RAISE NOTICE '  5. ✅ Added cleanup_abandoned_bookings() function';
  RAISE NOTICE '  6. ✅ Added indexes for performance';
  RAISE NOTICE '  7. ✅ Set up RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 New functions available:';
  RAISE NOTICE '  - public.calculate_booking_amount(property_id, check_in, check_out, guests)';
  RAISE NOTICE '  - public.cleanup_abandoned_bookings()';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test calculation:';
  RAISE NOTICE '  SELECT * FROM public.calculate_booking_amount(';
  RAISE NOTICE '    ''property-uuid'',';
  RAISE NOTICE '    CURRENT_DATE,';
  RAISE NOTICE '    CURRENT_DATE + 3,';
  RAISE NOTICE '    2';
  RAISE NOTICE '  );';
  RAISE NOTICE '';
  RAISE NOTICE '📊 View payment transactions:';
  RAISE NOTICE '  SELECT * FROM public.payment_transactions ORDER BY created_at DESC LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Check webhook event processing:';
  RAISE NOTICE '  SELECT event_type, processed, processing_attempts FROM public.stripe_webhook_events;';
  RAISE NOTICE '';
END $$;
