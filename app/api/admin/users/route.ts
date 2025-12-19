import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase environment variables for admin API. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    if (profile?.role !== "admin" && profile?.role !== "super_admin") {
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
        is_suspended,
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

    if (profile?.role !== "admin" && profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate updates
    const allowedFields = [
      "role",
      "is_verified",
      "is_suspended",
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

    if (sanitizedUpdates.role === "super_admin") {
      sanitizedUpdates.is_host = true;
    }

    if (sanitizedUpdates.role === "super_admin" && profile?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super_admin can assign super_admin" },
        { status: 403 }
      );
    }

    // Keep auth.users metadata in sync when updating role/host/verification
    const shouldUpdateAuthMetadata =
      sanitizedUpdates.role !== undefined ||
      sanitizedUpdates.is_host !== undefined ||
      sanitizedUpdates.is_verified !== undefined;

    if (shouldUpdateAuthMetadata) {
      const { data: authUserData, error: authUserError } =
        await supabase.auth.admin.getUserById(userId);

      if (authUserError || !authUserData?.user) {
        console.error("Error fetching auth user for metadata sync:", authUserError);
        return NextResponse.json(
          {
            error: "Failed to update user",
            details: "Could not load auth user for metadata sync",
          },
          { status: 500 }
        );
      }

      const existingMetadata = authUserData.user.user_metadata || {};
      const updatedMetadata = {
        ...existingMetadata,
        ...(sanitizedUpdates.role !== undefined
          ? { role: sanitizedUpdates.role }
          : {}),
        ...(sanitizedUpdates.is_host !== undefined
          ? { is_host: sanitizedUpdates.is_host }
          : {}),
        ...(sanitizedUpdates.is_verified !== undefined
          ? { is_verified: sanitizedUpdates.is_verified }
          : {}),
      };

      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: updatedMetadata,
        }
      );

      if (updateAuthError) {
        console.error("Error updating auth user metadata:", updateAuthError);
        return NextResponse.json(
          { error: "Failed to update user", details: updateAuthError.message },
          { status: 500 }
        );
      }
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

    // Invalidate middleware cache for this user (non-blocking)
    try {
      await supabase.rpc("invalidate_profile_cache", { target_user_id: userId });
    } catch {
      // Non-blocking
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

    if (profile?.role !== "admin" && profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, role } = body as {
      email?: string;
      password?: string;
      role?: "user" | "host" | "admin" | "super_admin";
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (role === "super_admin" && profile?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super_admin can create super_admin" },
        { status: 403 }
      );
    }

    const finalRole: "user" | "host" | "admin" | "super_admin" = role || "user";
    const isHost =
      finalRole === "host" || finalRole === "admin" || finalRole === "super_admin";

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

    // Ensure profile exists (trigger can fail in some environments)
    try {
      await supabase.rpc("create_missing_profile", { user_uuid: created.user.id });
    } catch {
      // Non-blocking
    }

    // Ensure profile matches (profile row might be created by trigger; update is idempotent)
    const { data: updatedProfile, error: profileUpdateError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: created.user.id,
          role: finalRole,
          is_host: isHost,
          is_verified: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (profileUpdateError) {
      console.error("Failed to update profile after user creation:", profileUpdateError);
    }

    // Invalidate middleware cache for created user (non-blocking)
    try {
      await supabase.rpc("invalidate_profile_cache", { target_user_id: created.user.id });
    } catch {
      // Non-blocking
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

    if (profile?.role !== "admin" && profile?.role !== "super_admin") {
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
