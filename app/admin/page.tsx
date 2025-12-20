"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import BackButton from "@/components/ui/BackButton";
import DashboardLoading from "@/components/ui/DashboardLoading";
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

function AdminDashboardContent() {
  const { user, authUser, loading: authLoading, hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => {
    const initial = tabParam || "users";
    return initial === "users" || initial === "properties" || initial === "bookings" ? initial : "users";
  });

  useEffect(() => {
    const next = tabParam || "users";
    const normalized = next === "users" || next === "properties" || next === "bookings" ? next : "users";
    setActiveTab((prev) => (prev === normalized ? prev : normalized));
  }, [tabParam]);

  useEffect(() => {
    const handlePopState = () => {
      const next = new URLSearchParams(window.location.search).get("tab") || "users";
      const normalized = next === "users" || next === "properties" || next === "bookings" ? next : "users";
      setActiveTab((prev) => (prev === normalized ? prev : normalized));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToTab = (tab: string) => {
    const normalized = tab === "users" || tab === "properties" || tab === "bookings" ? tab : "users";
    setActiveTab(normalized);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", normalized);
    window.history.replaceState({}, "", url.toString());
  };

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
      <DashboardLoading
        title="Loading Admin Dashboard"
        description="Verifying permissions..."
        icon={<Shield className="w-6 h-6" />}
      />
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Card className="w-full max-w-lg p-8 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Admin access required</h2>
              <p className="text-sm text-muted-foreground">
                Your account doesn’t have admin permissions.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              Signed in as: <span className="font-medium text-foreground">{user?.email}</span>
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
              <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
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

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <DashboardLoading
          title="Loading Admin Dashboard"
          description="Loading..."
          icon={<Shield className="w-6 h-6" />}
        />
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
