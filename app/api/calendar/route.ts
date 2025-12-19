import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

interface CalendarBooking {
  check_in_date: string;
  check_out_date: string;
  [key: string]: unknown;
}

interface CalendarBlockedDate {
  start_date: string;
  end_date: string;
  reason?: string | null;
  price_override?: number | null;
  [key: string]: unknown;
}

async function getRequesterProfile(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", userData.user.id)
    .single();

  if (profileError || !profile) return null;
  return { profileId: profile.id as string, role: profile.role as string };
}

async function assertCanManageProperty(
  request: NextRequest,
  propertyId: string
): Promise<{ profileId: string; role: string } | null> {
  const requester = await getRequesterProfile(request);
  if (!requester) return null;

  if (requester.role === "admin") return requester;

  const { data: property, error } = await supabase
    .from("properties")
    .select("id, host_id")
    .eq("id", propertyId)
    .single();

  if (error || !property) return null;
  if (property.host_id !== requester.profileId) return null;

  return requester;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("property_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!propertyId) {
      return errorResponse(400, "Property ID is required");
    }

    const requester = await assertCanManageProperty(request, propertyId);
    const canViewGuestDetails = !!requester;
    const canViewBlockedDetails = !!requester;

    // Get bookings for the property
    let query = supabase
      .from("bookings")
      .select(
        canViewGuestDetails
          ? "id,check_in_date,check_out_date,status,guests_count,total_amount,currency,profiles:profiles!bookings_guest_id_fkey(first_name,last_name)"
          : "id,check_in_date,check_out_date,status"
      );

    query = query.eq("property_id", propertyId).order("check_in_date", {
      ascending: true,
    });

    query = query.in("status", ["pending", "confirmed"]);

    // Only fetch bookings that overlap the requested range
    // Booking occupancy is [check_in, check_out) so check_out must be strictly > rangeStart
    if (startDate && endDate) {
      query = query.lte("check_in_date", endDate).gt("check_out_date", startDate);
    }

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      return errorResponse(500, "Failed to fetch calendar", undefined, {
        code: bookingsError.code,
        message: bookingsError.message,
      });
    }

    // Get property availability rules
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("availability_rules, min_nights, max_nights")
      .eq("id", propertyId)
      .single();

    if (propertyError) {
      return errorResponse(500, "Failed to fetch calendar", undefined, {
        code: propertyError.code,
        message: propertyError.message,
      });
    }

    // Get blocked dates for the property
    let blockedDatesQuery = supabase
      .from("blocked_dates")
      .select(canViewBlockedDetails ? "*" : "start_date,end_date")
      .eq("property_id", propertyId);

    if (startDate && endDate) {
      blockedDatesQuery = blockedDatesQuery
        .lte("start_date", endDate)
        .gte("end_date", startDate);
    }

    const { data: blockedDates, error: blockedDatesError } =
      await blockedDatesQuery;

    if (blockedDatesError) {
      return errorResponse(500, "Failed to fetch calendar", undefined, {
        code: blockedDatesError.code,
        message: blockedDatesError.message,
      });
    }

    const calendarBookings = Array.isArray(bookings)
      ? (bookings as unknown as CalendarBooking[])
      : [];

    const calendarBlockedDates = Array.isArray(blockedDates)
      ? (blockedDates as unknown as CalendarBlockedDate[])
      : [];

    // Generate calendar data
    const calendarData = generateCalendarData(
      calendarBookings,
      calendarBlockedDates,
      property?.availability_rules || {},
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      calendar: calendarData,
      bookings: bookings || [],
      blockedDates: calendarBlockedDates,
      availability_rules: property?.availability_rules || {},
    });
  } catch {
    return errorResponse(500, "Failed to fetch calendar");
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid request body", "Malformed JSON");
    }

    if (!body || typeof body !== "object") {
      return errorResponse(400, "Invalid request body");
    }

    const parsed = body as Record<string, unknown>;
    const {
      property_id,
      start_date,
      end_date,
      action, // 'block' or 'unblock'
      reason,
      price_override,
    } = parsed;

    if (!property_id || !start_date || !end_date || !action) {
      return errorResponse(400, "Missing required fields");
    }

    if (typeof property_id !== "string") {
      return errorResponse(400, "Invalid property_id");
    }

    if (typeof start_date !== "string" || typeof end_date !== "string") {
      return errorResponse(400, "Invalid date range");
    }

    if (typeof action !== "string" || !["block", "unblock"].includes(action)) {
      return errorResponse(400, "Invalid action");
    }

    const requester = await assertCanManageProperty(request, property_id);
    if (!requester) {
      return errorResponse(401, "Unauthorized");
    }

    // Check for existing bookings in the date range
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("property_id", property_id)
      .in("status", ["pending", "confirmed"])
      .lte("check_in_date", end_date)
      .gt("check_out_date", start_date);

    if (existingBookings && existingBookings.length > 0) {
      return errorResponse(400, "Cannot modify dates with existing bookings");
    }

    if (action === "block") {
      // Create a blocked date entry
      const { data: blockedDate, error } = await supabase
        .from("blocked_dates")
        .insert({
          property_id,
          start_date,
          end_date,
          reason: typeof reason === "string" && reason.trim() ? reason : "Host blocked",
          price_override:
            typeof price_override === "number" ? price_override : null,
        })
        .select()
        .single();

      if (error) {
        return errorResponse(500, "Failed to manage calendar", undefined, {
          code: error.code,
          message: error.message,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Dates blocked successfully",
        blocked_date: blockedDate,
      });
    } else if (action === "unblock") {
      // Remove blocked date entries
      const { error } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("property_id", property_id)
        .gte("start_date", start_date)
        .lte("end_date", end_date);

      if (error) {
        return errorResponse(500, "Failed to manage calendar", undefined, {
          code: error.code,
          message: error.message,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Dates unblocked successfully",
      });
    }

    return errorResponse(400, "Invalid action");
  } catch {
    return errorResponse(500, "Failed to manage calendar");
  }
}

