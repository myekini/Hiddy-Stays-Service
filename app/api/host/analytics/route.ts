import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { searchParams } = new URL(request.url);
    const hostId = searchParams.get("host_id");
    const timeRange = searchParams.get("time_range") || "30days";

    if (!hostId) {
      return NextResponse.json(
        { error: "Host ID is required" },
        { status: 400 }
      );
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "12months":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "ytd":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // 30days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("id, title, rating, review_count")
      .eq("host_id", hostId);

    if (propertiesError) {
      return NextResponse.json(
        { error: "Failed to load properties" },
        { status: 500 }
      );
    }

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        "property_id, guest_email, total_amount, status, created_at, guests_count, check_in_date, check_out_date"
      )
      .eq("host_id", hostId)
      .gte("created_at", startDate.toISOString());

    if (bookingsError) {
      return NextResponse.json(
        { error: "Failed to load bookings" },
        { status: 500 }
      );
    }

    const ratingAgg = (properties || []).reduce(
      (acc, p) => {
        const count = Number((p as { review_count?: unknown }).review_count) || 0;
        const rating = Number((p as { rating?: unknown }).rating) || 0;
        if (count > 0 && Number.isFinite(rating)) {
          acc.sum += rating * count;
          acc.count += count;
        }
        return acc;
      },
      { sum: 0, count: 0 }
    );

    const totalBookings = bookings?.length || 0;
    const confirmedBookingsList =
      bookings?.filter((b) => b.status === "confirmed") || [];
    const confirmedBookings = confirmedBookingsList.length;
    const totalEarnings = confirmedBookingsList.reduce(
      (sum, b) => sum + (b.total_amount || 0),
      0
    );
    const avgBookingValue =
      confirmedBookings > 0 ? totalEarnings / confirmedBookings : 0;

    // Calculate occupancy rate (simplified)
    const totalDays = Math.max(
      1,
      Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const bookedDays = confirmedBookingsList.reduce((sum, b) => {
        const checkIn = new Date(b.check_in_date);
        const checkOut = new Date(b.check_out_date);
        return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
    
    const occupancyRate = properties?.length ? (bookedDays / (totalDays * properties.length)) * 100 : 0;

    // Generate monthly earnings trend (last 6 months)
    const monthlyEarnings: Array<{ month: string; earnings: number; bookings: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthBookings = bookings?.filter((b) => {
        const createdAt = new Date(b.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd && b.status === "confirmed";
      }) || [];

      monthlyEarnings.push({
        month: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        earnings: monthBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
        bookings: monthBookings.length
      });
    }

    const propertyPerformance =
      properties?.map((property) => {
        const propBookings =
          bookings?.filter(
            (b) => b.property_id === property.id && b.status === "confirmed"
          ) || [];
        const revenue = propBookings.reduce(
          (sum, b) => sum + (b.total_amount || 0),
          0
        );

        return {
          propertyId: property.id,
          title: property.title,
          bookings: propBookings.length,
          revenue,
        };
      }) || [];

    const guestEmailCounts = (bookings || []).reduce((acc, b) => {
      const email = b.guest_email;
      if (!email) return acc;
      acc.set(email, (acc.get(email) || 0) + 1);
      return acc;
    }, new Map<string, number>());

    const uniqueGuests = guestEmailCounts.size;
    const repeatGuests = Array.from(guestEmailCounts.values()).filter((c) => c > 1)
      .length;

    const avgStayDuration = confirmedBookingsList.length
      ? confirmedBookingsList.reduce((sum, b) => {
          const checkIn = new Date(b.check_in_date);
          const checkOut = new Date(b.check_out_date);
          return (
            sum +
            Math.ceil(
              (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
            )
          );
        }, 0) / confirmedBookingsList.length
      : 0;

    const avgRating = ratingAgg.count > 0 ? ratingAgg.sum / ratingAgg.count : 0;

    // Find top performer
    const topPerformer = propertyPerformance.length > 0 ? 
      propertyPerformance.reduce((top, current) => 
        current.revenue > top.revenue ? current : top
      ) : null;

    const projectedMonthlyEarnings = totalDays > 0 ? (totalEarnings / totalDays) * 30 : 0;

    const analytics = {
      summary: {
        totalEarnings,
        totalBookings,
        confirmedBookings,
        avgBookingValue,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        activeProperties: properties?.length || 0
      },
      trends: {
        monthlyEarnings,
        projectedMonthlyEarnings: Math.round(projectedMonthlyEarnings * 100) / 100
      },
      properties: {
        performance: propertyPerformance,
        topPerformer
      },
      guests: {
        totalGuests: uniqueGuests,
        avgStayDuration: Math.round(avgStayDuration * 10) / 10,
        repeatGuests,
        avgRating: Math.round(avgRating * 10) / 10
      },
      timeRange,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(analytics);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
