import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Helper function to verify admin
async function verifyAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return { isAdmin: false, error: "Service temporarily unavailable" };
  }

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
 * GET /api/admin/properties/moderation-queue
 * Get properties pending moderation review
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

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    // Build the query
    let query = supabase
      .from("properties")
      .select(
        `
        id,
        title,
        description,
        location,
        country,
        property_type,
        price_per_night,
        max_guests,
        bedrooms,
        bathrooms,
        amenities,
        approval_status,
        created_at,
        updated_at,
        host:profiles!host_id(
          id,
          first_name,
          last_name,
          email
        ),
        property_images!inner(image_url)
      `
      )
      .order("created_at", { ascending: true });

    // Filter by approval status if specified
    if (status && status !== "all") {
      query = query.eq("approval_status", status);
    } else {
      // Default to pending and needs_review
      query = query.in("approval_status", ["pending", "needs_review"]);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: properties, error } = await query;

    if (error) {
      console.error("Error fetching moderation queue:", error);
      return NextResponse.json(
        { error: "Failed to fetch moderation queue" },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const transformedProperties = (properties || []).map((property: any) => ({
      property_id: property.id,
      title: property.title,
      host_name:
        `${property.host?.first_name || ""} ${property.host?.last_name || ""}`.trim(),
      host_email: property.host?.email || "",
      approval_status: property.approval_status,
      created_at: property.created_at,
      flag_count: 0, // TODO: Implement flag counting
      last_moderation_action: null, // TODO: Get from moderation log
      last_moderation_date: null,
    }));

    return NextResponse.json({
      success: true,
      properties: transformedProperties,
      pagination: {
        limit,
        offset,
        total: transformedProperties.length,
      },
    });
  } catch (error) {
    console.error("Unexpected error in moderation queue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
