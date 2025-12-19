import { createClient } from "@/integrations/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/bookings/[id]/reject
 * Host rejects a pending booking
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

    const body = await req.json();
    const { reason } = body;

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        property_id,
        guest_id,
        status,
        payment_status,
        check_in_date,
        check_out_date,
        host_id,
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
        { error: "Only the property host can reject bookings" },
        { status: 403 }
      );
    }

    // Check booking status
    if (booking.status !== "pending") {
      return NextResponse.json(
        {
          error: `Cannot reject booking with status: ${booking.status}. Only pending bookings can be rejected.`,
        },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to reject booking" },
        { status: 500 }
      );
    }

    // If payment was made, initiate refund process
    if (booking.payment_status === "paid") {
      // TODO: Integrate with Stripe refund API
      // This would call the refund endpoint
      console.log(
        `TODO: Initiate refund for booking ${bookingId} - payment_status: paid`
      );
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "reject_booking",
      entity_type: "booking",
      entity_id: bookingId,
      metadata: {
        property_id: booking.property_id,
        guest_id: booking.guest_id,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        reason: reason || "Not specified",
      },
    });

    // TODO: Send email notification to guest
    // This would integrate with the unified email service

    return NextResponse.json({
      success: true,
      message: "Booking rejected successfully",
      booking: {
        id: bookingId,
        status: "cancelled",
        property_title: booking.properties.title,
        refund_initiated: booking.payment_status === "paid",
      },
    });
  } catch (error) {
    console.error("Error rejecting booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
