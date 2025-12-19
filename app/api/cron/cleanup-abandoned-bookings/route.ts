import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/cron/cleanup-abandoned-bookings
 * Cleans up abandoned bookings (pending for >1 hour)
 *
 * WEEK 2: Automated Cleanup
 * - Removes bookings with pending status for >1 hour
 * - Prevents database clutter
 * - Can be called via cron job or Vercel Cron
 *
 * SETUP:
 * 1. Add to vercel.json:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/cleanup-abandoned-bookings",
 *        "schedule": "0 * * * *"
 *      }]
 *    }
 *
 * 2. Or use external cron service (cron-job.org, EasyCron, etc.)
 *
 * SECURITY:
 * - Verify cron secret token to prevent unauthorized access
 * - Set CRON_SECRET in environment variables
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        console.error("❌ Unauthorized cron request");
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    } else {
      console.warn("⚠️ CRON_SECRET not set - cron endpoint is unprotected!");
    }

    console.log("🧹 Starting abandoned bookings cleanup...");

    // Call database function to cleanup abandoned bookings
    const { data, error } = await supabase.rpc("cleanup_abandoned_bookings");

    if (error) {
      console.error("❌ Cleanup function error:", error);
      return NextResponse.json(
        {
          error: "Cleanup failed",
          details: error.message,
        },
        { status: 500 }
      );
    }

    const result = Array.isArray(data) ? data[0] : data;
    const deletedCount = result?.deleted_count || 0;
    const deletedIds = result?.booking_ids || [];

    // Log cleanup activity
    if (deletedCount > 0) {
      await supabase.from("activity_logs").insert({
        user_id: "00000000-0000-0000-0000-000000000000", // System user
        action: "cleanup_abandoned_bookings",
        entity_type: "booking",
        entity_id: null,
        metadata: {
          deleted_count: deletedCount,
          booking_ids: deletedIds,
          execution_time_ms: Date.now() - startTime,
        },
      });
    }

    console.log(`✅ Cleanup complete: ${deletedCount} bookings removed in ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      deletedCount: deletedCount,
      bookingIds: deletedIds,
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Cleanup script error:", error);

    // Log failure
    try {
      await supabase.from("activity_logs").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action: "cleanup_abandoned_bookings_failed",
        entity_type: "system",
        entity_id: null,
        metadata: {
          error: error.message,
          stack: error.stack,
        },
      });
    } catch (logError) {
      console.error("Failed to log cleanup failure:", logError);
    }

    return NextResponse.json(
      {
        error: "Cleanup script failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/cleanup-abandoned-bookings
 * Manual trigger with optional parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dryRun = false,
      maxAge,
      maxAgeCard = 60,
      maxAgeBankTransfer = 24 * 60,
    } = body;

    const effectiveMaxAge = typeof maxAge === "number" ? maxAge : undefined;
    const cutoffCard = new Date(Date.now() - maxAgeCard * 60 * 1000).toISOString();
    const cutoffBank = new Date(
      Date.now() - maxAgeBankTransfer * 60 * 1000
    ).toISOString();

    console.log(
      `🧹 Manual cleanup triggered (dryRun: ${dryRun}, maxAge: ${effectiveMaxAge ?? "split"} minutes)`
    );

    // Get bookings that would be deleted
    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select("id, created_at, guest_name, guest_email, total_amount, payment_method")
      .eq("status", "pending")
      .eq("payment_status", "pending")
      .or(
        effectiveMaxAge
          ? `created_at.lt.${new Date(Date.now() - effectiveMaxAge * 60 * 1000).toISOString()}`
          : `and(payment_method.eq.bank_transfer,created_at.lt.${cutoffBank}),and(payment_method.neq.bank_transfer,created_at.lt.${cutoffCard})`
      );

    if (fetchError) {
      throw fetchError;
    }

    if (dryRun) {
      // Just return what would be deleted
      return NextResponse.json({
        dryRun: true,
        wouldDelete: bookings?.length || 0,
        bookings: bookings?.map((b) => ({
          id: b.id,
          guestName: b.guest_name,
          amount: b.total_amount,
          createdAt: b.created_at,
          paymentMethod: b.payment_method,
          ageMinutes: Math.floor(
            (Date.now() - new Date(b.created_at).getTime()) / (1000 * 60)
          ),
        })) || [],
      });
    }

    // Actually delete
    const deleteQuery = supabase
      .from("bookings")
      .delete()
      .eq("status", "pending")
      .eq("payment_status", "pending")
      .or(
        effectiveMaxAge
          ? `created_at.lt.${new Date(Date.now() - effectiveMaxAge * 60 * 1000).toISOString()}`
          : `and(payment_method.eq.bank_transfer,created_at.lt.${cutoffBank}),and(payment_method.neq.bank_transfer,created_at.lt.${cutoffCard})`
      );

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      throw deleteError;
    }

    console.log(`✅ Manual cleanup complete: ${bookings?.length || 0} bookings removed`);

    return NextResponse.json({
      success: true,
      deletedCount: bookings?.length || 0,
      bookingIds: bookings?.map((b) => b.id) || [],
    });
  } catch (error: any) {
    console.error("❌ Manual cleanup error:", error);
    return NextResponse.json(
      { error: "Manual cleanup failed", message: error.message },
      { status: 500 }
    );
  }
}
