import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to verify admin
async function verifyAdmin(request: NextRequest) {
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
 * GET /api/admin/stats
 * Get platform-wide statistics
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: auth.error },
        { status: 403 }
      );
    }

    // Get total users count
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Get users by role
    const { data: usersByRole } = await supabase
      .from("profiles")
      .select("role")
      .then((res) => {
        const counts = { user: 0, host: 0, admin: 0, super_admin: 0 };
        res.data?.forEach((p: any) => {
          if (p.role in counts) counts[p.role as keyof typeof counts]++;
        });
        return { data: counts };
      });

    // Get verified users count
    const { count: verifiedUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_verified", true);

    // Get total properties
    const { count: totalProperties } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true });

    // Get active properties
    const { count: activeProperties } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Get total bookings
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true });

    // Get bookings by status
    const { data: bookingsByStatus } = await supabase
      .from("bookings")
      .select("status")
      .then((res) => {
        const counts = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
        res.data?.forEach((b: any) => {
          if (b.status in counts)
            counts[b.status as keyof typeof counts]++;
        });
        return { data: counts };
      });

    // Get total revenue
    const { data: revenueData } = await supabase
      .from("bookings")
      .select("total_amount")
      .in("status", ["confirmed", "completed"]);

    const totalRevenue = revenueData?.reduce(
      (sum, booking) => sum + (parseFloat(booking.total_amount) || 0),
      0
    );

    // Get new users this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { count: newUsersThisMonth } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstDayOfMonth.toISOString());

    // Get new bookings this month
    const { count: newBookingsThisMonth } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstDayOfMonth.toISOString());

    // Get revenue this month
    const { data: monthlyRevenueData } = await supabase
      .from("bookings")
      .select("total_amount")
      .in("status", ["confirmed", "completed"])
      .gte("created_at", firstDayOfMonth.toISOString());

    const monthlyRevenue = monthlyRevenueData?.reduce(
      (sum, booking) => sum + (parseFloat(booking.total_amount) || 0),
      0
    );

    // Get recent activity (last 10 bookings)
    const { data: recentBookings } = await supabase
      .from("bookings")
      .select(
        `
        id,
        created_at,
        status,
        total_amount,
        property:properties(title),
        guest_name,
        guest_email
      `
      )
      .order("created_at", { ascending: false })
      .limit(10);

    // Get top hosts by revenue
    const { data: topHosts } = await supabase
      .from("bookings")
      .select(
        `
        host_id,
        total_amount,
        host:profiles!bookings_host_id_fkey(
          first_name,
          last_name
        )
      `
      )
      .in("status", ["confirmed", "completed"])
      .then((res) => {
        const hostRevenue: Record<string, any> = {};
        res.data?.forEach((booking: any) => {
          const hostId = booking.host_id;
          if (!hostRevenue[hostId]) {
            hostRevenue[hostId] = {
              hostId,
              hostName: `${booking.host.first_name} ${booking.host.last_name}`,
              revenue: 0,
              bookingCount: 0,
            };
          }
          hostRevenue[hostId].revenue += parseFloat(booking.total_amount) || 0;
          hostRevenue[hostId].bookingCount++;
        });

        return {
          data: Object.values(hostRevenue)
            .sort((a: any, b: any) => b.revenue - a.revenue)
            .slice(0, 5),
        };
      });

    // Calculate average booking value
    const avgBookingValue =
      totalBookings && totalBookings > 0
        ? (totalRevenue || 0) / totalBookings
        : 0;

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers || 0,
          verified: verifiedUsers || 0,
          byRole: usersByRole || { user: 0, host: 0, admin: 0 },
          newThisMonth: newUsersThisMonth || 0,
        },
        properties: {
          total: totalProperties || 0,
          active: activeProperties || 0,
          inactive: (totalProperties || 0) - (activeProperties || 0),
        },
        bookings: {
          total: totalBookings || 0,
          byStatus: bookingsByStatus || {
            pending: 0,
            confirmed: 0,
            cancelled: 0,
            completed: 0,
          },
          newThisMonth: newBookingsThisMonth || 0,
        },
        revenue: {
          total: totalRevenue || 0,
          thisMonth: monthlyRevenue || 0,
          averageBooking: avgBookingValue,
        },
        recentActivity: recentBookings || [],
        topHosts: topHosts || [],
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
