"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import BackButton from "@/components/ui/BackButton";
import {
  Calendar,
  Shield,
  UserCheck,
  Building,
} from "lucide-react";

// Import admin components
import AdminUserManagement from "@/components/AdminUserManagement";
import AdminPropertyManagement from "@/components/AdminPropertyManagement";
import AdminBookingManagement from "@/components/AdminBookingManagement";

export default function AdminDashboard() {
  const { user, authUser, loading: authLoading, hasPermission } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    // Check if user has admin permission
    const checkPermission = async () => {
      if (authLoading) return;

      if (!user) {
        router.replace("/auth?mode=signin&next=/admin");
        return;
      }

      const isAdmin = await hasPermission("admin");
      if (!isAdmin) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    checkPermission();
  }, [authLoading, user, authUser, router, hasPermission]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Card className="w-full max-w-md p-8 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/70 dark:border-slate-800/70 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Loading Admin Dashboard</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Verifying your account permissions.
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
        </Card>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Card className="w-full max-w-lg p-8 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/70 dark:border-slate-800/70 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Admin access required</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your account doesn’t have admin permissions.
              </p>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Signed in as: <span className="font-medium text-slate-900 dark:text-white">{user?.email}</span>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full h-12 text-base">
                <a href="mailto:support@hiddystays.com?subject=Admin%20access%20request">Request admin access</a>
              </Button>
              <Button variant="outline" asChild className="w-full h-12 text-base">
                <Link href="/">Go back home</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <BackButton to="/" className="mb-2 -ml-2">
              Back to Home
            </BackButton>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
                <p className="text-sm text-muted-foreground">Platform management</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-start">
            <TabsList className="w-full sm:w-auto grid grid-cols-3">
              <TabsTrigger value="users" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Users
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Properties
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Bookings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="mt-6">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="properties" className="mt-6">
            <AdminPropertyManagement />
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            <AdminBookingManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
