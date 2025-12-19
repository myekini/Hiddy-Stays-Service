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

    if (!hostId) {
      return NextResponse.json(
        { error: "Host ID is required" },
        { status: 400 }
      );
    }

    // Get total properties
    const { count: totalProperties } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("host_id", hostId);

    // Compute rating from properties table (kept in sync by review triggers)
    const { data: propertiesForRating } = await supabase
      .from("properties")
      .select("rating, review_count")
      .eq("host_id", hostId);

    // Get active bookings count
    const { count: activeBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("host_id", hostId)
      .in("status", ["pending", "confirmed"]);

    // Get monthly revenue (current month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const { data: monthlyBookings } = await supabase
      .from("bookings")
      .select("total_amount")
      .eq("host_id", hostId)
      .eq("status", "confirmed")
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", nextMonthStart.toISOString());

    const monthlyRevenue =
      monthlyBookings?.reduce(
        (sum, booking) => sum + (booking.total_amount || 0),
        0
      ) || 0;

    const ratingAgg = (propertiesForRating || []).reduce(
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

    const avgRating = ratingAgg.count > 0 ? ratingAgg.sum / ratingAgg.count : 0;

    const stats = {
      total_properties: totalProperties || 0,
      active_bookings: activeBookings || 0,
      monthly_revenue: monthlyRevenue,
      avg_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
    };

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
