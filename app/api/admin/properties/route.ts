import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple in-memory rate limiter (per IP)
const __rateLimit = new Map<string, { count: number; reset: number }>();
function allowRequest(ip: string, max = 120, windowMs = 5 * 60 * 1000) {
  const now = Date.now();
  const entry = __rateLimit.get(ip);
  if (!entry || now > entry.reset) {
    __rateLimit.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

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
 * GET /api/admin/properties
 * Get all properties with filters (for moderation)
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!allowRequest(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: auth.error },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status"); // active, inactive, pending
    const hostId = searchParams.get("host_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase.from("properties").select(
      `
        *,
        host:profiles!properties_host_id_fkey(
          id,
          user_id,
          first_name,
          last_name,
          email:user_id
        )
      `,
      { count: "exact" }
    );

    // Apply filters
    if (status === "active") {
      query = query.eq("is_active", true);
    } else if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    if (hostId) {
      query = query.eq("host_id", hostId);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order("created_at", {
      ascending: false,
    });

    const { data: properties, error, count } = await query;

    if (error) {
      console.error("Error fetching properties:", error);
      return NextResponse.json(
        { error: "Failed to fetch properties", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      properties,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
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

/**
 * PUT /api/admin/properties
 * Update property (approve, reject, deactivate, etc.)
 * Admin only
 */
export async function PUT(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!allowRequest(ip, 60)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: auth.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { propertyId, updates } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Validate updates
    const allowedFields = [
      "is_active",
      "title",
      "description",
      "price_per_night",
      "max_guests",
      "bedrooms",
      "bathrooms",
    ];

    const sanitizedUpdates: any = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    // Update property
    const { data: updatedProperty, error: updateError } = await supabase
      .from("properties")
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", propertyId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating property:", updateError);
      return NextResponse.json(
        { error: "Failed to update property", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      property: updatedProperty,
      message: "Property updated successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/properties
 * Delete property
 * Admin only
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: auth.error },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Check if property has active bookings
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "pending"])
      .limit(1);

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete property with active bookings",
          message: "Please cancel all active bookings first",
        },
        { status: 400 }
      );
    }

    // Delete property
    const { error: deleteError } = await supabase
      .from("properties")
      .delete()
      .eq("id", propertyId);

    if (deleteError) {
      console.error("Error deleting property:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete property", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
