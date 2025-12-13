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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST /api/payments/verify-payment
 * Verifies payment status and returns booking details
 *
 * This is called after user returns from Stripe Checkout to confirm payment
 */
export async function POST(request: NextRequest) {
  console.log("🚀 Payment verification API called - START");
  
  try {
    const body = await request.json();
    console.log("📝 Request body:", body);
    const { sessionId } = body;

    if (!sessionId) {
      console.log("❌ No session ID provided");
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Verifying session:", sessionId);

    // Retrieve session from Stripe with expanded data
    let session;
    try {
      console.log("📞 Calling Stripe to retrieve session...");
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent.latest_charge", "line_items"],
      });
      console.log("✅ Stripe session retrieved successfully:", {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        payment_intent: session.payment_intent ? 'present' : 'missing'
      });
    } catch (stripeError) {
      console.error("❌ Stripe API error:", stripeError);
      return NextResponse.json(
        { 
          error: "Failed to retrieve payment session", 
          details: stripeError instanceof Error ? stripeError.message : "Unknown Stripe error"
        },
        { status: 500 }
      );
    }

    let paymentIntent: Stripe.PaymentIntent | null = null;
    if (session.payment_intent) {
      if (typeof session.payment_intent === "string") {
        paymentIntent = await stripe.paymentIntents.retrieve(
          session.payment_intent,
          {
            expand: ["latest_charge"],
          }
        );
      } else {
        paymentIntent = session.payment_intent as Stripe.PaymentIntent;
      }
    }

    let paymentIntentStatus = paymentIntent?.status;
    let paymentCompleted =
      session.payment_status === "paid" ||
      session.status === "complete" ||
      paymentIntentStatus === "succeeded";
      
    console.log("💳 Initial payment status check:", {
      sessionPaymentStatus: session.payment_status,
      sessionStatus: session.status,
      paymentIntentStatus,
      paymentCompleted
    });

    let retryAttempts = 0;
    const MAX_RETRIES = 5;

    while (
      !paymentCompleted &&
      retryAttempts < MAX_RETRIES &&
      ((paymentIntentStatus &&
        ["processing", "requires_capture"].includes(paymentIntentStatus)) ||
        session.status === "open")
    ) {
      await delay(2000);
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent.latest_charge", "line_items"],
      });

      if (session.payment_intent) {
        if (typeof session.payment_intent === "string") {
          paymentIntent = await stripe.paymentIntents.retrieve(
            session.payment_intent,
            {
              expand: ["latest_charge"],
            }
          );
        } else {
          paymentIntent = session.payment_intent as Stripe.PaymentIntent;
        }
      }

      paymentIntentStatus = paymentIntent?.status;
      paymentCompleted =
        session.payment_status === "paid" ||
        session.status === "complete" ||
        paymentIntentStatus === "succeeded";

      retryAttempts += 1;
    }

    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      return NextResponse.json(
        {
          error: "Invalid session",
          message: "No booking ID found in session metadata",
        },
        { status: 400 }
      );
    }

    // Get booking details first
    const { data: booking, error: bookingFetchError } = await supabase
      .from("bookings")
      .select(`
        id,
        status,
        payment_status,
        payment_method,
        check_in_date,
        check_out_date,
        guests_count,
        total_amount,
        currency,
        guest_name,
        guest_email,
        property_id,
        host_id
      `)
      .eq("id", bookingId)
      .single();

    if (bookingFetchError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if booking is already marked as paid in database
    if (!paymentCompleted && booking.payment_status === "paid") {
      console.log("✅ Booking already marked as paid in database, treating as successful");
      paymentCompleted = true;
      paymentIntentStatus = paymentIntentStatus || "succeeded";
    }

    // Additional check: if session payment_status is paid, treat as completed
    if (!paymentCompleted && session.payment_status === "paid") {
      console.log("✅ Stripe session shows payment_status as paid, treating as successful");
      paymentCompleted = true;
      paymentIntentStatus = paymentIntentStatus || "succeeded";
    }

    // Final check: if Stripe shows complete/paid but we haven't detected it yet
    if (!paymentCompleted && 
        (session.status === "complete" || session.payment_status === "paid") && 
        paymentIntentStatus === "succeeded") {
      console.log("✅ All Stripe indicators show payment succeeded, forcing completion");
      paymentCompleted = true;
    }

    if (paymentCompleted) {
      // Only update if not already paid (prevent duplicate processing)
      if (booking.payment_status !== "paid") {
        const { error: updateError } = await supabase
          .from("bookings")
          .update({
            status: "confirmed",
            payment_status: "paid",
            payment_intent_id: (typeof session.payment_intent === "string"
              ? session.payment_intent
              : paymentIntent?.id) as string,
            stripe_session_id: session.id,
            payment_method: session.payment_method_types?.[0] || "card",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);

        if (updateError) {
          console.error("Error updating booking status:", updateError);
        } else {
          console.log(`✅ Booking ${bookingId} marked as paid`);

          // Update payment transaction
          await supabase
            .from("payment_transactions")
            .update({
              status:
                paymentIntentStatus === "succeeded" || session.payment_status === "paid"
                  ? "succeeded"
                  : "pending",
              stripe_payment_intent_id:
                (typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : paymentIntent?.id) || null,
              completed_at:
                paymentIntentStatus === "succeeded" || session.payment_status === "paid"
                  ? new Date().toISOString()
                  : null,
              updated_at: new Date().toISOString(),
            })
            .eq("booking_id", bookingId)
            .eq("stripe_session_id", session.id);
        }
      } else {
        console.log(`Booking ${bookingId} already marked as paid (idempotency)`);
      }

      // Fetch detailed booking info for response
      const { data: bookingDetails, error: fetchError } = await supabase
        .from("bookings")
        .select(`
          id,
          status,
          check_in_date,
          check_out_date,
          guests_count,
          total_amount,
          currency,
          guest_name,
          guest_email,
          guest_phone,
          special_requests,
          property_id,
          host_id,
          payment_status,
          payment_method,
          properties!inner (
            id,
            title,
            address,
            city,
            state,
            images,
            host_id
          )
        `)
        .eq("id", bookingId)
        .single();

      if (!fetchError && bookingDetails) {
        const propertyInfo = Array.isArray(bookingDetails.properties)
          ? bookingDetails.properties[0]
          : bookingDetails.properties;

        const propertyImage = propertyInfo?.images?.[0] || null;
        const currency = (bookingDetails.currency || session.currency || "USD").toUpperCase();

        // Get charge details from latest_charge (Stripe API v2023+)
        const latestCharge =
          paymentIntent?.latest_charge && typeof paymentIntent.latest_charge !== "string"
          ? (paymentIntent.latest_charge as Stripe.Charge)
          : null;
        const paymentMethodDetails = latestCharge?.payment_method_details;
        const cardDetails = paymentMethodDetails?.card;

        const paymentStatus =
          bookingDetails.payment_status || booking.payment_status || session.payment_status;

        const paymentMethod =
          bookingDetails.payment_method ||
          booking.payment_method ||
          paymentMethodDetails?.type ||
          session.payment_method_types?.[0] ||
          "card";

        // Fetch host details
        const { data: hostProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, user_id")
          .eq("id", bookingDetails.host_id)
          .single();

        const hostFullName = hostProfile
          ? `${hostProfile.first_name || ""} ${hostProfile.last_name || ""}`.trim()
          : "Host";

        // Get host email from auth.users
        let hostEmail = "";
        if (hostProfile?.user_id) {
          const { data: authUser } = await supabase.auth.admin.getUserById(hostProfile.user_id);
          hostEmail = authUser?.user?.email || "";
        }

        // Send confirmation email notifications asynchronously
        try {
          // Only send notifications if this is the first time marking as paid
          if (booking.payment_status !== "paid") {
            // Send email to guest
            const { unifiedEmailService } = await import("@/lib/unified-email-service");
            await unifiedEmailService.sendBookingConfirmation({
              bookingId: bookingDetails.id,
              guestName: bookingDetails.guest_name,
              guestEmail: bookingDetails.guest_email,
              hostName: hostFullName,
              hostEmail,
              propertyTitle: propertyInfo?.title || "Property",
              propertyLocation: propertyInfo?.address || "",
              checkInDate: bookingDetails.check_in_date,
              checkOutDate: bookingDetails.check_out_date,
              guests: bookingDetails.guests_count,
              totalAmount: bookingDetails.total_amount,
            });

            // Send email to host
            if (hostEmail) {
              await unifiedEmailService.sendHostNotification({
                bookingId: bookingDetails.id,
                guestName: bookingDetails.guest_name,
                guestEmail: bookingDetails.guest_email,
                hostName: hostFullName,
                hostEmail,
                propertyTitle: propertyInfo?.title || "Property",
                propertyLocation: propertyInfo?.address || "",
                checkInDate: bookingDetails.check_in_date,
                checkOutDate: bookingDetails.check_out_date,
                guests: bookingDetails.guests_count,
                totalAmount: bookingDetails.total_amount,
                specialRequests: bookingDetails.special_requests || "",
              });
            }

            // Create notification
            await supabase.from("notifications").insert({
              user_id: bookingDetails.host_id,
              type: "booking_confirmed",
              title: "Booking Confirmed! 💳",
              message: `Payment received for ${propertyInfo?.title}`,
              data: {
                booking_id: bookingDetails.id,
                property_id: bookingDetails.property_id,
                property_title: propertyInfo?.title,
                guest_name: bookingDetails.guest_name,
                check_in_date: bookingDetails.check_in_date,
                check_out_date: bookingDetails.check_out_date,
                total_amount: bookingDetails.total_amount,
              },
              is_read: false,
              created_at: new Date().toISOString(),
            });

            console.log("✅ Email notifications sent successfully");
          }
        } catch (emailError) {
          console.error("❌ Failed to send email notifications:", emailError);
          // Don't fail the payment verification if email fails
        }

        const successResponse = {
          success: true,
          sessionId: session.id,
          paymentStatus,
          booking: {
            id: bookingDetails.id,
            reference: bookingDetails.id,
            status: bookingDetails.status,
            checkInDate: bookingDetails.check_in_date,
            checkOutDate: bookingDetails.check_out_date,
            guestsCount: bookingDetails.guests_count,
            totalAmount: bookingDetails.total_amount,
            currency,
            property: {
              id: propertyInfo?.id,
              title: propertyInfo?.title || "Property",
              address: propertyInfo?.address || "",
              city: propertyInfo?.city || "",
              state: propertyInfo?.state || "",
              image: propertyImage,
            },
            payment: {
              status: paymentStatus,
              method: paymentMethod,
              brand: cardDetails?.brand,
              last4: cardDetails?.last4,
              receiptUrl: latestCharge?.receipt_url,
              paymentIntentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : paymentIntent?.id,
            },
            guest: {
              name: bookingDetails.guest_name,
              email: bookingDetails.guest_email,
            },
            host: hostFullName || hostEmail
              ? {
                  name: hostFullName,
                  email: hostEmail,
                }
              : null,
          },
        };
        
        console.log("✅ Returning success response:", successResponse);
        return NextResponse.json(successResponse);
      }
    }

    if (
      paymentIntentStatus === "requires_payment_method" ||
      paymentIntentStatus === "canceled"
    ) {
      // Mark booking as failed if Stripe indicates failure
      if (booking.payment_status !== "failed") {
        await supabase
          .from("bookings")
          .update({
            payment_status: "failed",
            status: booking.status === "confirmed" ? booking.status : "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);
      }

      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
          failure_reason: paymentIntent?.last_payment_error?.message || "payment_failed",
        })
        .eq("booking_id", bookingId)
        .eq("stripe_session_id", session.id);

      return NextResponse.json({
        success: false,
        sessionId: session.id,
        paymentStatus: paymentIntentStatus || session.payment_status,
        message: "Payment failed. Please try a different payment method or contact support.",
      });
    }

    // Log debug info for troubleshooting
    console.log("🔍 Payment verification debug:", {
      sessionId: session.id,
      sessionStatus: session.status,
      sessionPaymentStatus: session.payment_status,
      paymentIntentStatus,
      paymentCompleted,
      bookingPaymentStatus: booking.payment_status,
      retryAttempts,
      paymentIntentId: paymentIntent?.id,
      latestChargeStatus: paymentIntent?.latest_charge ? 
        (typeof paymentIntent.latest_charge === 'string' ? 
          paymentIntent.latest_charge : 
          paymentIntent.latest_charge.status) : 'no_charge'
    });

    // Payment not yet completed but not failed – likely processing
    return NextResponse.json({
      success: false,
      sessionId: session.id,
      paymentStatus: paymentIntentStatus || session.payment_status,
      message: "Payment is still processing. Please wait a few seconds and refresh.",
      processing: true,
      amountTotal: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency,
      debug: {
        sessionStatus: session.status,
        sessionPaymentStatus: session.payment_status,
        paymentIntentStatus,
        bookingPaymentStatus: booking.payment_status,
        retryAttempts
      }
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);

    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: "Invalid session ID", message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to verify payment", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}