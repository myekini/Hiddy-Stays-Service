"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("Handling auth callback...");

        const getSafeNext = () => {
          const urlParams = new URLSearchParams(window.location.search);
          const nextFromQuery = urlParams.get("next");
          const nextFromStorage =
            typeof window !== "undefined" ? localStorage.getItem("auth_next") : null;
          const candidate = nextFromQuery || nextFromStorage;
          if (!candidate) return null;
          if (!candidate.startsWith("/") || candidate.startsWith("//")) return null;
          if (candidate.startsWith("/auth")) return null;
          return candidate;
        };

        const safeNext = getSafeNext();
        if (safeNext) {
          localStorage.removeItem("auth_next");
        }

        // Check for error in URL (OAuth or email verification error)
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get("error");
        const errorDescription = urlParams.get("error_description");
        const errorCode = urlParams.get("error_code");
        const code = urlParams.get("code");

        if (error) {
          console.error(
            "Auth callback error from URL:",
            error,
            errorDescription,
            errorCode
          );

          // Map common errors to user-friendly messages
          let userMessage = errorDescription || error;

          switch (error) {
            case "access_denied":
              userMessage = "You cancelled the sign-in process. Please try again.";
              break;
            case "server_error":
              userMessage = "A server error occurred. Please try again later.";
              break;
            case "temporarily_unavailable":
              userMessage = "The authentication service is temporarily unavailable. Please try again in a few moments.";
              break;
            case "invalid_request":
              userMessage = "Invalid authentication request. Please contact support if this persists.";
              break;
            case "unauthorized_client":
              userMessage = "OAuth configuration error. Please contact support.";
              break;
            case "invalid_grant":
              userMessage = "Authentication expired. Please try signing in again.";
              break;
            default:
              if (errorDescription?.includes("Email link is invalid")) {
                userMessage = "This email verification link has expired or already been used. Please request a new one.";
              } else if (errorDescription?.includes("not authorized")) {
                userMessage = "You don't have permission to access this application.";
              }
          }

          router.push(
            `/auth?error=${encodeURIComponent(userMessage)}`
          );
          return;
        }

        // Check for success message (email verification)
        const type = urlParams.get("type");
        const accessToken = urlParams.get("access_token");
        const refreshToken = urlParams.get("refresh_token");

        console.log("Callback params:", {
          type,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
        });

        // If we have tokens in URL (from email verification), set the session
        if (accessToken && refreshToken) {
          console.log("Setting session from URL tokens...");
          const { data, error: setSessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (setSessionError) {
            console.error(
              "Error setting session from tokens:",
              setSessionError
            );
            router.push("/auth?error=session_set_failed");
            return;
          }

          if (data.session) {
            // For email verification flows, do NOT keep the user signed in.
            if (type === "signup") {
              const firstName =
                (data.session.user?.user_metadata as any)?.first_name ||
                (data.session.user?.user_metadata as any)?.firstName;
              const email = data.session.user?.email;
              if (firstName && email) {
                fetch("/api/email/send", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "welcome",
                    data: { name: firstName, email, userId: data.session.user.id },
                  }),
                }).catch(() => undefined);
              }
              await supabase.auth.signOut();
              router.replace("/auth?verified=true&mode=signin");
              return;
            }

            console.log("Session set successfully, redirecting...");
            router.replace(safeNext || "/");
            return;
          }
        }

        // OAuth PKCE flow: exchange the code for a session
        if (code) {
          console.log("Exchanging OAuth code for session...");
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("Error exchanging code for session:", exchangeError);
            router.push(
              `/auth?error=${encodeURIComponent(
                "Authentication failed. Please try signing in again."
              )}`
            );
            return;
          }

          if (data.session) {
            // For email verification flows, do NOT keep the user signed in.
            if (type === "signup") {
              const firstName =
                (data.session.user?.user_metadata as any)?.first_name ||
                (data.session.user?.user_metadata as any)?.firstName;
              const email = data.session.user?.email;
              if (firstName && email) {
                fetch("/api/email/send", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "welcome",
                    data: { name: firstName, email, userId: data.session.user.id },
                  }),
                }).catch(() => undefined);
              }
              await supabase.auth.signOut();
              router.replace("/auth?verified=true&mode=signin");
              return;
            }

            console.log("OAuth session established, redirecting...");
            router.replace(safeNext || "/");
            return;
          }
        }

        // Fallback: Try to get existing session
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Auth callback session error:", sessionError);

          let errorMessage = "Authentication failed. Please try signing in again.";

          const message = (sessionError.message || "").toLowerCase();
          const isRefreshTokenError =
            message.includes("refresh_token_not_found") ||
            message.includes("refresh token not found") ||
            message.includes("invalid refresh token");

          if (isRefreshTokenError) {
            errorMessage = "Your session has expired. Please sign in again.";
            await supabase.auth.signOut().catch(() => undefined);
            if (typeof window !== "undefined") {
              try {
                for (const key of Object.keys(window.localStorage)) {
                  if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
                    window.localStorage.removeItem(key);
                  }
                }
              } catch {
                // ignore
              }
            }
            router.replace(`/auth?mode=signin&error=${encodeURIComponent(errorMessage)}`);
            return;
          }

          if (message.includes("invalid_grant")) {
            errorMessage = "Authentication link is invalid or expired. Please request a new one.";
          }

          router.replace(`/auth?mode=signin&error=${encodeURIComponent(errorMessage)}`);
          return;
        }

        if (data.session) {
          console.log("Existing session found, redirecting to home...");
          router.replace(safeNext || "/");
        } else {
          console.log("No session found after callback");
          // If email was just verified but no session, show success message
          if (type === "signup") {
            router.replace("/auth?verified=true&mode=signin");
          } else {
            router.push("/auth");
          }
        }
      } catch (error: any) {
        console.error("Unexpected error in auth callback:", error);

        let errorMessage = "An unexpected error occurred during authentication.";

        if (error?.message) {
          if (error.message.includes("network")) {
            errorMessage = "Network error. Please check your connection and try again.";
          } else if (error.message.includes("fetch")) {
            errorMessage = "Unable to connect to authentication service. Please try again.";
          }
        }

        router.push(`/auth?error=${encodeURIComponent(errorMessage)}`);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-8">
        <div className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Completing sign in</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Securing your session and preparing your account.
            </p>
          </div>

          <div className="space-y-3">
            <div className="h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
              <div className="h-full w-1/3 bg-slate-900/70 dark:bg-white/70 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-10 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
              <div className="h-10 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
