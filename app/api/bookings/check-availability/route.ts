import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role to bypass RLS and see all bookings
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/bookings/check-availability
 * Check if a property is available for the given date range
 * This uses the same logic as the booking creation endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, checkIn, checkOut } = body;

    // Validate required fields
    if (!propertyId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: "propertyId, checkIn, and checkOut are required" },
        { status: 400 }
      );
    }

    // Check if property exists
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, title")
      .eq("id", propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Get all active bookings for this property
    const { data: existingBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, check_in_date, check_out_date, status")
      .eq("property_id", propertyId)
      .in("status", ["pending", "confirmed"]);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json(
        { error: "Failed to check availability" },
        { status: 500 }
      );
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

    const isAvailable = conflicts.length === 0;

    return NextResponse.json({
      available: isAvailable,
      propertyId,
      checkIn,
      checkOut,
      conflicts: conflicts.map((c) => ({
        checkIn: c.check_in_date,
        checkOut: c.check_out_date,
      })),
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
