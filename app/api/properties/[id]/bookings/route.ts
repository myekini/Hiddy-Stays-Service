import { createClient } from "@/integrations/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/properties/[id]/bookings
 * Get all bookings for a property (host only)
 * Query params: status, start_date, end_date, page, limit
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const resolvedParams = await params;
    const propertyId = resolvedParams.id;

    // Verify property ownership
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("host_id, title")
      .eq("id", propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    if (property.host_id !== profile.id) {
      return NextResponse.json(
        { error: "You can only view bookings for your own properties" },
        { status: 403 }
      );
    }

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = (page - 1) * limit;

    // Filters
    const statusFilter = searchParams.get("status");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    let query = supabase
      .from("bookings")
      .select(
        `
        id,
        guest_id,
        check_in_date,
        check_out_date,
        guests_count,
        total_amount,
        status,
        payment_status,
        special_requests,
        created_at,
        updated_at,
        profiles!bookings_guest_id_fkey (
          user_id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url
        )
      `,
        { count: "exact" }
      )
      .eq("property_id", propertyId)
      .order("check_in_date", { ascending: false });

    // Apply filters
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (startDate) {
      query = query.gte("check_in_date", startDate);
    }

    if (endDate) {
      query = query.lte("check_out_date", endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: bookings, error: bookingsError, count } = await query;

    if (bookingsError) {
      console.error("Bookings error:", bookingsError);
      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    // Format bookings
    const formattedBookings = bookings?.map((booking: any) => {
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: booking.id,
        guest: {
          id: booking.profiles?.user_id,
          name: `${booking.profiles?.first_name || ""} ${booking.profiles?.last_name || ""}`.trim() || "Guest",
          email: booking.profiles?.email,
          phone: booking.profiles?.phone,
          avatar: booking.profiles?.avatar_url,
        },
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        nights,
        guests_count: booking.guests_count,
        total_price: booking.total_amount || 0,
        status: booking.status,
        payment_status: booking.payment_status,
        special_requests: booking.special_requests,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
      };
    });

    // Calculate summary statistics
    const allBookings = bookings || [];
    const confirmedCount = allBookings.filter(
      (b) => b.status === "confirmed"
    ).length;
    const pendingCount = allBookings.filter(
      (b) => b.status === "pending"
    ).length;
    const completedCount = allBookings.filter(
      (b) => b.status === "completed"
    ).length;
    const cancelledCount = allBookings.filter(
      (b) => b.status === "cancelled"
    ).length;

    return NextResponse.json({
      property: {
        id: propertyId,
        title: property.title,
      },
      bookings: formattedBookings || [],
      summary: {
        total: count || 0,
        confirmed: confirmedCount,
        pending: pendingCount,
        completed: completedCount,
        cancelled: cancelledCount,
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error getting bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
