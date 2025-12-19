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
