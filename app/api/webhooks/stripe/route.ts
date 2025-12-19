import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Use service role key for webhook to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events with idempotency and error recovery
 *
 * WEEK 2 IMPROVEMENTS:
 * - Idempotency using stripe_webhook_events table
 * - Event deduplication to prevent double-processing
 * - Error recovery with retry tracking
 * - Comprehensive transaction logging
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("❌ No stripe-signature header");
      return NextResponse.json(
        { error: "No stripe signature" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`❌ Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`📥 Webhook received: ${event.type} (ID: ${event.id})`);

    // ========================================================================
    // CRITICAL: Check for duplicate events (idempotency)
    // ========================================================================
    const { data: existingEvent, error: checkError } = await supabase
      .from("stripe_webhook_events")
      .select("id, processed, processing_attempts, event_type")
      .eq("event_id", event.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("❌ Error checking for duplicate event:", checkError);
      // Continue processing - don't fail on check error
    }

    if (existingEvent) {
      if (existingEvent.processed) {
        console.log(`✅ Event ${event.id} already processed (idempotency)`);
        return NextResponse.json({
          received: true,
          already_processed: true,
          event_type: existingEvent.event_type,
        });
      } else {
        console.log(
          `⚠️ Event ${event.id} exists but not processed (attempt ${existingEvent.processing_attempts + 1})`
        );
      }
    }

    // Extract booking ID and payment intent from event
    const bookingId = extractBookingId(event);
    const paymentIntentId = extractPaymentIntentId(event);

    // Log event (or update if exists)
    const { error: logError } = await supabase
      .from("stripe_webhook_events")
      .upsert(
        {
          event_id: event.id,
          event_type: event.type,
          booking_id: bookingId || null,
          payment_intent_id: paymentIntentId || null,
          processed: false,
          processing_attempts: (existingEvent?.processing_attempts || 0) + 1,
          payload: event.data.object as any,
          created_at: new Date(event.created * 1000).toISOString(),
        },
        {
          onConflict: "event_id",
        }
      );

    if (logError) {
      console.error("❌ Failed to log webhook event:", logError);
      // Don't fail webhook processing if logging fails
    }

    // ========================================================================
    // Process the event
    // ========================================================================
    let handlerSuccess = false;
    let handlerError: Error | null = null;

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session
          );
          break;

        case "checkout.session.async_payment_succeeded":
          await handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session
          );
          break;

        case "checkout.session.async_payment_failed":
          await handlePaymentFailed(
            event.data.object as Stripe.Checkout.Session
          );
          break;

        case "payment_intent.succeeded":
          await handlePaymentSucceeded(
            event.data.object as Stripe.PaymentIntent
          );
          break;

        case "payment_intent.payment_failed":
          await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case "charge.refunded":
          await handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case "charge.dispute.created":
          await handleDisputeCreated(event.data.object as Stripe.Dispute);
          break;

        default:
          console.log(`ℹ️ Unhandled event type: ${event.type}`);
          handlerSuccess = true; // Mark as success so we don't retry
      }

      handlerSuccess = true;
      console.log(`✅ Event ${event.id} processed successfully in ${Date.now() - startTime}ms`);
    } catch (error: any) {
      handlerError = error;
      console.error(`❌ Error processing event ${event.id}:`, error);
    }

    // ========================================================================
    // Update event status
    // ========================================================================
    await supabase
      .from("stripe_webhook_events")
      .update({
        processed: handlerSuccess,
        last_error: handlerError?.message || null,
        last_error_at: handlerError ? new Date().toISOString() : null,
        processed_at: handlerSuccess ? new Date().toISOString() : null,
      })
      .eq("event_id", event.id);

    // If handler failed, return 500 so Stripe retries
    if (!handlerSuccess) {
      return NextResponse.json(
        {
          error: "Event processing failed",
          event_id: event.id,
          event_type: event.type,
          will_retry: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      received: true,
      event_id: event.id,
      event_type: event.type,
      processing_time_ms: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error("❌ Webhook handler critical error:", error);
    return NextResponse.json(
      {
        error: "Webhook handler failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Extract booking ID from various event types
 */
function extractBookingId(event: Stripe.Event): string | null {
  const obj = event.data.object as any;
  return (
    obj.metadata?.booking_id ||
    obj.client_reference_id ||
    null
  );
}

/**
 * Helper: Extract payment intent ID from various event types
 */
function extractPaymentIntentId(event: Stripe.Event): string | null {
  const obj = event.data.object as any;

  if (event.type.startsWith("payment_intent.")) {
    return obj.id;
  }

  if (event.type.startsWith("checkout.session.")) {
    return obj.payment_intent || null;
  }

  if (event.type.startsWith("charge.")) {
    return obj.payment_intent || null;
  }

  return null;
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log("Processing checkout session completed:", session.id);

  try {
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      console.error("No booking_id in session metadata");
      return;
    }

    // Check if booking is already confirmed (idempotency)
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("payment_status")
      .eq("id", bookingId)
      .single();

    if (existingBooking?.payment_status === "paid") {
      console.log(`✅ Booking ${bookingId} already confirmed (idempotency)`);
      return; // Already processed, skip
    }

    // Update booking status to confirmed
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_status: "paid",
        payment_intent_id: session.payment_intent as string,
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_session_id: session.id,
        payment_method: session.payment_method_types?.[0] || "card",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (bookingError) {
      console.error("Error updating booking:", bookingError);
      throw bookingError;
    }

    // Log successful payment transaction
    await supabase.from("payment_transactions").insert({
      booking_id: bookingId,
      transaction_type: "charge",
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || "usd",
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_session_id: session.id,
      stripe_charge_id: null, // Will be updated when charge event arrives
      status: "succeeded",
      payment_method_type: session.payment_method_types?.[0] || "card",
      completed_at: new Date().toISOString(),
      metadata: {
        webhook_event: "checkout.session.completed",
        customer_email: session.customer_email,
      },
    });

    console.log(`✅ Booking ${bookingId} confirmed and transaction logged`);

    // Get booking details for notification
    const { data: bookingDetails } = await supabase
      .from("bookings")
      .select(
        `
        *,
        properties (
          id,
          title,
          address,
          host_id,
          profiles!properties_host_id_fkey (
            user_id,
            email,
            first_name,
            last_name
          )
        ),
        profiles!bookings_guest_id_fkey (
          user_id,
          email,
          first_name,
          last_name
        )
      `
      )
      .eq("id", bookingId)
      .single();

    if (bookingDetails) {
      // TODO: Send confirmation emails to guest and host
      console.log("📧 Should send confirmation emails");
      console.log(`Guest: ${bookingDetails.profiles?.email}`);
      console.log(`Host: ${bookingDetails.properties?.profiles?.email}`);

      // TODO: Create notification records
      await createNotification({
        user_id: bookingDetails.guest_id,
        type: "booking_confirmed",
        title: "Booking Confirmed!",
        message: `Your booking at ${bookingDetails.properties?.title} has been confirmed.`,
        metadata: { booking_id: bookingId },
      });

      await createNotification({
        user_id: bookingDetails.properties?.host_id,
        type: "new_booking",
        title: "New Booking Received",
        message: `You have a new booking from ${bookingDetails.profiles?.first_name} ${bookingDetails.profiles?.last_name}.`,
        metadata: { booking_id: bookingId },
      });
    }
  } catch (error) {
    console.error("Error in handleCheckoutSessionCompleted:", error);
    throw error;
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("Processing payment succeeded:", paymentIntent.id);

  try {
    const bookingId = paymentIntent.metadata?.booking_id;

    if (!bookingId) {
      console.error("No booking_id in payment intent metadata");
      return;
    }

    const { data: existingBooking, error: existingBookingError } = await supabase
      .from("bookings")
      .select("id, status, payment_status")
      .eq("id", bookingId)
      .single();

    if (existingBookingError || !existingBooking) {
      console.error("Booking not found for payment intent:", bookingId);
      return;
    }

    if (["cancelled", "completed"].includes(existingBooking.status)) {
      console.log(
        `ℹ️ Booking ${bookingId} is ${existingBooking.status}; skipping status update on payment success`
      );
      return;
    }

    // Update booking (covers the case where checkout.session.completed is missed or delayed)
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_status: "paid",
        payment_intent_id: paymentIntent.id,
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      console.error("Error updating booking payment status:", error);
      throw error;
    }

    console.log(`✅ Payment confirmed for booking ${bookingId}`);
  } catch (error) {
    console.error("Error in handlePaymentSucceeded:", error);
    throw error;
  }
}

async function handlePaymentFailed(
  sessionOrIntent: Stripe.Checkout.Session | Stripe.PaymentIntent
) {
  console.log("Processing payment failed:", sessionOrIntent.id);

  try {
    const bookingId = sessionOrIntent.metadata?.booking_id;

    if (!bookingId) {
      console.error("No booking_id in metadata");
      return;
    }

    const paymentIntentId =
      (sessionOrIntent as any).object === "payment_intent"
        ? (sessionOrIntent as Stripe.PaymentIntent).id
        : ((sessionOrIntent as Stripe.Checkout.Session)
            .payment_intent as string | null) || null;

    const { data: existingBooking, error: existingBookingError } = await supabase
      .from("bookings")
      .select("id, status, payment_status")
      .eq("id", bookingId)
      .single();

    if (existingBookingError || !existingBooking) {
      console.error("Booking not found for payment failure:", bookingId);
      return;
    }

    if (existingBooking.payment_status === "paid") {
      console.log(`ℹ️ Booking ${bookingId} already paid; skipping failure update`);
      return;
    }

    if (["cancelled", "completed"].includes(existingBooking.status)) {
      console.log(
        `ℹ️ Booking ${bookingId} is ${existingBooking.status}; skipping failure update`
      );
      return;
    }

    // Mark payment as failed but keep booking pending so it can be retried
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "pending",
        payment_status: "failed",
        ...(paymentIntentId
          ? {
              payment_intent_id: paymentIntentId,
              stripe_payment_intent_id: paymentIntentId,
            }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      console.error("Error updating booking to failed:", error);
      throw error;
    }

    console.log(`❌ Booking ${bookingId} marked as failed`);

    // Notify guest
    const { data: booking } = await supabase
      .from("bookings")
      .select("guest_id, properties(title)")
      .eq("id", bookingId)
      .single();

    if (booking) {
      await createNotification({
        user_id: booking.guest_id,
        type: "payment_failed",
        title: "Payment Failed",
        message: `Your payment for ${booking.properties?.[0]?.title || "your booking"} failed. Please try again.`,
        metadata: { booking_id: bookingId },
      });
    }
  } catch (error) {
    console.error("Error in handlePaymentFailed:", error);
    throw error;
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log("Processing charge refunded:", charge.id);

  try {
    const paymentIntentId = charge.payment_intent as string;

    if (!paymentIntentId) {
      console.error("No payment intent ID in charge");
      return;
    }

    // Find booking by payment intent
    const { data: booking, error: findError } = await supabase
      .from("bookings")
      .select("id, guest_id, property_id, properties(title)")
      .eq("payment_intent_id", paymentIntentId)
      .single();

    if (findError || !booking) {
      console.error("Booking not found for refunded charge");
      return;
    }

    const refundedAmount = charge.amount_refunded || 0;
    const fullAmount = charge.amount || 0;
    const nextPaymentStatus =
      refundedAmount > 0 && refundedAmount < fullAmount
        ? "partially_refunded"
        : "refunded";

    // Update booking
    const { error } = await supabase
      .from("bookings")
      .update({
        payment_status: nextPaymentStatus,
        refund_amount: refundedAmount / 100, // Convert from cents
        refund_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (error) {
      console.error("Error updating booking refund:", error);
      throw error;
    }

    console.log(`✅ Refund processed for booking ${booking.id}`);

    // Notify guest
    await createNotification({
      user_id: booking.guest_id,
      type: "refund_processed",
      title: "Refund Processed",
      message: `Your refund for ${booking.properties?.[0]?.title || "your booking"} has been processed.`,
      metadata: { booking_id: booking.id },
    });
  } catch (error) {
    console.error("Error in handleChargeRefunded:", error);
    throw error;
  }
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  console.log("Processing dispute created:", dispute.id);

  try {
    const charge = dispute.charge as string;

    // Find booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, host_id, properties(title, host_id)")
      .eq("payment_intent_id", dispute.payment_intent as string)
      .single();

    if (booking) {
      // Notify host
      await createNotification({
        user_id: booking.properties?.[0]?.host_id,
        type: "payment_dispute",
        title: "Payment Dispute",
        message: `A payment dispute has been filed for booking at ${booking.properties?.[0]?.title || "your property"}.`,
        metadata: { booking_id: booking.id, dispute_id: dispute.id },
      });

      console.log(`⚠️ Dispute created for booking ${booking.id}`);
    }
  } catch (error) {
    console.error("Error in handleDisputeCreated:", error);
    throw error;
  }
}

async function createNotification(notification: {
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}) {
  try {
    const { error } = await supabase.from("notifications").insert({
      ...notification,
      read: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating notification:", error);
    }
  } catch (error) {
    console.error("Error in createNotification:", error);
  }
}
