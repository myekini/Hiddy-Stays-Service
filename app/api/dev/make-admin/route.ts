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
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    console.log("🔧 Making user admin:", email);

    // Get user by email
    const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      console.error("Error fetching users:", getUserError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log("👤 Found user:", user.id, user.email);

    // Update user metadata in auth.users
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role: "admin",
        is_host: true,
      },
    });

    if (updateAuthError) {
      console.error("Error updating auth user:", updateAuthError);
      return NextResponse.json(
        { error: "Failed to update user auth metadata" },
        { status: 500 }
      );
    }

    // Update profile in database
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({
        role: "admin",
        is_host: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateProfileError) {
      console.error("Error updating profile:", updateProfileError);
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 500 }
      );
    }

    // Invalidate cache
    try {
      await supabaseAdmin.rpc("invalidate_profile_cache", {
        target_user_id: user.id,
      });
    } catch (cacheError) {
      console.warn("Cache invalidation failed (non-critical):", cacheError);
    }

    console.log("✅ Successfully made user admin:", email);

    return NextResponse.json({
      success: true,
      message: `Successfully made ${email} an admin`,
      user: {
        id: user.id,
        email: user.email,
        role: "admin",
      },
    });

  } catch (error) {
    console.error("Error in make-admin API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
