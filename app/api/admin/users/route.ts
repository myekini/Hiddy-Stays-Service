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

/**
 * GET /api/admin/users
 * Get all users with their profiles and activity
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
    // Get the user from the request headers
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authorization header" },
        { status: 401 }
      );
    }

    // Extract the token
    const token = authHeader.replace("Bearer ", "");

    // Verify the user and check if admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid token" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role");
    const isVerified = searchParams.get("is_verified");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase.from("profiles").select(
      `
        id,
        user_id,
        first_name,
        last_name,
        role,
        is_host,
        is_verified,
        phone,
        bio,
        location,
        avatar_url,
        last_login_at,
        login_count,
        created_at,
        updated_at
      `,
      { count: "exact" }
    );

    // Apply filters
    if (role) {
      query = query.eq("role", role);
    }
    if (isVerified !== null) {
      query = query.eq("is_verified", isVerified === "true");
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order("created_at", {
      ascending: false,
    });

    const { data: profiles, error, count } = await query;

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users", details: error.message },
        { status: 500 }
      );
    }

    // Get auth users data
    const userIds = profiles?.map(p => p.user_id) || [];
    const { data: authData } = await supabase.auth.admin.listUsers();

    // Merge auth data with profiles
    const usersWithAuth = profiles?.map(profile => {
      const authUser = authData?.users?.find(u => u.id === profile.user_id);
      return {
        ...profile,
        email: authUser?.email,
        emailConfirmedAt: authUser?.email_confirmed_at,
        lastSignInAt: authUser?.last_sign_in_at,
      };
    });

    return NextResponse.json({
      success: true,
      users: usersWithAuth,
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
 * PUT /api/admin/users
 * Update user profile (role, verification status, etc.)
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
    const body = await request.json();
    const { userId, updates } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify admin access (same as GET)
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate updates
    const allowedFields = [
      "role",
      "is_verified",
      "is_host",
      "first_name",
      "last_name",
      "phone",
      "bio",
      "location",
    ];

    const sanitizedUpdates: any = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    // If role is being updated to host, set is_host to true
    if (sanitizedUpdates.role === "host" || sanitizedUpdates.role === "admin") {
      sanitizedUpdates.is_host = true;
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json(
        { error: "Failed to update user", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedProfile,
      message: "User updated successfully",
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
 * POST /api/admin/users
 * Create a new user (auth + profile)
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!allowRequest(ip, 60)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, role } = body as {
      email?: string;
      password?: string;
      role?: "user" | "host" | "admin";
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const finalRole: "user" | "host" | "admin" = role || "user";
    const isHost = finalRole === "host" || finalRole === "admin";

    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: finalRole,
          is_host: isHost,
          is_verified: true,
        },
      });

    if (createError || !created?.user) {
      return NextResponse.json(
        { error: "Failed to create user", details: createError?.message },
        { status: 500 }
      );
    }

    // Ensure profile matches (profile row might be created by trigger; update is idempotent)
    const { data: updatedProfile, error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        role: finalRole,
        is_host: isHost,
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", created.user.id)
      .select()
      .single();

    if (profileUpdateError) {
      console.error("Failed to update profile after user creation:", profileUpdateError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: created.user.id,
        email: created.user.email,
        role: finalRole,
        profile: updatedProfile || null,
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
 * DELETE /api/admin/users
 * Delete user account
 * Admin only
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify admin access
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Delete user (this will cascade to profile via database rules)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete user", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
