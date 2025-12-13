import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    console.log("🧹 Starting cleanup of old cancelled bookings...");

    // Delete cancelled bookings older than 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: cancelledBookings, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, guest_name, property_id, check_in_date, check_out_date, cancelled_at")
      .eq("status", "cancelled")
      .lt("cancelled_at", twentyFourHoursAgo.toISOString());

    if (fetchError) {
      console.error("Error fetching cancelled bookings:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch cancelled bookings" },
        { status: 500 }
      );
    }

    if (!cancelledBookings || cancelledBookings.length === 0) {
      console.log("✅ No old cancelled bookings to clean up");
      return NextResponse.json({
        success: true,
        message: "No old cancelled bookings found",
        deleted_count: 0,
      });
    }

    console.log(`🗑️ Found ${cancelledBookings.length} old cancelled bookings to delete`);

    // Delete the old cancelled bookings
    const { error: deleteError } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("status", "cancelled")
      .lt("cancelled_at", twentyFourHoursAgo.toISOString());

    if (deleteError) {
      console.error("Error deleting cancelled bookings:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete cancelled bookings" },
        { status: 500 }
      );
    }

    // Log the cleanup activity
    try {
      await supabaseAdmin.from("activity_logs").insert({
        user_id: null, // System action
        action: "cleanup_cancelled_bookings",
        entity_type: "booking",
        entity_id: null,
        metadata: {
          deleted_count: cancelledBookings.length,
          cutoff_time: twentyFourHoursAgo.toISOString(),
          booking_ids: cancelledBookings.map(b => b.id),
        },
      });
    } catch (logError) {
      console.warn("Failed to log cleanup activity:", logError);
    }

    console.log(`✅ Successfully deleted ${cancelledBookings.length} old cancelled bookings`);

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${cancelledBookings.length} old cancelled bookings`,
      deleted_count: cancelledBookings.length,
      deleted_bookings: cancelledBookings.map(b => ({
        id: b.id,
        guest_name: b.guest_name,
        check_in_date: b.check_in_date,
        check_out_date: b.check_out_date,
      })),
    });

  } catch (error) {
    console.error("Error in cleanup process:", error);
    return NextResponse.json(
      { error: "Internal server error during cleanup" },
      { status: 500 }
    );
  }
}

// GET endpoint to check what would be cleaned up (dry run)
export async function GET() {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: cancelledBookings, error } = await supabaseAdmin
      .from("bookings")
      .select("id, guest_name, property_id, check_in_date, check_out_date, cancelled_at")
      .eq("status", "cancelled")
      .lt("cancelled_at", twentyFourHoursAgo.toISOString());

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch cancelled bookings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: cancelledBookings?.length || 0,
      cutoff_time: twentyFourHoursAgo.toISOString(),
      bookings_to_delete: cancelledBookings?.map(b => ({
        id: b.id,
        guest_name: b.guest_name,
        check_in_date: b.check_in_date,
        check_out_date: b.check_out_date,
        cancelled_at: b.cancelled_at,
      })) || [],
    });

  } catch (error) {
    console.error("Error checking cleanup candidates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
