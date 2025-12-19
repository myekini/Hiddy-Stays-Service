import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type InviteRole = "admin" | "super_admin";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const inviteToken = typeof body.token === "string" ? body.token : "";

    if (!inviteToken) {
      return NextResponse.json({ error: "Missing invite token" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    const { data: invite, error: inviteError } = await supabase
      .from("admin_invites")
      .select("id, email, role, expires_at, accepted_at, revoked_at")
      .eq("token", inviteToken)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.revoked_at) {
      return NextResponse.json({ error: "Invite was revoked" }, { status: 400 });
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 400 });
    }

    if (normalizeEmail(invite.email) !== normalizeEmail(user.email)) {
      return NextResponse.json(
        { error: "Invite email does not match signed-in user" },
        { status: 403 }
      );
    }

    const desiredRole = (invite.role === "super_admin" ? "super_admin" : "admin") as InviteRole;

    // Ensure profile exists (older users / trigger edge cases)
    try {
      await supabase.rpc("create_missing_profile", { user_uuid: user.id });
    } catch {
      // Non-blocking
    }

    const { error: acceptError } = await supabase
      .from("admin_invites")
      .update({ accepted_at: nowIso, accepted_by: user.id })
      .eq("id", invite.id);

    if (acceptError) {
      return NextResponse.json(
        { error: "Failed to accept invite", details: acceptError.message },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          role: desiredRole,
          is_host: true,
          is_verified: true,
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to update profile", details: profileError.message },
        { status: 500 }
      );
    }

    // Invalidate role cache (non-blocking)
    try {
      await supabase.rpc("invalidate_profile_cache", { target_user_id: user.id });
    } catch {
      // Non-blocking
    }

    const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(user.id);
    if (authUserError || !authUserData?.user) {
      return NextResponse.json(
        { error: "Failed to update auth user" },
        { status: 500 }
      );
    }

    const existingMetadata = authUserData.user.user_metadata || {};
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...existingMetadata,
        role: desiredRole,
        is_host: true,
      },
    });

    if (updateAuthError) {
      return NextResponse.json(
        { error: "Failed to update auth metadata", details: updateAuthError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, role: desiredRole });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
