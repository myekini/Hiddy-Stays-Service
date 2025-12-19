import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isValidPhoneNumber } from "libphonenumber-js";
import { buildAppUrl } from "@/lib/app-url";
import { signBookingAccessToken } from "@/lib/booking-access-token";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function errorResponse(
  status: number,
  error: string,
  message?: string,
  details?: Record<string, unknown>
) {
  const payload: Record<string, unknown> = {
    success: false,
    error,
  };

  if (message) payload.message = message;
  if (!IS_PRODUCTION && details && Object.keys(details).length > 0) {
    payload.details = details;
  }

  return NextResponse.json(payload, { status });
}

interface BookingGuestInfo {
  userId?: string;
  name: string;
  email: string;
  phone: string;
  specialRequests?: string;
}

interface BookingCreateRequestBody {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestInfo: BookingGuestInfo;
  totalAmount: number;
}

type BookingCreateRequestBodyInput = Partial<BookingCreateRequestBody>;

interface BookingValidationResult {
  isValid: boolean;
  errors: string[];
  value?: BookingCreateRequestBody;
}

// Validation helper functions
function validateBookingRequest(body: BookingCreateRequestBodyInput): BookingValidationResult {
  const errors: string[] = [];

  const propertyId = body.propertyId;
  const checkIn = body.checkIn;
  const checkOut = body.checkOut;
  const guests = body.guests;
  const guestInfo = body.guestInfo;
  const totalAmount = body.totalAmount;

  if (!propertyId) {
    errors.push("Property ID is required");
  }

  if (!checkIn) {
    errors.push("Check-in date is required");
  } else {
    const checkInDate = new Date(checkIn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      errors.push("Check-in date cannot be in the past");
    }
  }

  if (!checkOut) {
    errors.push("Check-out date is required");
  } else if (checkIn) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkOutDate <= checkInDate) {
      errors.push("Check-out date must be after check-in date");
    }

    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (nights > 30) {
      errors.push("Maximum stay is 30 nights");
    }
  }

  if (!guests || guests < 1) {
    errors.push("At least 1 guest is required");
  }

  if (guests && guests > 16) {
    errors.push("Maximum 16 guests allowed");
  }

  if (!guestInfo) {
    errors.push("Guest information is required");
  } else {
    if (!guestInfo.name || guestInfo.name.trim().length < 2) {
      errors.push("Guest name must be at least 2 characters");
    }

    if (
      !guestInfo.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)
    ) {
      errors.push("Valid email address is required");
    }

    // Enhanced phone validation
    if (!guestInfo.phone || guestInfo.phone.trim().length === 0) {
      errors.push("Phone number is required");
    } else {
      try {
        // Try parsing with default country (Canada/US)
        if (!isValidPhoneNumber(guestInfo.phone, "CA")) {
          // Try without country code
          if (!isValidPhoneNumber(guestInfo.phone)) {
            errors.push(
              "Invalid phone number format. Please include country code (e.g., +1 for North America)"
            );
          }
        }
      } catch {
        errors.push("Invalid phone number format");
      }
    }
  }

  if (!totalAmount || totalAmount <= 0) {
    errors.push("Total amount must be greater than 0");
  }

  if (
    errors.length === 0 &&
    propertyId &&
    checkIn &&
    checkOut &&
    guests &&
    guestInfo &&
    totalAmount
  ) {
    return {
      isValid: true,
      errors: [],
      value: {
        propertyId,
        checkIn,
        checkOut,
        guests,
        guestInfo,
        totalAmount,
      },
    };
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: BookingCreateRequestBodyInput;
    try {
      body = (await request.json()) as BookingCreateRequestBodyInput;
    } catch {
      return errorResponse(400, "Invalid request format", "Malformed JSON");
    }

    // Validate request
    const validation = validateBookingRequest(body);
    if (!validation.isValid || !validation.value) {
      return errorResponse(400, "Validation failed", "Please check your booking details and try again", {
        validationErrors: validation.errors,
      });
    }

    const { propertyId, checkIn, checkOut, guests, guestInfo, totalAmount } =
      validation.value;

    // Check if property exists and is active
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, host_id, title, max_guests, is_active")
      .eq("id", propertyId)
      .single();

    if (propertyError || !property) {
      return errorResponse(404, "Property not found", "The property you're trying to book no longer exists", {
        code: propertyError?.code,
        message: propertyError?.message,
      });
    }

    if (!property.is_active) {
      return errorResponse(400, "Property unavailable", "This property is currently not available for booking");
    }

    if (guests > property.max_guests) {
      return errorResponse(
        400,
        "Too many guests",
        `This property can only accommodate up to ${property.max_guests} guests`
      );
    }

    // Check if dates are blocked by host
    // Blocked dates are inclusive [start_date, end_date]
    // Booking occupancy is [check_in, check_out) so we consider overlap if:
    // blocked_start < check_out AND blocked_end >= check_in
    const { data: blockedDates, error: blockedDatesError } = await supabase
      .from("blocked_dates")
      .select("id, start_date, end_date")
      .eq("property_id", propertyId)
      .lt("start_date", checkOut)
      .gte("end_date", checkIn);

    if (blockedDatesError) {
      return errorResponse(
        500,
        "Availability check failed",
        "Unable to verify property availability. Please try again.",
        {
          code: blockedDatesError.code,
          message: blockedDatesError.message,
        }
      );
    }

    if (blockedDates && blockedDates.length > 0) {
      return errorResponse(
        409,
        "Property not available",
        "The selected dates are blocked by the host. Please choose different dates."
      );
    }

    // Check if property is available
    // Date overlap logic: Two ranges overlap if:
    // new_check_in < existing_check_out AND existing_check_in < new_check_out
    // In hotel bookings, check-out date is typically exclusive (you leave on that day)
    // So a booking from Jan 1-5 means occupied Jan 1-4, available again on Jan 5
    const { data: existingBookings, error: availabilityError } = await supabase
      .from("bookings")
      .select("id, check_in_date, check_out_date, status, guest_id")
      .eq("property_id", propertyId)
      .in("status", ["pending", "confirmed"]); // Only check active bookings, exclude cancelled/completed

    if (availabilityError) {
      return errorResponse(
        500,
        "Availability check failed",
        "Unable to verify property availability. Please try again.",
        {
          code: availabilityError.code,
          message: availabilityError.message,
        }
      );
    }

    // Check for date overlaps manually (more reliable than complex OR queries)
    // Two date ranges overlap if: start1 < end2 AND start2 < end1
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    const conflictingBookings = existingBookings?.filter((booking) => {
      const existingCheckIn = new Date(booking.check_in_date);
      const existingCheckOut = new Date(booking.check_out_date);
      
      // Check if ranges overlap: new booking starts before existing ends AND existing starts before new ends
      // Note: check-out dates are typically exclusive in hotel systems
      const overlaps = 
        checkInDate < existingCheckOut && 
        existingCheckIn < checkOutDate;
      
      return overlaps;
    }) || [];

    if (conflictingBookings.length > 0) {
      const conflictingBooking = conflictingBookings[0];
      const from = conflictingBooking.check_in_date;
      const to = conflictingBooking.check_out_date;
      
      return NextResponse.json(
        {
          success: false,
          error: "Property not available",
          message: `The property is already booked from ${from} to ${to}`,
          conflictingDates: {
            checkIn: from,
            checkOut: to,
          },
        },
        { status: 409 }
      );
    }

    // Get profile ID if user is logged in
    // guest_id must reference profiles.id, not auth.users.id
    let profileId: string | null = null;
    if (guestInfo.userId) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", guestInfo.userId)
        .single();

      if (profileError || !profile) {
        // Continue with guest booking (profileId remains null)
      } else {
        profileId = profile.id;
      }
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        property_id: propertyId,
        guest_id: profileId, // Use profile.id, not auth user.id
        host_id: property.host_id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        guests_count: guests,
        total_amount: totalAmount,
        guest_name: guestInfo.name,
        guest_email: guestInfo.email,
        guest_phone: guestInfo.phone,
        special_requests: guestInfo.specialRequests || null,
        status: "pending",
        payment_status: "pending",
        currency: "CAD",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      // Prevent double-booking at DB level (race-condition safe)
      if (bookingError.code === "23P01") {
        return errorResponse(
          409,
          "Property not available",
          "The selected dates are no longer available. Please choose different dates.",
          {
            code: bookingError.code,
            message: bookingError.message,
          }
        );
      }

      // Handle specific database errors
      if (bookingError.code === "23505") {
        return errorResponse(409, "Duplicate booking", "A booking with these details already exists", {
          code: bookingError.code,
          message: bookingError.message,
        });
      }

      if (bookingError.code === "23503") {
        // Foreign key constraint violation
        const errorMessage = bookingError.details?.includes("guest_id")
          ? "User profile not found. Please ensure you are logged in with a valid account."
          : bookingError.details?.includes("host_id")
          ? "Host profile not found for this property"
          : bookingError.details?.includes("property_id")
          ? "Property not found"
          : "Invalid reference. Please check your booking details.";

        return errorResponse(400, "Invalid reference", errorMessage, {
          code: bookingError.code,
          details: bookingError.details,
        });
      }

      return errorResponse(500, "Booking creation failed", "Unable to create booking. Please try again.", {
        code: bookingError.code,
        message: bookingError.message,
      });
    }

    // Get property and host information for notification and emails
    const { data: propertyDetails } = await supabase
      .from("properties")
      .select("host_id, title, address")
      .eq("id", propertyId)
      .single();

    // Get host profile and email from auth.users
    const { data: hostProfile } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name")
      .eq("id", propertyDetails?.host_id)
      .single();

    // Get host email from auth.users table
    let hostEmail = null;
    if (hostProfile?.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(
        hostProfile.user_id
      );
      hostEmail = authUser?.user?.email;
    }

    // Create notification for host
    if (propertyDetails?.host_id) {
      try {
        await supabase.from("notifications").insert({
          user_id: propertyDetails.host_id,
          type: "booking_new",
          title: "New Booking Received! 🎉",
          message: `You have received a new booking for ${propertyDetails.title}`,
          data: {
            booking_id: booking.id,
            property_id: propertyId,
            property_title: propertyDetails.title,
            guest_name: guestInfo.name,
            check_in_date: checkIn,
            check_out_date: checkOut,
            guests_count: guests,
            total_amount: totalAmount,
          },
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } catch {
        // Don't fail the booking creation if notification fails
      }
    }

    // Send booking request email to guest (before payment)
    if (guestInfo.email) {
      try {
        const { unifiedEmailService } = await import(
          "@/lib/unified-email-service"
        );
        await unifiedEmailService.sendBookingRequest({
          bookingId: booking.id,
          guestName: guestInfo.name,
          guestEmail: guestInfo.email,
          hostName:
            `${hostProfile?.first_name || ""} ${hostProfile?.last_name || ""}`.trim() ||
            "Host",
          hostEmail: hostEmail || "",
          propertyTitle: propertyDetails?.title || "Property",
          propertyLocation: propertyDetails?.address || "",
          paymentUrl: buildAppUrl(`/bookings/${booking.id}`),
          checkInDate: new Date(checkIn).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          checkOutDate: new Date(checkOut).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          guests,
          totalAmount,
        });
      } catch {
        // Don't fail the booking if email fails
      }
    }

    // Host notification email is sent after payment confirmation (verify-payment/webhook)

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      accessToken: signBookingAccessToken({
        bookingId: booking.id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      }),
      status: "pending",
      message:
        "Booking created successfully! The host will review your request.",
      booking: {
        id: booking.id,
        propertyId: booking.property_id,
        checkIn: booking.check_in_date,
        checkOut: booking.check_out_date,
        guests: booking.guests_count,
        totalAmount: booking.total_amount,
        status: booking.status,
        createdAt: booking.created_at,
      },
    });
  } catch {
    return errorResponse(
      500,
      "Internal server error",
      "An unexpected error occurred. Please try again later."
    );
  }
}
