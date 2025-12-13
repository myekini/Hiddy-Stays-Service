import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
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

    // Get basic stats
    const { data: properties } = await supabase
      .from("properties")
      .select("id, title")
      .eq("host_id", hostId);

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("host_id", hostId)
      .gte("created_at", startDate.toISOString());

    const { data: allBookings } = await supabase
      .from("bookings")
      .select("property_id, guest_email, total_amount, status, created_at, guests_count, check_in_date, check_out_date")
      .eq("host_id", hostId);

    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating, guest_id")
      .eq("host_id", hostId);

    // Calculate summary metrics
    const totalBookings = bookings?.length || 0;
    const confirmedBookings = bookings?.filter(b => b.status === "confirmed").length || 0;
    const totalEarnings = bookings?.filter(b => b.status === "confirmed")
      .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
    const avgBookingValue = totalBookings > 0 ? totalEarnings / confirmedBookings : 0;

    // Calculate occupancy rate (simplified)
    const totalDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const bookedDays = bookings?.filter(b => b.status === "confirmed")
      .reduce((sum, b) => {
        const checkIn = new Date(b.check_in_date);
        const checkOut = new Date(b.check_out_date);
        return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) || 0;
    
    const occupancyRate = properties?.length ? (bookedDays / (totalDays * properties.length)) * 100 : 0;

    // Generate monthly earnings trend
    const monthlyEarnings = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthBookings = allBookings?.filter(b => {
        const createdAt = new Date(b.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd && b.status === "confirmed";
      }) || [];

      monthlyEarnings.push({
        month: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        earnings: monthBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
        bookings: monthBookings.length
      });
    }

    // Property performance
    const propertyPerformance = properties?.map(property => {
      const propBookings = allBookings?.filter(b => b.property_id === property.id && b.status === "confirmed") || [];
      const revenue = propBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      
      return {
        propertyId: property.id,
        title: property.title,
        bookings: propBookings.length,
        revenue: revenue,
        views: Math.floor(Math.random() * 1000) + 100, // Mock data
        conversionRate: propBookings.length > 0 ? (propBookings.length / (Math.floor(Math.random() * 50) + 20)) * 100 : 0
      };
    }) || [];

    // Guest analytics
    const uniqueGuests = new Set(allBookings?.map(b => b.guest_email)).size;
    const repeatGuests = allBookings?.reduce((acc, booking) => {
      const guestBookings = allBookings.filter(b => b.guest_email === booking.guest_email);
      if (guestBookings.length > 1 && !acc.includes(booking.guest_email)) {
        acc.push(booking.guest_email);
      }
      return acc;
    }, [] as string[]).length || 0;

    const avgStayDuration = allBookings?.length ? 
      allBookings.reduce((sum, b) => {
        const checkIn = new Date(b.check_in_date);
        const checkOut = new Date(b.check_out_date);
        return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / allBookings.length : 0;

    const avgRating = reviews?.length ? 
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    // Find top performer
    const topPerformer = propertyPerformance.length > 0 ? 
      propertyPerformance.reduce((top, current) => 
        current.revenue > top.revenue ? current : top
      ) : null;

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
        projectedMonthlyEarnings: monthlyEarnings.length > 0 ? 
          monthlyEarnings[monthlyEarnings.length - 1].earnings * 1.08 : 0
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
  } catch (error) {
    console.error("Error fetching host analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
