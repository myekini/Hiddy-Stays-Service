import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { authenticateUser, createAuthResponse } from "@/lib/auth-middleware";
import { buildAppUrl } from "@/lib/app-url";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return createAuthResponse("Unauthorized");
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("booking_id");

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `id, status, total_amount, check_in_date, guest_id, host_id, stripe_payment_intent_id, payment_intent_id`
      )
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.guest_id !== user.profile_id && booking.host_id !== user.profile_id) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have permission to view this booking" },
        { status: 403 }
      );
    }

    const checkInDate = new Date(booking.check_in_date);
    const now = new Date();
    const hoursUntilCheckIn =
      (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const daysUntilCheckIn = Math.ceil(hoursUntilCheckIn / 24);

    const isActiveStatus = ["pending", "confirmed"].includes(booking.status);
    const meetsTiming = hoursUntilCheckIn >= 24;
    const canCancel = isActiveStatus && meetsTiming;

    let refundEligible = false;
    let refundAmount = 0;
    let refundPercentage = 0;

    if (daysUntilCheckIn > 7) {
      refundEligible = true;
      refundAmount = booking.total_amount;
      refundPercentage = 100;
    } else if (daysUntilCheckIn >= 3) {
      refundEligible = true;
      refundAmount = booking.total_amount * 0.5;
      refundPercentage = 50;
    }

    let reason = "You can cancel up to 24 hours before check-in.";

    if (!isActiveStatus) {
      reason =
        booking.status === "cancelled"
          ? "This booking has already been cancelled."
          : "Completed bookings cannot be cancelled.";
    } else if (!meetsTiming) {
      reason = "Cancellations must be made at least 24 hours before check-in.";
    }

    const policy = {
      can_cancel: canCancel,
      eligible_for_refund: refundEligible && canCancel,
      refund_amount: refundEligible && canCancel ? refundAmount : 0,
      refund_percentage: refundEligible && canCancel ? refundPercentage : 0,
      processing_time: refundEligible && canCancel ? "3-5 business days" : null,
      hours_until_checkin: Math.max(0, Math.round(hoursUntilCheckIn)),
      status: booking.status,
      reason,
    };

    return NextResponse.json({
      success: true,
      cancellation_policy: policy,
    });
  } catch (error) {
    console.error("Error fetching cancellation policy:", error);
    return NextResponse.json(
      { error: "Failed to load cancellation policy" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return createAuthResponse("Unauthorized");
    }

    body = await request.json();
    const { bookingId, reason, refund = false } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    console.log(`Cancelling booking ${bookingId}`);

    // Fetch booking details
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        id,
        status,
        guest_id,
        host_id,
        payment_status,
        stripe_payment_intent_id,
        payment_intent_id,
        total_amount,
        guest_name,
        guest_email,
        host_id,
        property_id,
        check_in_date,
        check_out_date,
        properties!inner (
          title,
          host_id
        )
      `)
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.guest_id !== user.profile_id && booking.host_id !== user.profile_id) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have permission to cancel this booking" },
        { status: 403 }
      );
    }

    // Check if booking can be cancelled
    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Booking is already cancelled" },
        { status: 400 }
      );
    }

    if (booking.status === "completed") {
      return NextResponse.json(
        { error: "Completed bookings cannot be cancelled" },
        { status: 400 }
      );
    }

    // Calculate refund eligibility based on cancellation policy
    const checkInDate = new Date(booking.check_in_date);
    const today = new Date();
    const hoursUntilCheckIn =
      (checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60);
    const daysUntilCheckIn = Math.ceil(
      (checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    let refundEligible = false;
    let refundAmount = 0;
    let refundPercentage = 0;

    // Cancellation policy:
    // - More than 7 days: Full refund
    // - 3-7 days: 50% refund
    // - Less than 3 days: No refund
    if (daysUntilCheckIn > 7) {
      refundEligible = true;
      refundPercentage = 100;
      refundAmount = booking.total_amount;
    } else if (daysUntilCheckIn >= 3) {
      refundEligible = true;
      refundPercentage = 50;
      refundAmount = booking.total_amount * 0.5;
    }

    const meetsTiming = hoursUntilCheckIn >= 24;
    if (!meetsTiming && booking.status === "confirmed") {
      return NextResponse.json(
        { error: "Cancellations must be made at least 24 hours before check-in." },
        { status: 400 }
      );
    }

    // Process refund if requested and eligible
    let stripeRefundId = null;
    const paymentIntentId = booking.stripe_payment_intent_id || booking.payment_intent_id;
    const alreadyRefunded = ["refunded", "partially_refunded"].includes(
      booking.payment_status
    );
    const shouldRefund =
      Boolean(paymentIntentId) &&
      refundEligible &&
      !alreadyRefunded &&
      (refund === true || booking.payment_status === "paid");

    if (shouldRefund) {
      try {
        const refundResponse = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: "requested_by_customer",
          metadata: {
            booking_id: bookingId,
            cancellation_reason: reason || "User requested cancellation",
          },
        });

        stripeRefundId = refundResponse.id;
        console.log(`✅ Refund created: ${stripeRefundId} for $${refundAmount}`);
      } catch (stripeError: any) {
        console.error("❌ Stripe refund failed:", stripeError);
        return NextResponse.json(
          {
            error: "Failed to process refund",
            details: stripeError.message,
          },
          { status: 500 }
        );
      }
    }

    const nowIso = new Date().toISOString();
    const nextPaymentStatus = stripeRefundId
      ? refundPercentage === 100
        ? "refunded"
        : "partially_refunded"
      : undefined;

    const updatePayload: Record<string, any> = {
      status: "cancelled",
      updated_at: nowIso,
    };

    if (stripeRefundId) {
      updatePayload.refund_amount = refundAmount;
      updatePayload.refund_date = nowIso;
      updatePayload.refund_reason = reason || "User requested cancellation";
      updatePayload.payment_status = nextPaymentStatus;
    }

    // Try including cancelled_at, but fall back if column isn't present
    let updateError: any = null;
    {
      const { error } = await supabase
        .from("bookings")
        .update({
          ...updatePayload,
          cancelled_at: nowIso,
        })
        .eq("id", bookingId);
      updateError = error;
    }

    if (updateError) {
      const { error: fallbackError } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("id", bookingId);
      updateError = fallbackError;
    }

    if (updateError) {
      console.error("❌ Error updating booking:", updateError);
      throw updateError;
    }

    console.log(`✅ Booking ${bookingId} cancelled`);

    // Get property info for notifications and emails
    const propertyInfo = Array.isArray(booking.properties)
      ? booking.properties[0]
      : booking.properties;

    // Create notification for host about cancellation
    try {
      await supabase.from("notifications").insert({
        user_id: booking.host_id,
        type: "booking_cancelled",
        title: "Booking Cancelled",
        message: `${booking.guest_name} cancelled their booking for ${propertyInfo?.title}`,
        data: {
          booking_id: bookingId,
          property_id: booking.property_id,
          property_title: propertyInfo?.title,
          guest_name: booking.guest_name,
          check_in_date: booking.check_in_date,
          check_out_date: booking.check_out_date,
          cancellation_reason: reason || "Not specified",
          refund_amount: refundAmount,
          refund_percentage: refundPercentage,
        },
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch (notificationError) {
      console.error("❌ Failed to create host notification:", notificationError);
      // Don't fail cancellation if notification fails
    }


    // Send cancellation email via unified email service
    try {
      const { unifiedEmailService } = await import("@/lib/unified-email-service");

      const hostProfile = await supabase
        .from("profiles")
        .select("first_name, last_name, user_id")
        .eq("id", booking.host_id)
        .single();

      let hostEmail = "";
      if (hostProfile.data?.user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(
          hostProfile.data.user_id
        );
        hostEmail = authUser?.user?.email || "";
      }

      // Notify guest with booking cancellation
      await unifiedEmailService.sendBookingCancellation({
        guestName: booking.guest_name,
        guestEmail: booking.guest_email,
        hostName: hostProfile.data?.first_name || "Host",
        hostEmail,
        propertyTitle: propertyInfo?.title || "Property",
        propertyLocation: "",
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        guests: 1,
        totalAmount: booking.total_amount,
        bookingId,
        cancellationReason: reason || "Guest requested cancellation",
        refundAmount,
      });

      // Notify host if email available
      if (hostEmail) {
        await unifiedEmailService.sendNotification({
          to: hostEmail,
          subject: `Booking cancelled - ${propertyInfo?.title || "Property"}`,
          message: `${booking.guest_name} cancelled their booking for ${propertyInfo?.title || "your property"}.\n\nCheck-in: ${booking.check_in_date}\nCheck-out: ${booking.check_out_date}\n\nReason: ${reason || "Not specified"}`,
          actionUrl: buildAppUrl(`/bookings/${bookingId}`),
          actionText: "View booking",
        });
      }
    } catch (emailError) {
      console.error("❌ Failed to send cancellation emails:", emailError);
      // Don't fail cancellation if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully",
      refund: {
        eligible: refundEligible,
        amount: refundAmount,
        percentage: refundPercentage,
        processed: Boolean(stripeRefundId),
        stripe_refund_id: stripeRefundId,
        processing_time: refundEligible ? "3-5 business days" : null,
      },
    });
  } catch (error) {
    console.error("❌ Error cancelling booking:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      bookingId: body?.bookingId || "unknown"
    });
    
    return NextResponse.json(
      { 
        error: "Failed to cancel booking", 
        details: error instanceof Error ? error.message : "Unknown error occurred",
        debug: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
