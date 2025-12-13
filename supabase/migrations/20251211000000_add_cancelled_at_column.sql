-- Add cancelled_at column to bookings table for cleanup tracking
-- This allows us to automatically delete old cancelled bookings

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at 
ON public.bookings(cancelled_at) 
WHERE status = 'cancelled';

-- Update existing cancelled bookings to have a cancelled_at timestamp
-- Set it to updated_at if available, otherwise created_at
UPDATE public.bookings 
SET cancelled_at = COALESCE(updated_at, created_at)
WHERE status = 'cancelled' AND cancelled_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.cancelled_at IS 'Timestamp when booking was cancelled, used for automatic cleanup of old cancelled bookings';
