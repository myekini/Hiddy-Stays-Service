"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  Mail,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import LogoImage from "@/components/LogoImage";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast({
          title: "Password reset failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setIsEmailSent(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (!error) {
        toast({
          title: "Email sent again",
          description: "Check your email for the password reset link.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          <p className="text-foreground font-medium">Reset your password</p>
          <p className="text-muted-foreground text-sm mt-1">
            We'll help you get back on track
          </p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-sm border border-border/50 bg-card/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-foreground">
              {isEmailSent ? "Check Your Email" : "Reset Your Password"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isEmailSent
                ? "We've sent you a password reset link"
                : "No worries! Enter your email and we'll send you a reset link"}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {isEmailSent ? (
              <div className="space-y-6">
                {/* Success State */}
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-brand-50 dark:bg-brand-950/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Email Sent Successfully!
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    We've sent a password reset link to{" "}
                    <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-muted/40 border border-border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-foreground">
                      <p className="font-medium mb-1">Next Steps:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Check your email inbox</li>
                        <li>• Look for an email from HiddyStays</li>
                        <li>• Click the reset link in the email</li>
                        <li>• Create your new password</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={handleResendEmail}
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Resend Email"
                    )}
                  </Button>

                  <Link href="/auth">
                    <Button
                      variant="ghost"
                      className="w-full text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/30"
                    >
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="brand"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            )}

            {/* Footer */}
            <div className="text-center mt-6 text-muted-foreground text-sm">
              Remember your password?{" "}
              <Link
                href="/auth"
                className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 underline"
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
