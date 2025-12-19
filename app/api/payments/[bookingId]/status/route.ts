import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/payments/[bookingId]/status
 * Get comprehensive payment status and transaction history for a booking
 *
 * WEEK 2: Payment Status Endpoint
 * - Returns current payment status
 * - Transaction history
 * - Refund information
 * - Retry eligibility
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const resolvedParams = await params;
    const bookingId = resolvedParams.bookingId;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Fetch booking with payment details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        status,
        payment_status,
        payment_intent_id,
        stripe_session_id,
        payment_method,
        total_amount,
        currency,
        refund_amount,
        refund_date,
        refund_reason,
        check_in_date,
        check_out_date,
        created_at,
        updated_at,
        properties!inner (
          title,
          is_active
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Fetch all payment transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
    }

    // Fetch webhook events related to this booking
    const { data: webhookEvents } = await supabase
      .from("stripe_webhook_events")
      .select("event_id, event_type, processed, created_at, processed_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Calculate summary
    const totalPaid = transactions
      ?.filter((t) => t.transaction_type === "charge" && t.status === "succeeded")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    const totalRefunded = transactions
      ?.filter((t) => t.transaction_type === "refund" && t.status === "succeeded")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    const failedAttempts = transactions
      ?.filter((t) => t.status === "failed")
      .length || 0;

    const pendingTransactions = transactions
      ?.filter((t) => t.status === "pending")
      .length || 0;

    // Determine if retry is possible
    const property = Array.isArray(booking.properties)
      ? booking.properties[0]
      : booking.properties;

    const canRetry =
      booking.payment_status !== "paid" &&
      booking.status !== "cancelled" &&
      property?.is_active &&
      new Date(booking.check_in_date) > new Date();

    // Determine next action
    let nextAction = null;
    if (booking.payment_status === "pending") {
      nextAction = {
        action: "complete_payment",
        message: "Payment is pending. Please complete your payment.",
        url: `/booking/${bookingId}/payment`,
      };
    } else if (canRetry && failedAttempts > 0) {
      nextAction = {
        action: "retry_payment",
        message: "Previous payment failed. You can retry the payment.",
        url: `/api/payments/retry`,
      };
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        status: booking.status,
        paymentStatus: booking.payment_status,
        paymentIntentId: booking.payment_intent_id,
        sessionId: booking.stripe_session_id,
        paymentMethod: booking.payment_method,
        totalAmount: booking.total_amount,
        currency: booking.currency || "CAD",
        propertyTitle: property?.title,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
      },
      refund: booking.refund_amount
        ? {
            amount: booking.refund_amount,
            date: booking.refund_date,
            reason: booking.refund_reason,
            status: booking.payment_status,
          }
        : null,
      summary: {
        totalPaid: totalPaid,
        totalRefunded: totalRefunded,
        netAmount: totalPaid - totalRefunded,
        failedAttempts: failedAttempts,
        pendingTransactions: pendingTransactions,
        canRetry: canRetry,
      },
      transactions: transactions?.map((t) => ({
        id: t.id,
        type: t.transaction_type,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        paymentIntentId: t.stripe_payment_intent_id,
        chargeId: t.stripe_charge_id,
        refundId: t.stripe_refund_id,
        paymentMethodType: t.payment_method_type,
        failureReason: t.failure_reason,
        failureCode: t.failure_code,
        createdAt: t.created_at,
        completedAt: t.completed_at,
        metadata: t.metadata,
      })) || [],
      webhookEvents: webhookEvents?.map((e) => ({
        eventId: e.event_id,
        eventType: e.event_type,
        processed: e.processed,
        createdAt: e.created_at,
        processedAt: e.processed_at,
      })) || [],
      nextAction: nextAction,
    });
  } catch (error: any) {
    console.error("Error fetching payment status:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch payment status",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
