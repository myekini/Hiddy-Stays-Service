-- Align bookings.payment_status constraint with app-supported values

BEGIN;

-- Normalize legacy payment status values
UPDATE public.bookings
SET payment_status = 'paid'
WHERE payment_status = 'succeeded';

-- Drop any existing CHECK constraints on bookings.payment_status (name can vary by migration)
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'bookings'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%payment_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

-- Ensure the column exists (older DBs may not have it)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

-- Apply the unified constraint
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_payment_status_check
CHECK (
  payment_status IN (
    'pending',
    'processing',
    'paid',
    'failed',
    'refunded',
    'partially_refunded',
    'disputed'
  )
);

COMMENT ON COLUMN public.bookings.payment_status IS
  'Current payment status: pending, processing, paid, failed, refunded, partially_refunded, disputed';

COMMIT;
