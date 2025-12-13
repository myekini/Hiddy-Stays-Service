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
  Loader2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-sm border">
            <CardContent className="px-6 py-8">
              <div className="text-center">
<div className="mx-auto w-16 h-16 bg-brand-50 dark:bg-brand-950/30 rounded-full flex items-center justify-center mb-4">
<CheckCircle className="h-8 w-8 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Password Updated!
                </h2>
                <p className="text-gray-600 mb-6">
                  Your password has been successfully updated. You can now sign
                  in with your new password.
                </p>
                <div className="space-y-3">
<Link href="/auth">
                    <Button variant="brand" className="w-full">
                      Sign In Now
                    </Button>
                  </Link>
                  <p className="text-sm text-gray-500">
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/auth"
className="inline-flex items-center text-brand-600 hover:text-brand-700 mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Sign In
        </Link>

        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white dark:bg-card rounded-lg shadow-sm mb-4">
            <LogoImage size="lg" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Create New Password</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Almost there! Choose a strong password
          </p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-sm border">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-gray-800">
              Set New Password
            </CardTitle>
            <CardDescription className="text-gray-600">
              Enter your new password below
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
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
                <Label htmlFor="confirm-password" className="text-gray-700">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium mb-1">Password Requirements:</p>
                      <ul className="space-y-1 text-red-700">
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
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
            <div className="text-center mt-6 text-gray-500 text-sm">
              Remember your password?{" "}
              <Link
                href="/auth"
                className="text-blue-600 hover:text-blue-700 underline"
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
