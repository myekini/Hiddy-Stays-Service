"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ModernAuthForm } from "@/components/auth/ModernAuthForm";
import { Suspense } from "react";

type AcceptState =
  | { status: "idle" }
  | { status: "needs_auth" }
  | { status: "accepting" }
  | { status: "success" }
  | { status: "error"; message: string };

function AcceptInvitePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [state, setState] = useState<AcceptState>({ status: "idle" });
  const statusRef = useRef<AcceptState["status"]>("idle");

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  const acceptInvite = useCallback(async (accessToken: string) => {
    setState({ status: "accepting" });

    const resp = await fetch("/api/invites/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const message = json?.error || json?.message || "Failed to accept invite";
      setState({ status: "error", message });
      toast({
        title: "Invite acceptance failed",
        description: message,
        variant: "destructive",
      });
      return;
    }

    await supabase.auth.refreshSession().catch(() => undefined);
    setState({ status: "success" });
    toast({
      title: "Invite accepted",
      description: "Your access has been updated.",
    });

    setTimeout(() => {
      router.replace("/admin");
    }, 300);
  }, [router, toast, token]);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setState({ status: "error", message: "Missing invite token" });
        return;
      }

      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;
      if (!accessToken) {
        setState({ status: "needs_auth" });
        return;
      }

      await acceptInvite(accessToken);
    };

    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!token) return;
      const accessToken = session?.access_token;
      if (!accessToken) return;
      if (statusRef.current === "accepting" || statusRef.current === "success") return;
      await acceptInvite(accessToken);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [acceptInvite, token]);

  if (state.status === "needs_auth") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-4">
          <Card className="p-6">
            <h1 className="text-xl font-semibold text-foreground">Accept Admin Invite</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with the invited email address to accept this invite.
            </p>
          </Card>
          <Card className="p-6">
            <ModernAuthForm mode="signin" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <Card className="p-6 space-y-3">
          {state.status === "accepting" && (
            <>
              <h1 className="text-xl font-semibold text-foreground">Accepting invite…</h1>
              <p className="text-sm text-muted-foreground">Please wait.</p>
            </>
          )}
          {state.status === "success" && (
            <>
              <h1 className="text-xl font-semibold text-foreground">Invite accepted</h1>
              <p className="text-sm text-muted-foreground">Redirecting…</p>
            </>
          )}
          {state.status === "error" && (
            <>
              <h1 className="text-xl font-semibold text-foreground">Invite error</h1>
              <p className="text-sm text-muted-foreground">{state.message}</p>
              <Button onClick={() => router.push("/auth")}>Go to Sign In</Button>
            </>
          )}
          {state.status === "idle" && (
            <>
              <h1 className="text-xl font-semibold text-foreground">Preparing…</h1>
              <p className="text-sm text-muted-foreground">Please wait.</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AcceptInvitePageInner />
    </Suspense>
  );
}
