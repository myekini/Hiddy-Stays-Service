import { createClient } from "@/integrations/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/bookings/[id]/accept
 * Host accepts a pending booking
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const bookingId = resolvedParams.id;

    const { data: hostProfile, error: hostProfileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (hostProfileError || !hostProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        property_id,
        guest_id,
        host_id,
        status,
        check_in_date,
        check_out_date,
        properties!inner (
          host_id,
          title
        )
      `
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify user is the property host
    if (booking.properties.host_id !== hostProfile.id && booking.host_id !== hostProfile.id) {
      return NextResponse.json(
        { error: "Only the property host can accept bookings" },
        { status: 403 }
      );
    }

    // Check booking status
    if (booking.status !== "pending") {
      return NextResponse.json(
        {
          error: `Cannot accept booking with status: ${booking.status}. Only pending bookings can be accepted.`,
        },
        { status: 400 }
      );
    }

    // Check property is still available for those dates
    const { data: availCheck } = await supabase.rpc(
      "check_property_availability",
      {
        property_uuid: booking.property_id,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
      }
    );

    if (!availCheck?.[0]?.is_available) {
      return NextResponse.json(
        { error: "Property is no longer available for these dates" },
        { status: 409 }
      );
    }

    // Update booking status to confirmed
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to accept booking" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "accept_booking",
      entity_type: "booking",
      entity_id: bookingId,
      metadata: {
        property_id: booking.property_id,
        guest_id: booking.guest_id,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
      },
    });

    // TODO: Send email notification to guest
    // This would integrate with the unified email service

    return NextResponse.json({
      success: true,
      message: "Booking accepted successfully",
      booking: {
        id: bookingId,
        status: "confirmed",
        property_title: booking.properties.title,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