export async function PUT(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid request body", "Malformed JSON");
    }

    if (!body || typeof body !== "object") {
      return errorResponse(400, "Invalid request body");
    }

    const parsed = body as Record<string, unknown>;
    const {
      property_id,
      availability_rules,
      min_nights,
      max_nights,
      advance_notice_hours,
      same_day_booking,
    } = parsed;

    if (!property_id) {
      return errorResponse(400, "Property ID is required");
    }

    if (typeof property_id !== "string") {
      return errorResponse(400, "Invalid property_id");
    }

    const requester = await assertCanManageProperty(request, property_id);
    if (!requester) {
      return errorResponse(401, "Unauthorized");
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (availability_rules) updateData.availability_rules = availability_rules;

    if (min_nights !== undefined) {
      const parsedMin = typeof min_nights === "string" ? parseInt(min_nights, 10) : NaN;
      if (Number.isNaN(parsedMin)) return errorResponse(400, "Invalid min_nights");
      updateData.min_nights = parsedMin;
    }

    if (max_nights !== undefined) {
      const parsedMax = typeof max_nights === "string" ? parseInt(max_nights, 10) : NaN;
      if (Number.isNaN(parsedMax)) return errorResponse(400, "Invalid max_nights");
      updateData.max_nights = parsedMax;
    }

    if (advance_notice_hours !== undefined) {
      const parsedAdvance =
        typeof advance_notice_hours === "string"
          ? parseInt(advance_notice_hours, 10)
          : NaN;
      if (Number.isNaN(parsedAdvance)) {
        return errorResponse(400, "Invalid advance_notice_hours");
      }
      updateData.advance_notice_hours = parsedAdvance;
    }

    if (same_day_booking !== undefined)
      updateData.same_day_booking = same_day_booking;

    const { data: property, error } = await supabase
      .from("properties")
      .update(updateData)
      .eq("id", property_id)
      .select()
      .single();

    if (error) {
      return errorResponse(500, "Failed to update availability rules", undefined, {
        code: error.code,
        message: error.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Availability rules updated successfully",
      property,
    });
  } catch {
    return errorResponse(500, "Failed to update availability rules");
  }
}

function generateCalendarData(
  bookings: CalendarBooking[],
  blockedDates: CalendarBlockedDate[],
  _availabilityRules: Record<string, unknown>,
  startDate?: string | null,
  endDate?: string | null
) {
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate
    ? new Date(endDate)
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

  const calendarData = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split("T")[0];

    // Check if date is booked
    const isBooked = bookings.some((booking) => {
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      return currentDate >= checkIn && currentDate < checkOut;
    });

    // Check if date is blocked
    const isBlocked = blockedDates.some((blockedDate) => {
      const blockStart = new Date(blockedDate.start_date);
      const blockEnd = new Date(blockedDate.end_date);
      return currentDate >= blockStart && currentDate <= blockEnd;
    });

    // Find the booking for this date
    const booking = isBooked
      ? bookings.find((booking) => {
          const checkIn = new Date(booking.check_in_date);
          const checkOut = new Date(booking.check_out_date);
          return currentDate >= checkIn && currentDate < checkOut;
        })
      : null;

    // Find the blocked date info for this date
    const blocked_date = isBlocked
      ? blockedDates.find((blockedDate) => {
          const blockStart = new Date(blockedDate.start_date);
          const blockEnd = new Date(blockedDate.end_date);
          return currentDate >= blockStart && currentDate <= blockEnd;
        })
      : null;

    calendarData.push({
      date: dateStr,
      is_available: !isBooked && !isBlocked,
      is_booked: isBooked,
      is_blocked: isBlocked,
      booking,
      blocked_date,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return calendarData;
}
