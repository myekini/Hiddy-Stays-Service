import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Initialize Supabase client with service role key for admin operations
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

/**
 * PATCH /api/admin/users/[userId]/role
 * Update user role (admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Get the current user session
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header missing" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the user's session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // Check if current user is admin
    const { data: adminProfile, error: adminCheckError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      adminCheckError ||
      (adminProfile?.role !== "admin" && adminProfile?.role !== "super_admin")
    ) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { role } = body;

    // Validate role
    if (!role || !["user", "host", "admin", "super_admin"].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "user", "host", "admin", or "super_admin"' },
        { status: 400 }
      );
    }

    if (role === "super_admin" && adminProfile?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super_admin can assign super_admin" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const targetUserId = resolvedParams.userId;

    // Prevent admin from demoting themselves
    if (
      targetUserId === user.id &&
      ((adminProfile?.role === "admin" && role !== "admin") ||
        (adminProfile?.role === "super_admin" && role !== "super_admin"))
    ) {
      return NextResponse.json(
        { error: "Cannot change your own admin role" },
        { status: 400 }
      );
    }

    // Get target user details and current role
    const { data: targetUser, error: targetUserError } =
      await supabaseAdmin.auth.admin.getUserById(targetUserId);

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Get current profile role for logging
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", targetUserId)
      .single();

    const oldRole = targetProfile?.role || "user";

    // Update user metadata in auth.users
    const { error: updateAuthError } =
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...targetUser.user.user_metadata,
          role,
          is_host: role === "host" || role === "admin" || role === "super_admin",
        },
      });

    if (updateAuthError) {
      console.error("Error updating auth user metadata:", updateAuthError);
      return NextResponse.json(
        { error: "Failed to update user role in auth" },
        { status: 500 }
      );
    }

    // Update profile in database
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({
        role,
        is_host: role === "host" || role === "admin" || role === "super_admin",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", targetUserId);

    if (updateProfileError) {
      console.error("Error updating profile:", updateProfileError);
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 500 }
      );
    }

    // Log the action (with error handling)
    try {
      await supabaseAdmin.from("activity_logs").insert({
        user_id: user.id,
        action: "update_user_role",
        entity_type: "user",
        entity_id: targetUserId,
        metadata: {
          old_role: oldRole,
          new_role: role,
          target_user_email: targetUser.user.email,
        },
      });
    } catch (logError) {
      console.warn("Failed to log activity (non-critical):", logError);
      // Don't fail the request if logging fails
    }

    // Invalidate cache for the target user
    try {
      await supabaseAdmin.rpc("invalidate_profile_cache", {
        target_user_id: targetUserId,
      });
    } catch (cacheError) {
      console.warn("Failed to invalidate cache (non-critical):", cacheError);
      // Don't fail the request if cache invalidation fails
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      user: {
        id: targetUserId,
        email: targetUser.user.email,
        role,
      },
    });
  } catch (error) {
    console.error("Error in role update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users/[userId]/role
 * Get user's current role (admin only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Get the current user session
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header missing" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // Check if current user is admin
    const { data: adminProfile, error: adminCheckError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      adminCheckError ||
      (adminProfile?.role !== "admin" && adminProfile?.role !== "super_admin")
    ) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const targetUserId = resolvedParams.userId;

    // Get target user's role
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, is_host, first_name, last_name")
      .eq("user_id", targetUserId)
      .single();

    if (profileError || !targetProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: targetUserId,
      role: targetProfile.role,
      isHost: targetProfile.is_host,
      firstName: targetProfile.first_name,
      lastName: targetProfile.last_name,
    });
  } catch (error) {
    console.error("Error in get role API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
