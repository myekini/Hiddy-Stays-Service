import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hostId = searchParams.get("host_id");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!hostId) {
      return NextResponse.json(
        { error: "Host ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching host stats for host: ${hostId}`);

    // Get total properties
    const { count: totalProperties } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("host_id", hostId);

    // Get active bookings count
    const { count: activeBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("host_id", hostId)
      .in("status", ["pending", "confirmed"]);

    // Get monthly revenue (current month)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data: monthlyBookings } = await supabase
      .from("bookings")
      .select("total_amount")
      .eq("host_id", hostId)
      .eq("status", "confirmed")
      .gte("created_at", `${currentMonth}-01`)
      .lt("created_at", `${currentMonth}-32`);

    const monthlyRevenue =
      monthlyBookings?.reduce(
        (sum, booking) => sum + (booking.total_amount || 0),
        0
      ) || 0;

    // Get average rating
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("host_id", hostId);

    const avgRating =
      reviews && reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    const stats = {
      total_properties: totalProperties || 0,
      active_bookings: activeBookings || 0,
      monthly_revenue: monthlyRevenue,
      avg_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching host stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
