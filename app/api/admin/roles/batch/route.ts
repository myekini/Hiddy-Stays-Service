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

interface RoleUpdate {
  userId: string;
  role: "user" | "host" | "admin" | "super_admin";
}

/**
 * POST /api/admin/roles/batch
 * Batch update user roles (admin only)
 */
export async function POST(req: NextRequest) {
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
    const { updates } = body as { updates: RoleUpdate[] };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "Updates array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate all updates
    for (const update of updates) {
      if (!update.userId || !update.role) {
        return NextResponse.json(
          { error: "Each update must have userId and role" },
          { status: 400 }
        );
      }

      if (!["user", "host", "admin", "super_admin"].includes(update.role)) {
        return NextResponse.json(
          { error: `Invalid role: ${update.role}` },
          { status: 400 }
        );
      }

      if (update.role === "super_admin" && adminProfile?.role !== "super_admin") {
        return NextResponse.json(
          { error: "Only super_admin can assign super_admin" },
          { status: 403 }
        );
      }

      // Prevent admin from changing their own role
      if (update.userId === user.id && update.role !== adminProfile?.role) {
        return NextResponse.json(
          { error: "Cannot change your own admin role" },
          { status: 400 }
        );
      }
    }

    const results = {
      successful: [] as string[],
      failed: [] as { userId: string; error: string }[],
    };

    // Process each update
    for (const update of updates) {
      try {
        // Get target user details
        const { data: targetUser, error: targetUserError } =
          await supabaseAdmin.auth.admin.getUserById(update.userId);

        if (targetUserError || !targetUser) {
          results.failed.push({
            userId: update.userId,
            error: "User not found",
          });
          continue;
        }

        // Update user metadata in auth.users
        const { error: updateAuthError } =
          await supabaseAdmin.auth.admin.updateUserById(update.userId, {
            user_metadata: {
              ...targetUser.user.user_metadata,
              role: update.role,
              is_host:
                update.role === "host" ||
                update.role === "admin" ||
                update.role === "super_admin",
            },
          });

        if (updateAuthError) {
          results.failed.push({
            userId: update.userId,
            error: `Failed to update auth: ${updateAuthError.message}`,
          });
          continue;
        }

        // Update profile in database
        const { error: updateProfileError } = await supabaseAdmin
          .from("profiles")
          .update({
            role: update.role,
            is_host:
              update.role === "host" ||
              update.role === "admin" ||
              update.role === "super_admin",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", update.userId);

        if (updateProfileError) {
          results.failed.push({
            userId: update.userId,
            error: `Failed to update profile: ${updateProfileError.message}`,
          });
          continue;
        }

        // Log the action
        await supabaseAdmin.from("activity_logs").insert({
          user_id: user.id,
          action: "batch_update_user_role",
          entity_type: "user",
          entity_id: update.userId,
          metadata: {
            new_role: update.role,
            target_user_email: targetUser.user.email,
          },
        });

        results.successful.push(update.userId);
      } catch (error) {
        console.error(`Error updating role for user ${update.userId}:`, error);
        results.failed.push({
          userId: update.userId,
          error: "Unexpected error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.successful.length} roles, ${results.failed.length} failed`,
      results,
    });
  } catch (error) {
    console.error("Error in batch role update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
