import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { emailService } from "@/lib/email/unified-email-service";
import { buildAppUrl } from "@/lib/app-url";

type InviteRole = "admin" | "super_admin";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyAdminOrSuperAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false as const, status: 503, error: "Service temporarily unavailable" };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false as const, status: 401, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { ok: false as const, status: 401, error: "Invalid or expired session" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile?.role || !["admin", "super_admin"].includes(profile.role)) {
    return { ok: false as const, status: 403, error: "Admin access required" };
  }

  return { ok: true as const, supabase, userId: user.id, role: profile.role as "admin" | "super_admin" };
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminOrSuperAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  let query = auth.supabase
    .from("admin_invites")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status === "pending") {
    query = query
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString());
  }

  if (status === "accepted") {
    query = query.not("accepted_at", "is", null);
  }

  if (status === "revoked") {
    query = query.not("revoked_at", "is", null);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to load invites", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ invites: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminOrSuperAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const emailRaw = typeof body.email === "string" ? body.email : "";
  const roleRaw = typeof body.role === "string" ? body.role : "admin";

  if (!emailRaw || !isValidEmail(emailRaw)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const email = normalizeEmail(emailRaw);
  const role = (roleRaw === "super_admin" ? "super_admin" : "admin") as InviteRole;

  if (role === "super_admin" && auth.role !== "super_admin") {
    return NextResponse.json({ error: "Only super_admin can invite super_admin" }, { status: 403 });
  }

  const { data: created, error: createError } = await auth.supabase
    .from("admin_invites")
    .insert({
      email,
      role,
      invited_by: auth.userId,
    })
    .select("*")
    .single();

  if (createError || !created) {
    return NextResponse.json(
      { error: "Failed to create invite", details: createError?.message },
      { status: 500 }
    );
  }

  const acceptUrl = buildAppUrl(
    `/auth/accept-invite?token=${encodeURIComponent(created.token)}`
  );

  try {
    await emailService.sendNotification({
      to: email,
      subject: "You were invited as an admin",
      message:
        role === "super_admin"
          ? "You have been invited to become a super admin. Sign in and accept the invite to activate your access."
          : "You have been invited to become an admin. Sign in and accept the invite to activate your access.",
      actionUrl: acceptUrl,
      actionText: "Accept Invite",
    });
  } catch (error) {
    console.warn("Invite email failed (non-critical):", error);
  }

  return NextResponse.json({ invite: created, acceptUrl });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminOrSuperAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const inviteId = request.nextUrl.searchParams.get("id");
  if (!inviteId) {
    return NextResponse.json({ error: "Missing invite id" }, { status: 400 });
  }

  const { data: invite, error: inviteError } = await auth.supabase
    .from("admin_invites")
    .select("id, role")
    .eq("id", inviteId)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.role === "super_admin" && auth.role !== "super_admin") {
    return NextResponse.json({ error: "Only super_admin can revoke super_admin invites" }, { status: 403 });
  }

  const { error } = await auth.supabase
    .from("admin_invites")
    .update({ revoked_at: new Date().toISOString(), revoked_by: auth.userId })
    .eq("id", inviteId);

  if (error) {
    return NextResponse.json({ error: "Failed to revoke invite", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
