import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateUser, createAuthResponse } from "@/lib/auth-middleware";
import { verifyBookingAccessToken } from "@/lib/booking-access-token";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation helper for booking updates
function validateBookingUpdate(body: any) {
  const errors: string[] = [];
  const allowedFields = ["status", "special_requests", "notes"];

  // Check if any invalid fields are being updated
  const invalidFields = Object.keys(body).filter(
    (key) => !allowedFields.includes(key)
  );
  if (invalidFields.length > 0) {
    errors.push(`Invalid fields: ${invalidFields.join(", ")}`);
  }

  // Validate status if provided
  if (
    body.status &&
    !["pending", "confirmed", "cancelled", "completed"].includes(body.status)
  ) {
    errors.push(
      "Status must be one of: pending, confirmed, cancelled, completed"
    );
  }

  // Validate special requests length
  if (body.special_requests && body.special_requests.length > 500) {
    errors.push("Special requests must be less than 500 characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tokenFromQuery = request.nextUrl.searchParams.get("token") || "";
    const tokenFromHeader = request.headers.get("x-booking-access-token") || "";
    const token = tokenFromQuery || tokenFromHeader;
    const tokenPayload = token ? verifyBookingAccessToken(token) : null;
    const tokenAllowsAccess = Boolean(tokenPayload && tokenPayload.bookingId === id);

    const user = tokenAllowsAccess ? null : await authenticateUser(request);
    if (!tokenAllowsAccess && !user) {
      return createAuthResponse("Unauthorized");
    }

    // Validate booking ID format
    if (
      !id ||
      typeof id !== "string" ||
      id.length < 10
    ) {
      return NextResponse.json(
        {
          error: "Invalid booking ID",
          message: "Please provide a valid booking ID",
        },
        { status: 400 }
      );
    }

    console.log(`Retrieving booking: ${id}`);

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        properties!bookings_property_id_fkey (
          id,
          title,
          description,
          address,
          location,
          price_per_night,
          max_guests,
          property_images!property_images_property_id_fkey(id, public_url, storage_path, is_primary, display_order)
        ),
        guest:profiles!bookings_guest_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url
        ),
        host:profiles!bookings_host_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `
      )
      .eq("id", id)
      .single();

    if (!tokenAllowsAccess && booking && booking.guest_id !== user!.profile_id && booking.host_id !== user!.profile_id) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You don't have permission to view this booking",
        },
        { status: 403 }
      );
    }

    if (error) {
      console.error("Booking retrieval error:", error);

      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            error: "Booking not found",
            message: "The booking you're looking for doesn't exist",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to retrieve booking",
          message: "Unable to fetch booking details. Please try again.",
        },
        { status: 500 }
      );
    }

    // Transform the data to include property images
    const transformedBooking = {
      ...booking,
      property: {
        ...booking.properties,
        images:
          booking.properties?.property_images?.map(
            (img: any) => img.public_url
          ) || [],
      },
      guest_name: booking.guest
        ? `${booking.guest.first_name || ""} ${booking.guest.last_name || ""}`.trim()
        : booking.guest_name,
      guest_email: booking.guest?.email || booking.guest_email,
      guest_phone: booking.guest?.phone || booking.guest_phone,
      host_name: booking.host
        ? `${booking.host.first_name || ""} ${booking.host.last_name || ""}`.trim()
        : "Host",
      host_email: booking.host?.email,
    };

    return NextResponse.json({
      success: true,
      message: "Booking retrieved successfully",
      booking: transformedBooking,
      data: transformedBooking, // Also include for backward compatibility
    });
  } catch (error) {
    console.error("Unexpected error retrieving booking:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const user = await authenticateUser(request);
    if (!user) {
      return createAuthResponse("Unauthorized");
    }

    // Validate booking ID format
    if (
      !id ||
      typeof id !== "string" ||
      id.length < 10
    ) {
      return NextResponse.json(
        {
          error: "Invalid booking ID",
          message: "Please provide a valid booking ID",
        },
        { status: 400 }
      );
    }

    // Validate update data
    const validation = validateBookingUpdate(body);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
          message: "Please check your update data and try again",
        },
        { status: 400 }
      );
    }

    console.log(`Updating booking: ${id}`);

    // Check if booking exists and get current status
    const { data: existingBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, status, check_in_date, guest_id, host_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingBooking) {
      return NextResponse.json(
        {
          error: "Booking not found",
          message: "The booking you're trying to update doesn't exist",
        },
        { status: 404 }
      );
    }

    if (
      existingBooking.guest_id !== user.profile_id &&
      existingBooking.host_id !== user.profile_id
    ) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You don't have permission to update this booking",
        },
        { status: 403 }
      );
    }

    // Prevent certain status changes
    if (body.status) {
      const currentStatus = existingBooking.status;
      const newStatus = body.status;

      // Prevent changing from completed or cancelled bookings
      if (currentStatus === "completed" && newStatus !== "completed") {
        return NextResponse.json(
          {
            error: "Cannot modify completed booking",
            message: "Completed bookings cannot be changed",
          },
          { status: 400 }
        );
      }

      if (currentStatus === "cancelled" && newStatus !== "cancelled") {
        return NextResponse.json(
          {
            error: "Cannot modify cancelled booking",
            message: "Cancelled bookings cannot be reactivated",
          },
          { status: 400 }
        );
      }
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        properties!bookings_property_id_fkey (
          id,
          title,
          address,
          location,
          price_per_night
        ),
        guest:profiles!bookings_guest_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        host:profiles!bookings_host_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `
      )
      .single();

    if (error) {
      console.error("Booking update error:", error);
      return NextResponse.json(
        {
          error: "Failed to update booking",
          message: "Unable to update booking. Please try again.",
        },
        { status: 500 }
      );
    }

    // Create notification if status changed
    if (body.status && body.status !== existingBooking.status) {
      try {
        const notificationData = {
          user_id: existingBooking.guest_id,
          type: `booking_${body.status}`,
          title: `Booking ${body.status.charAt(0).toUpperCase() + body.status.slice(1)}!`,
          message: `Your booking has been ${body.status}`,
          data: {
            booking_id: id,
            old_status: existingBooking.status,
            new_status: body.status,
          },
          is_read: false,
          created_at: new Date().toISOString(),
        };

        await supabase.from("notifications").insert(notificationData);
      } catch (notificationError) {
        console.error("Failed to create notification:", notificationError);
        // Don't fail the update if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Booking updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Unexpected error updating booking:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid request format",
          message: "Please check your request data and try again",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await authenticateUser(request);
    if (!user) {
      return createAuthResponse("Unauthorized");
    }

    // Validate booking ID format
    if (
      !id ||
      typeof id !== "string" ||
      id.length < 10
    ) {
      return NextResponse.json(
        {
          error: "Invalid booking ID",
          message: "Please provide a valid booking ID",
        },
        { status: 400 }
      );
    }

    console.log(`Cancelling booking: ${id}`);

    // Check if booking exists and get details
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, status, check_in_date, guest_id, host_id, properties(title)")
      .eq("id", id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        {
          error: "Booking not found",
          message: "The booking you're trying to cancel doesn't exist",
        },
        { status: 404 }
      );
    }

    if (booking.guest_id !== user.profile_id && booking.host_id !== user.profile_id) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You don't have permission to cancel this booking",
        },
        { status: 403 }
      );
    }

    // Check if booking can be cancelled
    if (booking.status === "completed") {
      return NextResponse.json(
        {
          error: "Cannot cancel completed booking",
          message: "Completed bookings cannot be cancelled",
        },
        { status: 400 }
      );
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        {
          error: "Booking already cancelled",
          message: "This booking has already been cancelled",
        },
        { status: 400 }
      );
    }

    // Check if booking is too close to check-in (within 24 hours)
    const checkInDate = new Date(booking.check_in_date);
    const now = new Date();
    const hoursUntilCheckIn =
      (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilCheckIn < 24 && booking.status === "confirmed") {
      return NextResponse.json(
        {
          error: "Cannot cancel confirmed booking",
          message:
            "Confirmed bookings cannot be cancelled within 24 hours of check-in",
        },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Booking cancellation error:", updateError);
      return NextResponse.json(
        {
          error: "Failed to cancel booking",
          message: "Unable to cancel booking. Please try again.",
        },
        { status: 500 }
      );
    }

    // Create notification for guest
    try {
      await supabase.from("notifications").insert({
        user_id: booking.guest_id,
        type: "booking_cancelled",
        title: "Booking Cancelled ❌",
        message: `Your booking for ${(booking.properties as any)?.title || "the property"} has been cancelled`,
        data: {
          booking_id: id,
          property_title: (booking.properties as any)?.title,
          cancellation_reason: "Cancelled by user",
        },
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch (notificationError) {
      console.error("Failed to create notification:", notificationError);
      // Don't fail the cancellation if notification fails
    }

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully",
      bookingId: id,
      status: "cancelled",
    });
  } catch (error) {
    console.error("Unexpected error cancelling booking:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}

