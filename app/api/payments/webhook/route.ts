import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("❌ Missing Stripe signature");
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  console.log(`✅ Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 * This is the primary event for confirming bookings
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`💳 Processing checkout session: ${session.id}`);

  const bookingId = session.metadata?.booking_id;

  if (!bookingId) {
    console.error("❌ No booking_id in session metadata");
    return;
  }

  // Check if payment was successful
  if (session.payment_status !== "paid") {
    console.log(`⚠️ Payment not completed yet: ${session.payment_status}`);
    return;
  }

  // Update booking status to confirmed
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      stripe_payment_intent_id: session.payment_intent as string,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (updateError) {
    console.error("❌ Error updating booking:", updateError);
    throw updateError;
  }

  console.log(`✅ Booking ${bookingId} confirmed`);

  // Fetch booking details for email notifications
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select(`
      id,
      check_in_date,
      check_out_date,
      guests_count,
      total_amount,
      guest_name,
      guest_email,
      guest_phone,
      special_requests,
      property_id,
      host_id,
      properties!inner (
        title,
        address,
        city,
        state,
        host_id
      )
    `)
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("❌ Error fetching booking details:", fetchError);
    return;
  }

  const propertyInfo = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties;

  // Fetch host details
  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", booking.host_id)
    .single();

  // Send confirmation emails
  await sendBookingEmails(booking, propertyInfo, hostProfile);

  // Create in-app notification for host
  await createHostNotification(booking, propertyInfo);

  console.log(`✅ Booking ${bookingId} fully processed`);
}

/**
 * Handle successful payment intent
 * Backup handler in case checkout.session.completed is missed
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`💰 Payment intent succeeded: ${paymentIntent.id}`);

  // Find booking by payment intent ID
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .single();

  if (error || !booking) {
    console.log(`ℹ️ No booking found for payment intent ${paymentIntent.id}`);
    return;
  }

  // If already confirmed, skip
  if (booking.status === "confirmed") {
    console.log(`ℹ️ Booking ${booking.id} already confirmed`);
    return;
  }

  // Update to confirmed
  await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  console.log(`✅ Booking ${booking.id} confirmed via payment intent`);
}

/**
 * Handle failed payment
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`❌ Payment intent failed: ${paymentIntent.id}`);

  // Find booking by payment intent ID
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, host_id, guest_email, guest_name")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .single();

  if (!booking) {
    console.log(`ℹ️ No booking found for failed payment ${paymentIntent.id}`);
    return;
  }

  // Update booking status to failed
  await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  // Create notification for host
  await supabase.from("notifications").insert({
    user_id: booking.host_id,
    type: "booking_cancelled",
    title: "Booking Payment Failed",
    message: `Payment failed for booking by ${booking.guest_name}`,
    data: {
      booking_id: booking.id,
      reason: "payment_failed",
    },
    is_read: false,
    created_at: new Date().toISOString(),
  });

  console.log(`✅ Booking ${booking.id} marked as cancelled due to payment failure`);
}

/**
 * Handle charge refund
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`💸 Charge refunded: ${charge.id}`);

  const paymentIntentId = charge.payment_intent;

  if (!paymentIntentId) {
    console.log(`ℹ️ No payment intent for refunded charge ${charge.id}`);
    return;
  }

  // Find booking
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, host_id, guest_email, guest_name, property_id")
    .eq("stripe_payment_intent_id", paymentIntentId as string)
    .single();

  if (!booking) {
    console.log(`ℹ️ No booking found for refunded charge ${charge.id}`);
    return;
  }

  // Update booking status
  await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  // Create notification
  await supabase.from("notifications").insert({
    user_id: booking.host_id,
    type: "booking_cancelled",
    title: "Booking Refunded",
    message: `Booking by ${booking.guest_name} has been refunded`,
    data: {
      booking_id: booking.id,
      reason: "refund",
      amount: charge.amount_refunded / 100,
    },
    is_read: false,
    created_at: new Date().toISOString(),
  });

  console.log(`✅ Booking ${booking.id} refunded and cancelled`);
}

/**
 * Send booking confirmation emails to guest and host
 */
async function sendBookingEmails(
  booking: any,
  propertyInfo: any,
  hostProfile: any
) {
  try {
    // Import the unified email service
    const { unifiedEmailService } = await import("@/lib/unified-email-service");

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // Calculate Stripe fee (approximately 2.9% + $0.30)
    const stripeFee = Math.round(booking.total_amount * 0.029 + 0.30);
    const netAmount = booking.total_amount - stripeFee;

    // Send confirmation email to guest
    const guestResult = await unifiedEmailService.sendBookingConfirmation({
      bookingId: booking.id,
      guestName: booking.guest_name,
      guestEmail: booking.guest_email,
      hostName: hostProfile?.full_name || "Host",
      hostEmail: hostProfile?.email || "",
      propertyTitle: propertyInfo?.title || "Property",
      propertyLocation: propertyInfo?.address || propertyInfo?.city || "",
      propertyAddress: `${propertyInfo?.address || ""}, ${propertyInfo?.city || ""}, ${propertyInfo?.state || ""}`.trim(),
      checkInDate: formatDate(booking.check_in_date),
      checkOutDate: formatDate(booking.check_out_date),
      guests: booking.guests_count,
      totalAmount: booking.total_amount,
    });

    if (guestResult.success) {
      console.log("✅ Guest confirmation email sent");
    } else {
      console.error("❌ Failed to send guest email:", guestResult.error);
    }

    // Send notification email to host
    if (hostProfile?.email) {
      const hostResult = await unifiedEmailService.sendHostNotification({
        bookingId: booking.id,
        guestName: booking.guest_name,
        guestEmail: booking.guest_email,
        guestPhone: booking.guest_phone,
        hostName: hostProfile.full_name || "Host",
        hostEmail: hostProfile.email,
        propertyTitle: propertyInfo?.title || "Property",
        propertyLocation: propertyInfo?.address || "",
        checkInDate: formatDate(booking.check_in_date),
        checkOutDate: formatDate(booking.check_out_date),
        guests: booking.guests_count,
        totalAmount: booking.total_amount,
        stripeFee,
        netAmount,
        specialRequests: booking.special_requests || "",
      });

      if (hostResult.success) {
        console.log("✅ Host notification email sent");
      } else {
        console.error("❌ Failed to send host email:", hostResult.error);
      }
    }

    // Send payment receipt to guest
    const receiptResult = await unifiedEmailService.sendPaymentReceipt({
      guestName: booking.guest_name,
      guestEmail: booking.guest_email,
      propertyName: propertyInfo?.title || "Property",
      transactionId: booking.stripe_payment_intent_id || booking.id,
      paymentDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      paymentTime: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      paymentMethod: "Credit Card",
      accommodationAmount: booking.total_amount,
      cleaningFee: 0,
      serviceFee: 0,
      paymentProcessingFee: 0,
      totalAmount: booking.total_amount,
      bookingId: booking.id,
    });

    if (receiptResult.success) {
      console.log("✅ Payment receipt email sent");
    } else {
      console.error("❌ Failed to send payment receipt:", receiptResult.error);
    }

    console.log("✅ All booking confirmation emails processed");
  } catch (emailError) {
    console.error("❌ Failed to send emails:", emailError);
    // Don't throw - email failure shouldn't fail webhook
  }
}

/**
 * Create in-app notification for host
 */
async function createHostNotification(booking: any, propertyInfo: any) {
  try {
    await supabase.from("notifications").insert({
      user_id: booking.host_id,
      type: "booking_confirmed",
      title: "Booking Confirmed! 💳",
      message: `Payment received for ${propertyInfo?.title}`,
      data: {
        booking_id: booking.id,
        property_id: booking.property_id,
        property_title: propertyInfo?.title,
        guest_name: booking.guest_name,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        total_amount: booking.total_amount,
      },
      is_read: false,
      created_at: new Date().toISOString(),
    });

    console.log("✅ Host notification created");
  } catch (notificationError) {
    console.error("❌ Failed to create notification:", notificationError);
    // Don't throw - notification failure shouldn't fail webhook
  }
}
