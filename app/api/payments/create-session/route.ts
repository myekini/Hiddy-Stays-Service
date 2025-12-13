import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Use service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting map (in production, use Redis or database)
const paymentAttempts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60 * 60 * 1000
): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now();
  const attempts = paymentAttempts.get(identifier);

  if (!attempts || now > attempts.resetTime) {
    paymentAttempts.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  if (attempts.count >= maxAttempts) {
    return { allowed: false, remainingAttempts: 0 };
  }

  attempts.count++;
  return { allowed: true, remainingAttempts: maxAttempts - attempts.count };
}

/**
 * POST /api/payments/create-session
 * Creates a Stripe Checkout Session with SERVER-SIDE amount calculation
 *
 * SECURITY: Never trust client-provided amounts - always calculate server-side
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, propertyId, success_url, cancel_url } = body;

    if (!bookingId || !propertyId) {
      return NextResponse.json(
        { error: "Booking ID and property ID are required" },
        { status: 400 }
      );
    }

    // Rate limiting by booking ID (3 attempts per 30 minutes)
    const rateLimit = checkRateLimit(bookingId, 3, 30 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many payment attempts",
          message: "Please wait 30 minutes before trying again",
          retryAfter: 1800,
        },
        { status: 429 }
      );
    }

    console.log(`Creating checkout session for booking ${bookingId}`);

    // Fetch booking to verify and get details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        status,
        payment_status,
        stripe_session_id,
        property_id,
        check_in_date,
        check_out_date,
        guests_count,
        guest_name,
        guest_email,
        properties!inner (
          id,
          title,
          price_per_night,
          is_active
        )
      `
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify booking is not already paid
    if (booking.payment_status === "paid") {
      return NextResponse.json(
        {
          error: "Booking already paid",
          message: "This booking has already been paid for",
        },
        { status: 400 }
      );
    }

    // Verify booking is not cancelled
    if (booking.status === "cancelled") {
      return NextResponse.json(
        {
          error: "Booking cancelled",
          message: "Cannot create payment for cancelled booking",
        },
        { status: 400 }
      );
    }

    const property = Array.isArray(booking.properties)
      ? booking.properties[0]
      : booking.properties;

    if (!property?.is_active) {
      return NextResponse.json(
        {
          error: "Property unavailable",
          message: "Property is no longer available",
        },
        { status: 400 }
      );
    }

    // ========================================================================
    // CRITICAL SECURITY: Calculate amount SERVER-SIDE using database function
    // ========================================================================
    const { data: calculationData, error: calcError } = await supabase.rpc(
      "calculate_booking_amount",
      {
        property_uuid: propertyId,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        guests_count: booking.guests_count,
      }
    );

    if (calcError || !calculationData || calculationData.length === 0) {
      console.error("Amount calculation error:", calcError);
      return NextResponse.json(
        {
          error: "Failed to calculate amount",
          message: "Unable to verify pricing",
        },
        { status: 500 }
      );
    }

    const calculation = calculationData[0];
    const serverAmount = parseFloat(calculation.amount);

    // Check for existing valid session (idempotency)
    if (booking.stripe_session_id) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          booking.stripe_session_id
        );
        if (
          existingSession.status === "open" &&
          existingSession.url &&
          existingSession.expires_at &&
          existingSession.expires_at * 1000 > Date.now()
        ) {
          console.log(
            `Returning existing session: ${booking.stripe_session_id}`
          );
          return NextResponse.json({
            sessionId: existingSession.id,
            url: existingSession.url,
            existingSession: true,
            amount: serverAmount,
            currency: calculation.currency,
          });
        }
      } catch (err: any) {
        console.log(`Previous session invalid: ${err.message}`);
      }
    }

    // Create Stripe Checkout Session
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";
    
    // Payment methods: card + bank options for lower fees
    // Interac for Canada, ACH for US - reduces processing fees
    const paymentMethods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [
      "card",
      // "achoice" // Uncomment for Canadian Interac when enabled in Stripe
    ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethods,
      line_items: [
        {
          price_data: {
            currency: calculation.currency.toLowerCase(),
            product_data: {
              name: property.title,
              description: `${calculation.nights} night${calculation.nights > 1 ? "s" : ""} • ${booking.guests_count} guest${booking.guests_count > 1 ? "s" : ""}`,
              metadata: {
                property_id: propertyId,
                booking_id: bookingId,
              },
            },
            unit_amount: Math.round(serverAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      customer_email: booking.guest_email,
      client_reference_id: bookingId,
      metadata: {
        booking_id: bookingId,
        property_id: propertyId,
        guest_name: booking.guest_name,
        check_in: booking.check_in_date,
        check_out: booking.check_out_date,
        guests: booking.guests_count.toString(),
        calculated_amount: serverAmount.toFixed(2),
      },
      success_url:
        success_url ||
        `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        cancel_url || `${baseUrl}/booking/cancel?booking_id=${bookingId}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
      allow_promotion_codes: true,
      billing_address_collection: "required",
      payment_intent_data: {
        metadata: {
          booking_id: bookingId,
          property_id: propertyId,
        },
        description: `Booking for ${property.title}`,
      },
    });

    console.log(
      `✅ Created session: ${session.id} for booking: ${bookingId} - Amount: $${serverAmount}`
    );

    // Update booking with session ID
    await supabase
      .from("bookings")
      .update({
        stripe_session_id: session.id,
        total_amount: serverAmount, // Update with server-calculated amount
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    // Log payment transaction
    try {
      await supabase.from("payment_transactions").insert({
        booking_id: bookingId,
        transaction_type: "charge",
        amount: serverAmount,
        currency: calculation.currency,
        stripe_session_id: session.id,
        status: "pending",
        metadata: {
          session_created_at: new Date().toISOString(),
          amount_breakdown: calculation.breakdown,
        },
      });
    } catch (logError) {
      console.warn("Failed to log transaction:", logError);
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      expiresAt: session.expires_at,
      amount: serverAmount,
      currency: calculation.currency,
      breakdown: calculation.breakdown,
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);

    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: "Invalid request", message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
