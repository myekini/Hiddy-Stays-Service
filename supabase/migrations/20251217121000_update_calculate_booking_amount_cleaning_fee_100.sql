-- Update calculate_booking_amount to use $100 flat cleaning fee (one-time)
-- Aligns server-side Stripe pricing with UI.

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
  SELECT p.price_per_night INTO property_price
  FROM public.properties p
  WHERE p.id = property_uuid AND p.is_active = true;

  IF property_price IS NULL THEN
    RAISE EXCEPTION 'Property not found or not active';
  END IF;

  night_count := check_out_date - check_in_date;

  IF night_count < 1 THEN
    RAISE EXCEPTION 'Check-out must be after check-in';
  END IF;

  total_amount := property_price * night_count;

  -- One-time cleaning fee (global default)
  cleaning_fee := 100.00;

  -- Service fee (12% of subtotal)
  service_fee := ROUND((total_amount) * 0.12, 2);

  total_amount := total_amount + cleaning_fee + service_fee;

  RETURN QUERY SELECT
    total_amount,
    night_count,
    property_price,
    'CAD'::VARCHAR(3),
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
   Returns amount, nights, price breakdown for validation and display.
   Policy: Adds a $100 one-time cleaning fee and 12% service fee. Returns CAD.';
