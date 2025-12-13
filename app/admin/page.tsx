"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Home,
  DollarSign,
  Calendar,
  TrendingUp,
  Shield,
  Mail,
  Settings,
  BarChart3,
  UserCheck,
  Building,
} from "lucide-react";

// Import admin components
import AdminUserManagement from "@/components/AdminUserManagement";
import AdminPropertyManagement from "@/components/AdminPropertyManagement";
import AdminBookingManagement from "@/components/AdminBookingManagement";
import PlatformAnalytics from "@/components/PlatformAnalytics";

export default function AdminDashboard() {
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<any>({
    users: { total: 0, verified: 0, byRole: { user: 0, host: 0, admin: 0 } },
    properties: { total: 0, active: 0, inactive: 0 },
    bookings: {
      total: 0,
      byStatus: { pending: 0, confirmed: 0, cancelled: 0 },
    },
    revenue: { total: 0, thisMonth: 0 },
  });

  // Fetch admin stats from API
  const fetchAdminStats = async () => {
    try {
      // Get the session token from Supabase
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        console.error("No auth token available");
        return;
      }

      const response = await fetch("/api/admin/stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        console.log("✅ Admin stats loaded:", data);
      } else {
        console.error("❌ Failed to fetch admin stats:", response.statusText);
      }
    } catch (error) {
      console.error("❌ Error fetching admin stats:", error);
    }
  };

  useEffect(() => {
    // Check if user has admin permission
    const checkPermission = async () => {
      if (!user) {
        router.push("/auth");
        return;
      }

      const isAdmin = await hasPermission("admin");
      if (!isAdmin) {
        router.push("/");
        return;
      }

      setLoading(false);
      // Fetch stats after permission check
      fetchAdminStats();
    };

    checkPermission();
  }, [user, router, hasPermission]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground">
            Platform management and analytics
          </p>
        </div>

        {/* Stats Grid - Only show on overview tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-blue-600" />
                <Badge>Total</Badge>
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {stats.users?.total || 0}
              </h3>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <div className="mt-2 text-xs text-muted-foreground">
                Verified: {stats.users?.verified || 0} | Hosts:{" "}
                {stats.users?.byRole?.host || 0}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Home className="w-8 h-8 text-green-600" />
                <Badge variant="secondary">Active</Badge>
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {stats.properties?.active || 0}
              </h3>
              <p className="text-sm text-muted-foreground">Active Properties</p>
              <div className="mt-2 text-xs text-muted-foreground">
                Total: {stats.properties?.total || 0} | Inactive:{" "}
                {stats.properties?.inactive || 0}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-8 h-8 text-purple-600" />
                <Badge variant="outline">All Time</Badge>
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {stats.bookings?.total || 0}
              </h3>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <div className="mt-2 text-xs text-muted-foreground">
                Confirmed: {stats.bookings?.byStatus?.confirmed || 0} | Pending:{" "}
                {stats.bookings?.byStatus?.pending || 0}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8 text-orange-600" />
                <Badge variant="destructive">Revenue</Badge>
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                ${(stats.revenue?.total || 0).toLocaleString()}
              </h3>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <div className="mt-2 text-xs text-muted-foreground">
                This Month: ${(stats.revenue?.thisMonth || 0).toLocaleString()}
              </div>
            </Card>
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
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
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setActiveTab("users")}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    User Management
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage users, roles, and permissions
                </p>
                <Button variant="outline" className="w-full">
                  Manage Users
                </Button>
              </Card>

              <Card
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setActiveTab("properties")}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Home className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    Property Management
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Review and manage property listings
                </p>
                <Button variant="outline" className="w-full">
                  Manage Properties
                </Button>
              </Card>

              <Card
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setActiveTab("bookings")}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    Booking Management
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  View and manage all bookings
                </p>
                <Button variant="outline" className="w-full">
                  Manage Bookings
                </Button>
              </Card>

              <Card
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setActiveTab("analytics")}
              >
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    Platform Analytics
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  View comprehensive platform analytics
                </p>
                <Button variant="outline" className="w-full">
                  View Analytics
                </Button>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    Email System
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage email templates and campaigns
                </p>
                <Button variant="outline" className="w-full" disabled>
                  Coming Soon
                </Button>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    Platform Settings
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure platform settings and fees
                </p>
                <Button variant="outline" className="w-full" disabled>
                  Coming Soon
                </Button>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="properties" className="mt-6">
            <AdminPropertyManagement />
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            <AdminBookingManagement />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <PlatformAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
