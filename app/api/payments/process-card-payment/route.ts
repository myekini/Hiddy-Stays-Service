import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      booking_id,
      amount,
      currency = "cad",
      card_number,
      exp_month,
      exp_year,
      cvc,
      cardholder_name,
      metadata = {},
    } = body;

    // Validate required fields
    if (!booking_id || !amount || !card_number || !exp_month || !exp_year || !cvc || !cardholder_name) {
      return NextResponse.json(
        { error: "Missing required card information" },
        { status: 400 }
      );
    }

    console.log(`Processing card payment for booking ${booking_id}`);

    // Validate the booking exists
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Create a payment method using the card details
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        number: card_number,
        exp_month: parseInt(exp_month),
        exp_year: parseInt(exp_year),
        cvc,
      },
      billing_details: {
        name: cardholder_name,
        email: booking.guest_email || undefined,
      },
    });

    // Create a payment intent with the card payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethod.id,
      payment_method_types: ["card"],
      metadata: {
        booking_id,
        payment_type: "card",
        cardholder_name,
        ...metadata,
      },
      confirm: true,
      return_url: `${process.env.APP_URL || "http://localhost:3000"}/booking-success`,
    });

    const nowIso = new Date().toISOString();
    const paymentStatus =
      paymentIntent.status === "succeeded"
        ? "paid"
        : paymentIntent.status === "requires_payment_method" ||
            paymentIntent.status === "canceled"
          ? "failed"
          : "pending";

    const bookingStatus = paymentIntent.status === "succeeded" ? "confirmed" : "pending";

    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({
        status: bookingStatus,
        payment_status: paymentStatus,
        payment_method: "card",
        payment_intent_id: paymentIntent.id,
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: nowIso,
      })
      .eq("id", booking_id);

    if (bookingUpdateError) {
      return NextResponse.json(
        { error: "Failed to update booking payment status" },
        { status: 500 }
      );
    }

    // If payment requires additional action (like 3D Secure)
    if (paymentIntent.status === "requires_action") {
      return NextResponse.json({
        success: true,
        requires_action: true,
        payment_intent_client_secret: paymentIntent.client_secret,
        message: "Card payment requires additional authentication",
        data: {
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
          status: paymentIntent.status,
          next_action: paymentIntent.next_action,
        },
      });
    }

    // If payment succeeded immediately
    if (paymentIntent.status === "succeeded") {
      return NextResponse.json({
        success: true,
        message: "Card payment processed successfully",
        data: {
          payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        },
      });
    }

    // For other statuses
    return NextResponse.json({
      success: true,
      message: `Card payment is ${paymentIntent.status}`,
      data: {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      },
    });
  } catch (error: any) {
    console.error("Error processing card payment:", error);
    
    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      return NextResponse.json(
        { 
          error: "Card payment failed",
          details: error.message,
          code: error.code,
          decline_code: error.decline_code,
        },
        { status: 400 }
      );
    }
    
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { 
          error: "Invalid payment request",
          details: error.message,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to process card payment",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}