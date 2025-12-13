import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log("🚀 Simple payment verification API called");
  
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Retrieving Stripe session:", sessionId);

    // Get Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge"],
    });

    console.log("✅ Session retrieved:", {
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
    });

    // Check if payment is successful
    const paymentSuccessful = 
      session.payment_status === "paid" || 
      session.status === "complete";

    if (!paymentSuccessful) {
      return NextResponse.json({
        success: false,
        message: "Payment is still processing. Please wait a few seconds and refresh.",
        sessionId: session.id,
        paymentStatus: session.payment_status,
        processing: true,
      });
    }

    // Get booking ID from session metadata
    const bookingId = session.metadata?.booking_id;
    if (!bookingId) {
      return NextResponse.json(
        { error: "No booking ID found in session" },
        { status: 400 }
      );
    }

    console.log("📋 Updating booking:", bookingId);

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError || !updatedBooking) {
      console.error("❌ Failed to update booking:", updateError);
      return NextResponse.json(
        { error: "Failed to update booking" },
        { status: 500 }
      );
    }

    console.log("✅ Booking updated successfully");

    // Return success response
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      paymentStatus: "paid",
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        checkInDate: updatedBooking.check_in_date,
        checkOutDate: updatedBooking.check_out_date,
        totalAmount: updatedBooking.total_amount,
        guestName: updatedBooking.guest_name,
        guestEmail: updatedBooking.guest_email,
      },
    });

  } catch (error) {
    console.error("❌ Payment verification error:", error);
    return NextResponse.json(
      { 
        error: "Failed to verify payment", 
        message: "An unexpected error occurred" 
      },
      { status: 500 }
    );
  }
}
