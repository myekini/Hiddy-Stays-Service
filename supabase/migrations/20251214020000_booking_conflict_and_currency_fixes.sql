-- Booking conflict + currency fixes

-- Ensure pricing calculation returns CAD
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

  cleaning_fee := 25.00;
  service_fee := ROUND((total_amount + cleaning_fee) * 0.10, 2);
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

-- Ensure bookings default currency is CAD
ALTER TABLE public.bookings
  ALTER COLUMN currency SET DEFAULT 'CAD';

UPDATE public.bookings
  SET currency = 'CAD'
  WHERE currency IS NULL;

-- Prevent double-bookings at the database level (race-condition safe)
CREATE OR REPLACE FUNCTION public.prevent_overlapping_bookings()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.property_id::text));

  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.property_id = NEW.property_id
      AND b.status IN ('pending', 'confirmed')
      AND b.id IS DISTINCT FROM NEW.id
      AND daterange(b.check_in_date, b.check_out_date, '[)') &&
          daterange(NEW.check_in_date, NEW.check_out_date, '[)')
  ) THEN
    RAISE EXCEPTION 'Booking dates overlap with an existing booking'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_overlapping_bookings_trigger ON public.bookings;

CREATE TRIGGER prevent_overlapping_bookings_trigger
BEFORE INSERT OR UPDATE OF property_id, check_in_date, check_out_date, status
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_overlapping_bookings();
