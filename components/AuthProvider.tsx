"use client";

import { useState, useEffect, createContext, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AuthUtils, { AuthUser } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/app-url";
import SessionManager from "@/lib/session";
import AuthNotifications from "@/lib/auth-notifications";

interface AuthContextType {
  user: User | null;
  authUser: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithGitHub: () => Promise<{ error: any }>;
  signInWithTwitter: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  resendVerificationEmail: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ error: any }>;
  hasPermission: (requiredRole: "user" | "host" | "admin") => Promise<boolean>;
  refreshSession: () => Promise<void>;
  testSupabaseConnection: () => Promise<{ success: boolean; error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const isDev = process.env.NODE_ENV !== "production";

  const roleCacheRef = useRef<{
    userId: string;
    role: "user" | "host" | "admin" | "super_admin";
    is_suspended: boolean;
    ts: number;
  } | null>(null);
  const ROLE_CACHE_TTL_MS = 60 * 1000;

  const primeRoleCache = useCallback(
    async (userId: string) => {
      try {
        const cached = roleCacheRef.current;
        if (cached && cached.userId === userId && Date.now() - cached.ts < ROLE_CACHE_TTL_MS) {
          return cached;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, is_suspended")
          .eq("user_id", userId)
          .single();

        if (error || !profile) {
          return null;
        }

        const role = (profile as any)?.role as
          | "user"
          | "host"
          | "admin"
          | "super_admin"
          | undefined;

        if (!role || !["user", "host", "admin", "super_admin"].includes(role)) {
          return null;
        }

        const value = {
          userId,
          role,
          is_suspended: Boolean((profile as { is_suspended?: boolean | null })?.is_suspended),
          ts: Date.now(),
        };
        roleCacheRef.current = value;
        return value;
      } catch {
        return null;
      }
    },
    []
  );

  const ensureProfileExists = useCallback(async (userId: string) => {
    try {
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingProfile?.user_id) return;

      if (profileError && isDev) {
        console.warn("Profile lookup error (will attempt repair):", profileError);
      }

      const { error: createError } = await supabase.rpc("create_missing_profile", {
        user_uuid: userId,
      });

      if (createError) {
        console.error("Failed to create missing profile:", createError);
      } else if (isDev) {
        console.log("✅ Created missing profile for user:", userId);
      }
    } catch (error) {
      console.error("Unexpected error ensuring profile exists:", error);
    }
  }, [isDev]);

  const storeAuthNext = () => {
    if (typeof window === "undefined") return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const nextFromQuery = urlParams.get("next");
      const nextCandidate =
        nextFromQuery ??
        (window.location.pathname.startsWith("/auth")
          ? "/"
          : `${window.location.pathname}${window.location.search}`);

      if (
        nextCandidate &&
        nextCandidate.startsWith("/") &&
        !nextCandidate.startsWith("//") &&
        !nextCandidate.startsWith("/auth")
      ) {
        localStorage.setItem("auth_next", nextCandidate);
      } else {
        localStorage.removeItem("auth_next");
      }
    } catch {
      localStorage.removeItem("auth_next");
    }
  };

  const getRedirectBaseUrl = () => {
    if (typeof window !== "undefined") return window.location.origin;
    const fromEnv = process.env.NEXTAUTH_URL;
    if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, "");
    return getAppBaseUrl();
  };

  // Rate limiting for authentication attempts
  const authRateLimiter = AuthUtils.createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isDev) {
        console.log("Auth state changed:", event, session?.user?.email);
        console.log("Session details:", {
          event,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          userId: session?.user?.id,
          sessionExpiry: session?.expires_at,
        });
      }

      setSession(session);
      setUser(session?.user ?? null);

      // Convert to AuthUser and validate session
      if (session?.user) {
        // Safety net: ensure profiles row exists (older users / trigger edge cases)
        // Do not block auth on this; it should be best-effort.
        ensureProfileExists(session.user.id);

        const validatedUser = AuthUtils.validateSession(session);
        if (isDev) {
          console.log("Validated user:", validatedUser);
        }
        setAuthUser(validatedUser);

        // Prime role cache in the background for faster dashboard gating
        primeRoleCache(session.user.id);

        // Store session data
        SessionManager.storeSession(session);

        if (event === "SIGNED_IN") {
          AuthNotifications.showSignInSuccess(
            validatedUser?.firstName || validatedUser?.email
          );
        }
      } else {
        if (isDev) {
          console.log("No session or user, clearing auth state");
        }
        setAuthUser(null);
        roleCacheRef.current = null;
        SessionManager.clearSession();
        if (event === "SIGNED_OUT") {
          AuthNotifications.showSignOutSuccess();
        }
      }

      setLoading(false);
    });

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();
        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (existingSession?.user) {
          // Safety net on first load too
          ensureProfileExists(existingSession.user.id);
          const validatedUser = AuthUtils.validateSession(existingSession);
          setAuthUser(validatedUser);
          SessionManager.storeSession(existingSession);

          // Prime role cache in the background
          primeRoleCache(existingSession.user.id);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Auto-refresh session every 5 minutes if token needs refresh
    const refreshInterval = setInterval(async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession?.access_token) {
        const needsRefresh = AuthUtils.needsTokenRefresh(currentSession.access_token);

        if (needsRefresh) {
          if (isDev) {
            console.log("Token needs refresh, refreshing session...");
          }

          const {
            data: { session: newSession },
            error,
          } = await supabase.auth.refreshSession();

          if (error) {
            console.error("Error auto-refreshing session:", error);
          } else if (newSession && isDev) {
            console.log("Session auto-refreshed successfully");
          }
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [toast, ensureProfileExists, isDev, primeRoleCache]);

  const signUp = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    try {
      // Rate limiting check
      if (!authRateLimiter(email)) {
        return {
          error: {
            message: "Too many signup attempts. Please try again later.",
          },
        };
      }

      // Validate email and password
      if (!AuthUtils.isValidEmail(email)) {
        return { error: { message: "Please enter a valid email address." } };
      }

      const passwordValidation = AuthUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          error: {
            message: `Password requirements not met: ${passwordValidation.errors.join(", ")}`,
          },
        };
      }

      const redirectUrl = `${getRedirectBaseUrl()}/auth/callback`;

      console.log("Attempting signup for:", email);
      console.log("Redirect URL:", redirectUrl);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            role: "user", // Default role, can be updated by admin later
          },
        },
      });

      if (error) {
        console.error("Signup error:", error);

        // Handle specific error cases
        if (error.message.includes("User already registered")) {
          toast({
            title: "Account already exists",
            description:
              "An account with this email already exists. Please try signing in instead.",
            variant: "destructive",
          });
        } else if (error.message.includes("Password should be at least")) {
          toast({
            title: "Password too weak",
            description:
              "Please choose a stronger password with at least 8 characters.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        console.log("Signup successful:", data);

        if (data.user && !data.user.email_confirmed_at) {
          // Ensure we don't keep a session for unverified users (avoids confusing half-signed-in state)
          await supabase.auth.signOut();
          toast({
            title: "📧 Verification Email Sent!",
            description:
              "We've sent you a confirmation link to complete your registration. Please check your email inbox and spam folder.",
            variant: "default",
            duration: 8000,
          });
        } else {
          toast({
            title: "Account created successfully!",
            description: "You can now sign in with your credentials.",
            variant: "default",
            duration: 5000,
          });
        }

        // Send welcome email only after email is confirmed
        if (firstName && data.user?.email_confirmed_at) {
          fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "welcome",
              data: { name: firstName, email, userId: data.user.id },
            }),
          })
            .then(() => {
              console.log("✅ Welcome email requested successfully");
            })
            .catch(err => {
              console.error("❌ Failed to request welcome email:", err);
              // Don't show error to user - this is non-critical
            });
        }
      }

      return { error };
    } catch (catchError) {
      console.error("Unexpected signup error:", catchError);
      toast({
        title: "Sign up failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return { error: catchError };
    }
  };

  const signIn = async (email: string, password: string) => {
    // Rate limiting check
    if (!authRateLimiter(email)) {
      return {
        error: {
          message: "Too many signin attempts. Please try again later.",
        },
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Handle specific error cases
      if (error.message.includes("Invalid login credentials")) {
        toast({
          title: "Sign in failed",
          description:
            "Invalid email or password. Please check your credentials and try again.",
          variant: "destructive",
        });
      } else if (error.message.includes("Email not confirmed")) {
        toast({
          title: "Email not verified",
          description:
            "Please verify your email before signing in. Check your inbox for the verification link.",
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
      return { error };
    }

    // Check if email is verified (additional check)
    if (data.user && !data.user.email_confirmed_at) {
      console.log("User email not confirmed, signing out...");

      // Sign out the user immediately
      await supabase.auth.signOut();

      const verificationError = {
        message:
          "Please verify your email before signing in. Check your inbox for the verification link.",
      };

      toast({
        title: "Email not verified",
        description: verificationError.message,
        variant: "destructive",
        duration: 6000,
      });

      return { error: verificationError };
    }

    // Success case - user is signed in and email is verified
    console.log("Sign in successful for:", data.user?.email);
    return { error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear all auth state
      setUser(null);
      setAuthUser(null);
      setSession(null);
      SessionManager.clearSession();

      // Show success message
      toast({
        title: "Signed Out Successfully",
        description: "You have been signed out. Redirecting to sign up page...",
        variant: "default",
      });

      // Redirect to auth page after a short delay
      setTimeout(() => {
        window.location.href = "/auth?mode=signup";
      }, 1000);
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Sign Out Error",
        description: "There was an error signing you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const testSupabaseConnection = async () => {
    if (isDev) {
      console.log("Testing Supabase connection...");
    }
    try {
      const { data, error } = await supabase.auth.getSession();
      if (isDev) {
        console.log("Supabase connection test:", { data, error });
      }

      return { success: !error, error };
    } catch (err) {
      console.error("Supabase connection test failed:", err);
      return { success: false, error: err };
    }
  };

  const signInWithGoogle = async () => {
    if (isDev) {
      console.log("Starting Google OAuth sign-in...");
      console.log("Current origin:", window.location.origin);
      console.log("Current URL:", window.location.href);
      console.log("Redirect URL:", `${getRedirectBaseUrl()}/auth/callback`);
    }

    try {
      storeAuthNext();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${getRedirectBaseUrl()}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Google OAuth error details:", {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack,
        });
        toast({
          title: "Google sign in failed",
          description: `Error: ${error.message}. Status: ${error.status}. Please check Supabase dashboard settings.`,
          variant: "destructive",
        });
      } else {
        if (isDev) {
          console.log("Google OAuth initiated successfully", data);
          if (data?.url) {
            console.log("OAuth URL:", data.url);
          }
        }
      }

      return { error };
    } catch (catchError) {
      console.error("Unexpected error in Google OAuth:", catchError);
      toast({
        title: "Unexpected error",
        description: "An unexpected error occurred during Google sign-in.",
        variant: "destructive",
      });
      return { error: catchError };
    }
  };

  const signInWithGitHub = async () => {
    if (isDev) {
      console.log("Starting GitHub OAuth sign-in...");
    }

    try {
      storeAuthNext();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${getRedirectBaseUrl()}/auth/callback`,
        },
      });

      if (error) {
        console.error("GitHub OAuth error details:", error);
        toast({
          title: "GitHub sign in failed",
          description: `Error: ${error.message}. Please check Supabase dashboard settings.`,
          variant: "destructive",
        });
      } else if (isDev) {
        console.log("GitHub OAuth initiated successfully", data);
      }

      return { error };
    } catch (catchError) {
      console.error("Unexpected error in GitHub OAuth:", catchError);
      toast({
        title: "Unexpected error",
        description: "An unexpected error occurred during GitHub sign-in.",
        variant: "destructive",
      });
      return { error: catchError };
    }
  };

  const signInWithTwitter = async () => {
    if (isDev) {
      console.log("Starting Twitter OAuth sign-in...");
    }

    try {
      storeAuthNext();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "twitter",
        options: {
          redirectTo: `${getRedirectBaseUrl()}/auth/callback`,
        },
      });

      if (error) {
        console.error("Twitter OAuth error details:", error);
        toast({
          title: "Twitter sign in failed",
          description: `Error: ${error.message}. Please check Supabase dashboard settings.`,
          variant: "destructive",
        });
      } else if (isDev) {
        console.log("Twitter OAuth initiated successfully", data);
      }

      return { error };
    } catch (catchError) {
      console.error("Unexpected error in Twitter OAuth:", catchError);
      toast({
        title: "Unexpected error",
        description: "An unexpected error occurred during Twitter sign-in.",
        variant: "destructive",
      });
      return { error: catchError };
    }
  };

  const resetPassword = async (email: string) => {
    if (!AuthUtils.isValidEmail(email)) {
      return { error: { message: "Please enter a valid email address." } };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getRedirectBaseUrl()}/auth/reset-password`,
    });

    if (error) {
      AuthNotifications.showPasswordResetError(error.message);
    } else {
      AuthNotifications.showPasswordResetEmailSent(email);
    }

    return { error };
  };

  const updatePassword = async (password: string) => {
    const passwordValidation = AuthUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      return {
        error: {
          message: `Password requirements not met: ${passwordValidation.errors.join(", ")}`,
        },
      };
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      AuthNotifications.showPasswordUpdateError(error.message);
    } else {
      AuthNotifications.showPasswordUpdated();
    }

    return { error };
  };

  const resendVerificationEmail = async (email: string) => {
    if (!AuthUtils.isValidEmail(email)) {
      return { error: { message: "Please enter a valid email address." } };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${getRedirectBaseUrl()}/auth/callback`,
        },
      });

      if (error) {
        toast({
          title: "Failed to resend verification email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Verification email sent!",
          description: "Please check your inbox for the verification link.",
          duration: 5000,
        });
      }

      return { error };
    } catch {
      const error = { message: "An unexpected error occurred." };
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    if (!user) {
      return { error: { message: "No user logged in" } };
    }

    try {
      // Update user metadata first
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: updates.firstName,
          last_name: updates.lastName,
          avatar_url: updates.avatarUrl,
        },
      });

      if (authError) {
        AuthNotifications.showProfileUpdateError(authError.message);
        return { error: authError };
      }

      // Update profiles table
      const profileUpdates: any = {};
      if (updates.firstName !== undefined) profileUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) profileUpdates.last_name = updates.lastName;
      if (updates.avatarUrl !== undefined) profileUpdates.avatar_url = updates.avatarUrl;
      if (updates.role !== undefined) profileUpdates.role = updates.role;

      const { error: dbError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", user.id);

      if (dbError) {
        console.error("Error updating profile in database:", dbError);
        AuthNotifications.showProfileUpdateError(dbError.message);
        return { error: dbError };
      }

      // Refresh session to get updated user data
      await refreshSession();

      AuthNotifications.showProfileUpdated();
      return { error: null };
    } catch (error: any) {
      console.error("Unexpected error updating profile:", error);
      AuthNotifications.showProfileUpdateError(error.message || "An unexpected error occurred");
      return { error };
    }
  };

  const hasPermission = async (
    requiredRole: "user" | "host" | "admin"
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Prefer cached profile role (fast path)
      const cached = await primeRoleCache(user.id);
      const resolvedRole = cached?.role || authUser?.role;
      if (!resolvedRole) return requiredRole === "user";
      if (cached?.is_suspended) return false;

      // Role hierarchy: admin > host > user
      const roleHierarchy: Record<string, number> = {
        user: 1,
        host: 2,
        admin: 3,
        super_admin: 4,
      };

      const userRoleValue = roleHierarchy[resolvedRole] || 1;
      const requiredRoleValue = roleHierarchy[requiredRole] || 1;

      return userRoleValue >= requiredRoleValue;
    } catch (error) {
      console.error("Error in hasPermission:", error);
      // Default to auth metadata role if present, otherwise user
      if (authUser?.role) {
        const roleHierarchy: Record<string, number> = {
          user: 1,
          host: 2,
          admin: 3,
          super_admin: 4,
        };
        const userRoleValue = roleHierarchy[authUser.role] || 1;
        const requiredRoleValue = roleHierarchy[requiredRole] || 1;
        return userRoleValue >= requiredRoleValue;
      }
      return requiredRole === "user";
    }
  };

  const refreshSession = async () => {
    try {
      const {
        data: { session: newSession },
        error,
      } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Error refreshing session:", error);
        return;
      }

      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        const validatedUser = AuthUtils.validateSession(newSession);
        setAuthUser(validatedUser);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  };

  const value = {
    user,
    authUser,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithGitHub,
    signInWithTwitter,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
    updateProfile,
    hasPermission,
    refreshSession,
    testSupabaseConnection,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
