import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import Stripe from "stripe";
import { unifiedEmailService } from "@/lib/unified-email-service";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(key, {
    apiVersion: "2023-10-16",
  });
}

// Helper function to verify admin
async function verifyAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return { isAdmin: false, error: "Service temporarily unavailable" };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return { isAdmin: false, error: "No authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return { isAdmin: false, error: "Invalid token" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return { isAdmin: false, error: "Admin access required" };
  }

  return { isAdmin: true, userId: user.id };
}

/**
 * GET /api/admin/bookings
 * Get all bookings with filters
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: auth.error },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const propertyId = searchParams.get("property_id");
    const guestId = searchParams.get("guest_id");
    const hostId = searchParams.get("host_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("bookings")
      .select(
        `
        *,
        property:properties(
          id,
          title,
          address,
          city
        ),
        guest:profiles!bookings_guest_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        host:profiles!bookings_host_id_fkey(
          id,
          user_id,
          first_name,
          last_name,
          email
        )
      `,
        { count: "exact" }
      );

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (propertyId) {
      query = query.eq("property_id", propertyId);
    }

    if (guestId) {
      query = query.eq("guest_id", guestId);
    }

    if (hostId) {
      query = query.eq("host_id", hostId);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order("created_at", {
      ascending: false,
    });

    const { data: bookings, error, count } = await query;

    if (error) {
      console.error("Error fetching bookings:", error);
      return NextResponse.json(
        { error: "Failed to fetch bookings", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bookings,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0),
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: auth.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { bookingId, action, reason, refundAmount } = body as {
      bookingId?: string;
      action?: string;
      reason?: string;
      refundAmount?: number;
    };

    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    if (!action || typeof action !== "string") {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id,status,payment_status,payment_method,total_amount,currency,guests_count,guest_id,host_id,property_id,check_in_date,check_out_date,guest_name,guest_email,stripe_payment_intent_id,payment_intent_id"
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();

    if (action === "mark_paid") {
      if (booking.status === "cancelled") {
        return NextResponse.json(
          { error: "Cancelled bookings cannot be marked as paid" },
          { status: 400 }
        );
      }

      if (String(booking.payment_status) === "paid") {
        return NextResponse.json({
          success: true,
          message: "Booking already marked as paid",
          payment_status: booking.payment_status,
          status: booking.status,
        });
      }

      // Update booking payment + status
      const { error: markPaidError } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed",
          updated_at: nowIso,
        })
        .eq("id", bookingId);

      if (markPaidError) {
        console.error("Error marking booking as paid (admin):", markPaidError);
        return NextResponse.json(
          { error: "Failed to mark booking as paid", details: markPaidError.message },
          { status: 500 }
        );
      }

      // Log payment transaction (best-effort)
      try {
        await supabase.from("payment_transactions").insert({
          booking_id: bookingId,
          transaction_type: "bank_transfer",
          amount: booking.total_amount,
          currency: booking.currency || "CAD",
          status: "succeeded",
          payment_method_type: "bank_transfer",
          completed_at: nowIso,
          metadata: {
            approved_by: auth.userId,
            approved_at: nowIso,
            approval_reason: reason || "Marked as paid by admin",
          },
        });
      } catch (transactionError) {
        console.warn("Unable to log bank transfer approval transaction", transactionError);
      }

      // Create notifications (best-effort)
      try {
        await supabase.from("notifications").insert({
          user_id: booking.guest_id,
          type: "payment_confirmed",
          title: "Payment Confirmed",
          message: "Your payment has been verified and your booking is confirmed.",
          data: {
            booking_id: bookingId,
            property_id: booking.property_id,
            payment_method: booking.payment_method || "bank_transfer",
          },
          is_read: false,
          created_at: nowIso,
        });
      } catch (notificationError) {
        console.error("Failed to create guest notification (mark paid):", notificationError);
      }

      try {
        await supabase.from("notifications").insert({
          user_id: booking.host_id,
          type: "payment_confirmed",
          title: "Booking Confirmed",
          message: "A booking payment has been verified and the booking is confirmed.",
          data: {
            booking_id: bookingId,
            property_id: booking.property_id,
            payment_method: booking.payment_method || "bank_transfer",
          },
          is_read: false,
          created_at: nowIso,
        });
      } catch (notificationError) {
        console.error("Failed to create host notification (mark paid):", notificationError);
      }

      // Send confirmation emails (best-effort)
      try {
        const { data: bookingEmailData } = await supabase
          .from("bookings")
          .select(
            `
              id,
              guest_name,
              guest_email,
              guests_count,
              total_amount,
              check_in_date,
              check_out_date,
              special_requests,
              properties (
                title,
                address,
                city
              ),
              host:profiles!bookings_host_id_fkey (
                first_name,
                last_name,
                email
              )
            `
          )
          .eq("id", bookingId)
          .single();

        const property = Array.isArray((bookingEmailData as any)?.properties)
          ? (bookingEmailData as any).properties[0]
          : (bookingEmailData as any)?.properties;

        const hostProfile = Array.isArray((bookingEmailData as any)?.host)
          ? (bookingEmailData as any).host[0]
          : (bookingEmailData as any)?.host;

        const guestName = (bookingEmailData as any)?.guest_name || booking.guest_name || "Guest";
        const guestEmail = (bookingEmailData as any)?.guest_email || booking.guest_email;
        const hostName = `${hostProfile?.first_name || ""} ${hostProfile?.last_name || ""}`.trim() || "Host";
        const hostEmail = hostProfile?.email || "admin@hiddystays.com";
        const propertyTitle = property?.title || "Your stay";
        const propertyLocation = `${property?.city || ""}`.trim() || `${property?.address || ""}`.trim();

        if (guestEmail) {
          await unifiedEmailService.sendBookingConfirmation({
            bookingId,
            guestName,
            guestEmail,
            hostName,
            hostEmail,
            propertyTitle,
            propertyLocation,
            propertyAddress: property?.address,
            checkInDate: String((bookingEmailData as any)?.check_in_date || booking.check_in_date),
            checkOutDate: String((bookingEmailData as any)?.check_out_date || booking.check_out_date),
            guests: Number((bookingEmailData as any)?.guests_count || booking.guests_count || 1),
            totalAmount: Number((bookingEmailData as any)?.total_amount || booking.total_amount || 0),
            specialRequests: (bookingEmailData as any)?.special_requests,
          } as any);
        }

        if (hostEmail) {
          await unifiedEmailService.sendHostNotification({
            bookingId,
            guestName,
            guestEmail: guestEmail || "",
            hostName,
            hostEmail,
            propertyTitle,
            propertyLocation,
            checkInDate: String((bookingEmailData as any)?.check_in_date || booking.check_in_date),
            checkOutDate: String((bookingEmailData as any)?.check_out_date || booking.check_out_date),
            guests: Number((bookingEmailData as any)?.guests_count || booking.guests_count || 1),
            totalAmount: Number((bookingEmailData as any)?.total_amount || booking.total_amount || 0),
            specialRequests: (bookingEmailData as any)?.special_requests,
          } as any);
        }
      } catch (emailError) {
        console.error("Failed to send booking confirmation emails (mark paid):", emailError);
      }

      return NextResponse.json({
        success: true,
        message: "Payment marked as paid and booking confirmed",
        payment_status: "paid",
        status: "confirmed",
      });
    }

    if (action === "cancel") {
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

      let updateError: unknown = null;

      {
        const { error } = await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            cancellation_reason: reason || "Cancelled by admin",
            cancelled_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", bookingId);
        updateError = error;
      }

      if (updateError) {
        const { error: fallbackError } = await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            updated_at: nowIso,
          })
          .eq("id", bookingId);
        updateError = fallbackError;
      }

      if (updateError) {
        console.error("Error cancelling booking (admin):", updateError);
        return NextResponse.json(
          {
            error: "Failed to cancel booking",
            details:
              updateError && typeof updateError === "object" && "message" in updateError
                ? String((updateError as { message?: unknown }).message)
                : "Unknown error",
          },
          { status: 500 }
        );
      }

      try {
        await supabase.from("notifications").insert({
          user_id: booking.guest_id,
          type: "booking_cancelled",
          title: "Booking Cancelled",
          message: "Your booking has been cancelled by an admin.",
          data: {
            booking_id: bookingId,
            property_id: booking.property_id,
            cancellation_reason: reason || "Cancelled by admin",
            cancelled_by: "admin",
          },
          is_read: false,
          created_at: nowIso,
        });
      } catch (notificationError) {
        console.error("Failed to create guest notification (admin cancel):", notificationError);
      }

      try {
        await supabase.from("notifications").insert({
          user_id: booking.host_id,
          type: "booking_cancelled",
          title: "Booking Cancelled",
          message: "A booking for your property has been cancelled by an admin.",
          data: {
            booking_id: bookingId,
            property_id: booking.property_id,
            cancellation_reason: reason || "Cancelled by admin",
            cancelled_by: "admin",
          },
          is_read: false,
          created_at: nowIso,
        });
      } catch (notificationError) {
        console.error("Failed to create host notification (admin cancel):", notificationError);
      }

      return NextResponse.json({
        success: true,
        message: "Booking cancelled successfully",
      });
    }

    if (action === "refund") {
      const paymentIntentId =
        booking.stripe_payment_intent_id || booking.payment_intent_id;

      const alreadyRefunded = ["refunded", "partially_refunded"].includes(
        String(booking.payment_status || "")
      );

      if (alreadyRefunded) {
        return NextResponse.json({
          success: true,
          message: "Booking already refunded",
          payment_status: booking.payment_status,
        });
      }

      if (!paymentIntentId) {
        return NextResponse.json(
          { error: "No payment intent found for this booking" },
          { status: 400 }
        );
      }

      if (!refundAmount || typeof refundAmount !== "number" || refundAmount <= 0) {
        return NextResponse.json(
          { error: "refundAmount must be a positive number" },
          { status: 400 }
        );
      }

      let stripeRefundId: string;
      try {
        const stripe = getStripeClient();
        const refundResponse = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(refundAmount * 100),
          reason: "requested_by_customer",
          metadata: {
            booking_id: bookingId,
            refund_reason: reason || "Refund processed by admin",
          },
        });

        stripeRefundId = refundResponse.id;
      } catch (stripeError: unknown) {
        console.error("Stripe refund failed (admin):", stripeError);
        return NextResponse.json(
          {
            error: "Failed to process refund",
            details:
              stripeError && typeof stripeError === "object" && "message" in stripeError
                ? String((stripeError as { message?: unknown }).message)
                : "Unknown error",
          },
          { status: 500 }
        );
      }

      const nextPaymentStatus =
        Math.round(refundAmount * 100) >= Math.round(Number(booking.total_amount) * 100)
          ? "refunded"
          : "partially_refunded";

      let updateError: unknown = null;
      {
        const { error } = await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            cancellation_reason: reason || "Cancelled and refunded by admin",
            cancelled_at: nowIso,
            payment_status: nextPaymentStatus,
            refund_amount: refundAmount,
            refund_date: nowIso,
            refund_reason: reason || "Refund processed by admin",
            updated_at: nowIso,
          })
          .eq("id", bookingId);
        updateError = error;
      }

      if (updateError) {
        const { error: fallbackError } = await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            payment_status: nextPaymentStatus,
            refund_amount: refundAmount,
            updated_at: nowIso,
          })
          .eq("id", bookingId);
        updateError = fallbackError;
      }

      if (updateError) {
        console.error("Error updating booking refund fields (admin):", updateError);
        return NextResponse.json(
          {
            error: "Refund processed but booking update failed",
            details:
              updateError && typeof updateError === "object" && "message" in updateError
                ? String((updateError as { message?: unknown }).message)
                : "Unknown error",
          },
          { status: 500 }
        );
      }

      try {
        await supabase.from("notifications").insert({
          user_id: booking.guest_id,
          type: "booking_cancelled",
          title: "Booking Cancelled & Refunded",
          message: "Your booking has been cancelled and refunded by an admin.",
          data: {
            booking_id: bookingId,
            property_id: booking.property_id,
            cancellation_reason: reason || "Cancelled and refunded by admin",
            cancelled_by: "admin",
            refund_amount: refundAmount,
            payment_status: nextPaymentStatus,
          },
          is_read: false,
          created_at: nowIso,
        });
      } catch (notificationError) {
        console.error("Failed to create guest notification (admin refund):", notificationError);
      }

      try {
        await supabase.from("notifications").insert({
          user_id: booking.host_id,
          type: "booking_cancelled",
          title: "Booking Cancelled & Refunded",
          message: "A booking for your property has been cancelled and refunded by an admin.",
          data: {
            booking_id: bookingId,
            property_id: booking.property_id,
            cancellation_reason: reason || "Cancelled and refunded by admin",
            cancelled_by: "admin",
            refund_amount: refundAmount,
            payment_status: nextPaymentStatus,
          },
          is_read: false,
          created_at: nowIso,
        });
      } catch (notificationError) {
        console.error("Failed to create host notification (admin refund):", notificationError);
      }

      return NextResponse.json({
        success: true,
        message: "Refund processed and booking cancelled successfully",
        stripe_refund_id: stripeRefundId,
        payment_status: nextPaymentStatus,
        status: "cancelled",
      });
    }

    return NextResponse.json(
      { error: "Unsupported action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/bookings
 * Update booking status or details
 * Admin only
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: auth.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { bookingId, updates } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Validate updates
    const allowedFields = ["status", "special_requests", "total_amount"];

    const sanitizedUpdates: any = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    // Validate status if being updated
    if (sanitizedUpdates.status) {
      const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
      if (!validStatuses.includes(sanitizedUpdates.status)) {
        return NextResponse.json(
          { error: "Invalid status value" },
          { status: 400 }
        );
      }
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return NextResponse.json(
        { error: "Failed to update booking", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: "Booking updated successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/bookings
 * Delete booking (use with caution)
 * Admin only
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: auth.error },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Booking deletion is disabled",
        message: "Use admin cancel/refund actions instead of deleting bookings",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
