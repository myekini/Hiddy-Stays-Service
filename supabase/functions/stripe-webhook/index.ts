import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebhookEvent {
  id: string;
  created: number;
  type: string;
  data: {
    object: any;
  };
}

function extractBookingId(event: WebhookEvent): string | null {
  const obj = event.data.object as any;
  return (
    obj?.metadata?.booking_id ||
    obj?.metadata?.bookingId ||
    obj?.client_reference_id ||
    null
  );
}

function extractPaymentIntentId(event: WebhookEvent): string | null {
  const obj = event.data.object as any;

  if (event.type.startsWith("payment_intent.")) {
    return obj?.id || null;
  }

  if (event.type.startsWith("checkout.session.")) {
    return obj?.payment_intent || null;
  }

  if (event.type.startsWith("charge.")) {
    return obj?.payment_intent || null;
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const enabled = (Deno.env.get("ENABLE_SUPABASE_STRIPE_WEBHOOK") || "").toLowerCase();
  if (enabled !== "true") {
    return new Response(JSON.stringify({ error: "Not found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });
  }

  try {
    console.log("🔔 Stripe webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    // Verify the webhook signature
    let event: WebhookEvent;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`📋 Processing webhook event: ${event.type}`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const bookingId = extractBookingId(event);
    const paymentIntentId = extractPaymentIntentId(event);

    // Idempotency: try insert first (atomic). If conflict, check if already processed.
    const createdAt = new Date(event.created * 1000).toISOString();
    const { error: insertError } = await supabase
      .from("stripe_webhook_events")
      .insert({
        event_id: event.id,
        event_type: event.type,
        booking_id: bookingId || null,
        payment_intent_id: paymentIntentId || null,
        processed: false,
        processing_attempts: 1,
        payload: event.data.object,
        created_at: createdAt,
      });

    if (insertError) {
      const isConflict =
        insertError.code === "23505" ||
        (typeof insertError.message === "string" &&
          insertError.message.toLowerCase().includes("duplicate"));

      if (!isConflict) {
        console.error("❌ Failed to insert webhook event:", insertError);
      }

      const { data: existingEvent, error: existingEventError } = await supabase
        .from("stripe_webhook_events")
        .select("id, processed, processing_attempts")
        .eq("event_id", event.id)
        .single();

      if (existingEventError) {
        console.error(
          "❌ Failed to fetch existing webhook event after insert error:",
          existingEventError
        );
      }

      if (existingEvent?.processed) {
        console.log(`✅ Event ${event.id} already processed (idempotency)`);
        return new Response(
          JSON.stringify({ received: true, already_processed: true }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // Track retry attempts when event exists but is not processed
      await supabase
        .from("stripe_webhook_events")
        .update({
          processing_attempts: (existingEvent?.processing_attempts || 0) + 1,
          last_error: insertError.message || null,
          last_error_at: new Date().toISOString(),
        })
        .eq("event_id", event.id);
    }

    // Handle different event types
    let handlerSuccess = false;
    let handlerError: Error | null = null;

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(event.data.object, supabase);
          break;

        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(event.data.object, supabase);
          break;

        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(event.data.object, supabase);
          break;

        case "charge.refunded":
          await handleChargeRefunded(event.data.object, supabase);
          break;

        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded(event.data.object, supabase);
          break;

        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(event.data.object, supabase);
          break;

        default:
          console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }

      handlerSuccess = true;
    } catch (err) {
      handlerError = err instanceof Error ? err : new Error(String(err));
      console.error(`❌ Error processing event ${event.id}:`, handlerError);
    }

    await supabase
      .from("stripe_webhook_events")
      .update({
        processed: handlerSuccess,
        last_error: handlerError?.message || null,
        last_error_at: handlerError ? new Date().toISOString() : null,
        processed_at: handlerSuccess ? new Date().toISOString() : null,
      })
      .eq("event_id", event.id);

    if (!handlerSuccess) {
      return new Response(
        JSON.stringify({ error: "Event processing failed", will_retry: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log("✅ Webhook processed successfully");
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleCheckoutSessionCompleted(session: any, supabase: any) {
  console.log("💳 Processing checkout session completed");

  const bookingId = session.metadata?.booking_id || session.metadata?.bookingId;
  if (!bookingId) {
    console.error("No booking ID found in session metadata");
    return;
  }

  try {
    const nowIso = new Date().toISOString();
    const { data: updatedRows, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_status: "paid",
        payment_intent_id: session.payment_intent,
        stripe_payment_intent_id: session.payment_intent,
        updated_at: nowIso,
      })
      .eq("id", bookingId)
      .neq("payment_status", "paid")
      .select("*");

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return;
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.log("✅ Booking already paid (idempotency):", bookingId);
      return;
    }

    const booking = updatedRows[0];
    console.log("✅ Booking confirmed:", bookingId);
  } catch (error) {
    console.error("Error processing checkout session:", error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any, supabase: any) {
  console.log("💳 Processing payment intent succeeded");

  try {
    // Find booking by payment intent ID
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .or(
        `stripe_payment_intent_id.eq.${paymentIntent.id},payment_intent_id.eq.${paymentIntent.id}`
      )
      .single();

    if (bookingError || !booking) {
      console.log("No booking found for payment intent:", paymentIntent.id);
      return;
    }

    if (booking.payment_status === "paid") {
      console.log("✅ Booking already paid (idempotency):", booking.id);
      return;
    }

    if (["cancelled", "completed"].includes(booking.status)) {
      console.log(`ℹ️ Booking ${booking.id} is ${booking.status}; skipping success update`);
      return;
    }

    const nowIso = new Date().toISOString();
    const { data: updatedRows, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_status: "paid",
        payment_intent_id: paymentIntent.id,
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: nowIso,
      })
      .eq("id", booking.id)
      .neq("payment_status", "paid")
      .select("*");

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return;
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.log("✅ Booking already paid (idempotency):", booking.id);
      return;
    }

    console.log("✅ Booking confirmed via payment intent:", booking.id);
  } catch (error) {
    console.error("Error processing payment intent:", error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: any, supabase: any) {
  console.log("❌ Processing payment intent failed");

  try {
    // Find booking by payment intent ID
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .or(
        `stripe_payment_intent_id.eq.${paymentIntent.id},payment_intent_id.eq.${paymentIntent.id}`
      )
      .single();

    if (bookingError || !booking) {
      console.log("No booking found for payment intent:", paymentIntent.id);
      return;
    }

    if (booking.payment_status === "paid") {
      console.log("ℹ️ Booking already paid; skipping failure update:", booking.id);
      return;
    }

    if (["cancelled", "completed"].includes(booking.status)) {
      console.log(`ℹ️ Booking ${booking.id} is ${booking.status}; skipping failure update`);
      return;
    }

    // Update booking status to failed
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "pending",
        payment_status: "failed",
        payment_intent_id: paymentIntent.id,
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return;
    }

    console.log("❌ Booking marked as payment failed:", booking.id);
  } catch (error) {
    console.error("Error processing payment failure:", error);
  }
}

async function handleChargeRefunded(charge: any, supabase: any) {
  console.log("💰 Processing charge refunded");

  try {
    // Find booking by payment intent ID
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .or(
        `stripe_payment_intent_id.eq.${charge.payment_intent},payment_intent_id.eq.${charge.payment_intent}`
      )
      .single();

    if (bookingError || !booking) {
      console.log(
        "No booking found for refunded charge:",
        charge.payment_intent
      );
      return;
    }

    const refundedAmount = charge.amount_refunded || 0;
    const fullAmount = charge.amount || 0;
    const paymentStatus =
      refundedAmount > 0 && refundedAmount < fullAmount
        ? "partially_refunded"
        : "refunded";

    // Update booking refund fields (do not force booking status)
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_status: paymentStatus,
        refund_amount: refundedAmount / 100,
        refund_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return;
    }

    console.log("💰 Booking refund recorded:", booking.id);
  } catch (error) {
    console.error("Error processing refund:", error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: any, supabase: any) {
  console.log("📄 Processing invoice payment succeeded");
  // Handle subscription payments if needed
}

async function handleInvoicePaymentFailed(invoice: any, supabase: any) {
  console.log("❌ Processing invoice payment failed");
  // Handle subscription payment failures if needed
}

async function sendBookingConfirmationEmails(booking: any, supabase: any) {
  try {
    // Get guest and host details
    const { data: guest } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", booking.guest_id)
      .single();

    const { data: host } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", booking.host_id)
      .single();

    const { data: property } = await supabase
      .from("properties")
      .select("*")
      .eq("id", booking.property_id)
      .single();

    if (!guest || !host || !property) {
      console.error("Missing guest, host, or property data for emails");
      return;
    }

    // Send email to guest via Next API
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:3000";
    await fetch(`${appUrl}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "booking_confirmation",
        data: {
          bookingId: booking.id,
          guestName: `${guest.first_name} ${guest.last_name}`,
          guestEmail: guest.email,
          hostName: `${host.first_name} ${host.last_name}`,
          hostEmail: host.email,
          propertyTitle: property.title,
          propertyLocation: property.location,
          checkInDate: booking.check_in_date,
          checkOutDate: booking.check_out_date,
          guests: booking.guests_count,
          totalAmount: booking.total_amount,
        },
      }),
    });

    // Send email to host via Next API
    await fetch(`${appUrl}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "host_notification",
        data: {
          bookingId: booking.id,
          guestName: `${guest.first_name} ${guest.last_name}`,
          guestEmail: guest.email,
          hostName: `${host.first_name} ${host.last_name}`,
          hostEmail: host.email,
          propertyTitle: property.title,
          propertyLocation: property.location,
          checkInDate: booking.check_in_date,
          CheckOutDate: booking.check_out_date,
          guests: booking.guests_count,
          totalAmount: booking.total_amount,
          specialRequests: booking.special_requests,
        },
      }),
    });

    console.log("📧 Confirmation emails sent for booking:", booking.id);
  } catch (error) {
    console.error("Error sending confirmation emails:", error);
  }
}

async function sendCancellationEmails(
  booking: any,
  reason: string,
  supabase: any
) {
  try {
    // Get guest and host details
    const { data: guest } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", booking.guest_id)
      .single();

    const { data: host } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", booking.host_id)
      .single();

    const { data: property } = await supabase
      .from("properties")
      .select("*")
      .eq("id", booking.property_id)
      .single();

    if (!guest || !host || !property) {
      console.error(
        "Missing guest, host, or property data for cancellation emails"
      );
      return;
    }

    // Send cancellation email to guest via Next API
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:3000";
    await fetch(`${appUrl}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "booking_cancellation",
        data: {
          bookingId: booking.id,
          guestName: `${guest.first_name} ${guest.last_name}`,
          guestEmail: guest.email,
          hostName: `${host.first_name} ${host.last_name}`,
          hostEmail: host.email,
          propertyTitle: property.title,
          checkInDate: booking.check_in_date,
          checkOutDate: booking.check_out_date,
          guests: booking.guests_count,
          totalAmount: booking.total_amount,
          cancellationReason: reason,
        },
      }),
    });

    // Send cancellation email to host via Next API
    await fetch(`${appUrl}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "host_notification",
        data: {
          bookingId: booking.id,
          guestName: `${guest.first_name} ${guest.last_name}`,
          guestEmail: guest.email,
          hostName: `${host.first_name} ${host.last_name}`,
          hostEmail: host.email,
          propertyTitle: property.title,
          propertyLocation: property.location,
          checkInDate: booking.check_in_date,
          checkOutDate: booking.check_out_date,
          guests: booking.guests_count,
          totalAmount: booking.total_amount,
          specialRequests: `Cancellation reason: ${reason}`,
        },
      }),
    });

    console.log("📧 Cancellation emails sent for booking:", booking.id);
  } catch (error) {
    console.error("Error sending cancellation emails:", error);
  }
}
