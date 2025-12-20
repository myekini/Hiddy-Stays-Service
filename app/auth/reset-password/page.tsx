"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import LogoImage from "@/components/LogoImage";
import AuthUtils from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import AuthNotifications from "@/lib/auth-notifications";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updatePassword } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Check if we have the necessary tokens/parameters
  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    // For Supabase password reset, we need to check if we have a session
    // The tokens are handled by Supabase automatically
    if (!accessToken && !refreshToken) {
      // Check if we have a valid session instead
      const checkSession = async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            AuthNotifications.showInvalidResetLink();
            router.push("/auth/forgot-password");
          }
        } catch (error) {
          console.error("Error checking session:", error);
          AuthNotifications.showInvalidResetLink();
          router.push("/auth/forgot-password");
        }
      };

      checkSession();
    }
  }, [searchParams, router, toast]);

  const validatePassword = (pwd: string) => {
    const validation = AuthUtils.validatePassword(pwd);
    setPasswordErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      AuthNotifications.showPasswordMismatch();
      return;
    }

    if (!validatePassword(password)) {
      AuthNotifications.showPasswordRequirementsNotMet(passwordErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        AuthNotifications.showPasswordUpdateError(error.message);
      } else {
        setIsSuccess(true);
        AuthNotifications.showPasswordUpdated();
        // Redirect to sign in after 3 seconds
        setTimeout(() => {
          router.push("/auth");
        }, 3000);
      }
    } catch (error) {
      AuthNotifications.showNetworkError();
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-sm border border-border/50 bg-card/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
            <CardContent className="px-6 py-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-brand-50 dark:bg-brand-950/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Password Updated!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Your password has been successfully updated. You can now sign
                  in with your new password.
                </p>
                <div className="space-y-3">
                  <Link href="/auth">
                    <Button variant="brand" className="w-full">
                      Sign In Now
                    </Button>
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Redirecting automatically in 3 seconds...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/auth"
          className="inline-flex items-center text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Sign In
        </Link>

        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-card rounded-lg shadow-sm mb-4 border border-border/50">
            <LogoImage size="lg" />
          </div>
          <p className="text-foreground font-medium">Create New Password</p>
          <p className="text-muted-foreground text-sm mt-1">
            Almost there! Choose a strong password
          </p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-sm border border-border/50 bg-card/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-foreground">
              Set New Password
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your new password below
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      validatePassword(e.target.value);
                    }}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-foreground">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              {passwordErrors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-destructive">
                      <p className="font-medium mb-1">Password Requirements:</p>
                      <ul className="space-y-1 text-destructive/90">
                        {passwordErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={isLoading || passwordErrors.length > 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="text-center mt-6 text-muted-foreground text-sm">
              Remember your password?{" "}
              <Link
                href="/auth"
                className="text-primary hover:text-primary/80 underline"
              >
                Sign in instead
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-400/10 dark:to-purple-400/10 flex items-center justify-center ring-1 ring-blue-500/20 dark:ring-blue-400/20 mx-auto mb-4">
              <LogoImage variant="icon" size="md" />
            </div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
