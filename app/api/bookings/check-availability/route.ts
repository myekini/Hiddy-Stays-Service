import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role to bypass RLS and see all bookings
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function errorResponse(
  status: number,
  error: string,
  message?: string,
  details?: Record<string, unknown>
) {
  const payload: Record<string, unknown> = {
    success: false,
    error,
  };

  if (message) payload.message = message;
  if (!IS_PRODUCTION && details && Object.keys(details).length > 0) {
    payload.details = details;
  }

  return NextResponse.json(payload, { status });
}

/**
 * POST /api/bookings/check-availability
 * Check if a property is available for the given date range
 * This uses the same logic as the booking creation endpoint
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid request body", "Malformed JSON");
    }

    if (!body || typeof body !== "object") {
      return errorResponse(400, "Invalid request body");
    }

    const parsed = body as Record<string, unknown>;
    const propertyId = parsed.propertyId;
    const checkIn = parsed.checkIn;
    const checkOut = parsed.checkOut;

    // Validate required fields
    if (!propertyId || !checkIn || !checkOut) {
      return errorResponse(400, "Missing required fields", "propertyId, checkIn, and checkOut are required");
    }

    if (typeof propertyId !== "string") {
      return errorResponse(400, "Invalid propertyId");
    }

    if (typeof checkIn !== "string" || typeof checkOut !== "string") {
      return errorResponse(400, "Invalid date range");
    }

    // Check if property exists
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, title")
      .eq("id", propertyId)
      .single();

    if (propertyError || !property) {
      return errorResponse(404, "Property not found");
    }

    // Check blocked date ranges first
    const { data: blockedDates, error: blockedDatesError } = await supabase
      .from("blocked_dates")
      .select("id, start_date, end_date")
      .eq("property_id", propertyId)
      .lt("start_date", checkOut)
      .gte("end_date", checkIn);

    if (blockedDatesError) {
      return errorResponse(500, "Failed to check availability", undefined, {
        code: blockedDatesError.code,
        message: blockedDatesError.message,
      });
    }

    // Get all active bookings for this property
    const { data: existingBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, check_in_date, check_out_date, status")
      .eq("property_id", propertyId)
      .in("status", ["pending", "confirmed"]);

    if (bookingsError) {
      return errorResponse(500, "Failed to check availability", undefined, {
        code: bookingsError.code,
        message: bookingsError.message,
      });
    }

    // Check for date overlaps
    // Two date ranges overlap if: start1 < end2 AND start2 < end1
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const conflicts = (existingBookings || []).filter((booking) => {
      const existingCheckIn = new Date(booking.check_in_date);
      const existingCheckOut = new Date(booking.check_out_date);

      // Check if ranges overlap
      return checkInDate < existingCheckOut && existingCheckIn < checkOutDate;
    });

    const isAvailable = conflicts.length === 0 && (!blockedDates || blockedDates.length === 0);

    return NextResponse.json({
      available: isAvailable,
      propertyId,
      checkIn,
      checkOut,
      blockedDates: (blockedDates || []).map((b) => ({
        start_date: b.start_date,
        end_date: b.end_date,
      })),
      conflicts: conflicts.map((c) => ({
        checkIn: c.check_in_date,
        checkOut: c.check_out_date,
      })),
    });
  } catch {
    return errorResponse(500, "Internal server error");
  }
}
