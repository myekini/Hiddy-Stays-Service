"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  Plus,
  Home,
  Calendar,
  DollarSign,
  Star,
  Eye,
  Edit,
  MoreHorizontal,
  MapPin,
  Bed,
  Bath,
  MessageSquare,
  Settings,
  AlertCircle,
  BarChart3,
  ArrowUpRight,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PropertyForm } from "@/components/PropertyForm";
import { CalendarManagement } from "@/components/CalendarManagement";
import { BookingManagement } from "@/components/BookingManagement";
import { supabase } from "@/integrations/supabase/client";
import BackButton from "@/components/ui/BackButton";
import DashboardLoading from "@/components/ui/DashboardLoading";

const HostAnalyticsDashboard = dynamic(
  () => import("@/components/HostAnalyticsDashboard").then((m) => m.HostAnalyticsDashboard),
  { ssr: false }
);

interface Property {
  id: string;
  title: string;
  address: string;
  price_per_night: number;
  bedrooms: number;
  bathrooms: number;
  images: string[];
  is_active: boolean;
  rating: number;
  review_count: number;
  booking_count: number;
  revenue: number;
  occupancy_rate: number;
}

interface Booking {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  check_in?: string;
  check_out?: string;
  check_in_date?: string;
  check_out_date?: string;
  total_amount: number;
  status: "confirmed" | "pending" | "cancelled";
  created_at: string;
  property?: {
    title?: string;
  };
  property_title?: string;
}

function HostDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    total_properties: 0,
    active_bookings: 0,
    monthly_revenue: 0,
    avg_rating: 0,
  });
  const [loading, setLoading] = useState(true);
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => {
    const initial = tabParam || "overview";
    return initial === "overview" || initial === "properties" || initial === "bookings" || initial === "analytics"
      ? initial
      : "overview";
  });
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [hostProfileId, setHostProfileId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  const formatDateSafe = (value: string | null | undefined) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getBookingDates = (booking: Booking) => {
    return {
      checkIn: booking.check_in || booking.check_in_date,
      checkOut: booking.check_out || booking.check_out_date,
    };
  };

  const getBookingPropertyTitle = (booking: Booking) => {
    return booking.property_title || booking.property?.title || "—";
  };

  const getInitials = (name: string | null | undefined) => {
    const safe = (name || "").trim();
    if (!safe) return "?";
    const parts = safe.split(/\s+/).filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
    return initials || "?";
  };

  const recentBookingsTop = useMemo(() => recentBookings.slice(0, 3), [recentBookings]);

  useEffect(() => {
    const next = tabParam || "overview";
    const normalized =
      next === "overview" || next === "properties" || next === "bookings" || next === "analytics"
        ? next
        : "overview";
    setActiveTab((prev) => (prev === normalized ? prev : normalized));
  }, [tabParam]);

  useEffect(() => {
    const handlePopState = () => {
      const next = new URLSearchParams(window.location.search).get("tab") || "overview";
      const normalized =
        next === "overview" || next === "properties" || next === "bookings" || next === "analytics"
          ? next
          : "overview";
      setActiveTab((prev) => (prev === normalized ? prev : normalized));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToTab = (tab: "overview" | "properties" | "bookings" | "analytics") => {
    setActiveTab(tab);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  const getAccessToken = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Consolidated refresh function for properties and stats
  const refreshDashboardData = async (skipLoading = false) => {
    if (!skipLoading) setLoading(true);
    try {
      if (!user?.id) return;

      // Resolve host profile ID
      let hostIdParam = hostProfileId;
      if (!hostIdParam) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (profile?.id) {
          hostIdParam = profile.id as string;
          setHostProfileId(profile.id as string);
        }
      }

      if (!hostIdParam) return;

      const token = await getAccessToken();
      console.log("[HostDashboard] Loading bookings with hostId:", hostIdParam);
      console.log("[HostDashboard] Has auth token:", !!token);
      
      const bookingsRequest = token
        ? fetch(`/api/bookings?host_id=${hostIdParam}&limit=5`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })
        : null;

      const [propertiesResponse, statsResponse, bookingsResponse] = await Promise.all([
        fetch(`/api/host/properties?host_id=${hostIdParam}`),
        fetch(`/api/host/stats?host_id=${hostIdParam}`),
        bookingsRequest,
      ]);

      if (propertiesResponse?.ok) {
        const propertiesData = await propertiesResponse.json();
        setProperties(propertiesData.properties || []);
      }

      if (statsResponse?.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (bookingsResponse) {
        console.log("[HostDashboard] Bookings response status:", bookingsResponse.status);
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json();
          console.log("[HostDashboard] Bookings data:", bookingsData);
          console.log("[HostDashboard] Bookings count:", bookingsData.bookings?.length || 0);
          setRecentBookings(bookingsData.bookings || []);
        } else {
          const errorData = await bookingsResponse.json().catch(() => ({}));
          console.error("[HostDashboard] Bookings API error:", errorData);
        }
      } else {
        console.warn("[HostDashboard] No bookings request made (missing token)");
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to refresh dashboard data",
        variant: "destructive",
      });
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  // Load real data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        if (!user?.id) return;

        // Resolve host profile ID (profiles.id) from auth user.id once
        let hostIdParam = hostProfileId;
        if (!hostIdParam) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();
          if (profile?.id) {
            hostIdParam = profile.id as string;
            setHostProfileId(profile.id as string);
          } else {
            toast({
              title: "Profile Error",
              description: "Unable to load your profile. Please refresh or sign out and sign in again.",
              variant: "destructive",
            });
            return;
          }
        }

        const token = await getAccessToken();
        console.log("[HostDashboard useEffect] Loading bookings with hostId:", hostIdParam);
        console.log("[HostDashboard useEffect] Has auth token:", !!token);
        
        const bookingsRequest = token
          ? fetch(`/api/bookings?host_id=${hostIdParam}&limit=5`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            })
          : null;

        const [propertiesResponse, statsResponse, bookingsResponse] = await Promise.all([
          fetch(`/api/host/properties?host_id=${hostIdParam}`),
          fetch(`/api/host/stats?host_id=${hostIdParam}`),
          bookingsRequest,
        ]);

        if (propertiesResponse?.ok) {
          const propertiesData = await propertiesResponse.json();
          setProperties(propertiesData.properties || []);
        }

        if (statsResponse?.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        if (bookingsResponse) {
          console.log("[HostDashboard useEffect] Bookings response status:", bookingsResponse.status);
          if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            console.log("[HostDashboard useEffect] Bookings data:", bookingsData);
            console.log("[HostDashboard useEffect] Bookings count:", bookingsData.bookings?.length || 0);
            setRecentBookings(bookingsData.bookings || []);
          } else {
            const errorData = await bookingsResponse.json().catch(() => ({}));
            console.error("[HostDashboard useEffect] Bookings API error:", errorData);
          }
        } else {
          console.warn("[HostDashboard useEffect] No bookings request made (missing token)");
        }
      } catch {
        toast({
          title: "Error",
          description:
            "Failed to load dashboard data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id, toast, hostProfileId]);

  const handleDeleteProperty = async () => {
    if (!propertyToDelete) return;

    try {
      // Get auth token from Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(`/api/properties/${propertyToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Success! 🎉",
          description: "Property deleted successfully",
        });
        setShowDeleteDialog(false);
        setPropertyToDelete(null);
        // Refresh dashboard data
        refreshDashboardData(true);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete property");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete property",
        variant: "destructive",
      });
    }
  };

  const showSkeletons = loading;

  if (loading && properties.length === 0 && recentBookings.length === 0) {
    return (
      <DashboardLoading
        title="Loading Host Dashboard"
        description="Loading your properties and bookings..."
        icon={<Home className="w-6 h-6" />}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <BackButton to="/" className="mb-2 -ml-2">
              Back to Home
            </BackButton>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Host Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your properties and bookings</p>
              </div>
            </div>
          </div>
        </div>



        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => navigateToTab(v as "overview" | "properties" | "bookings" | "analytics")} className="w-full">
          <div className="flex items-center justify-start mb-6">
            <TabsList className="w-full sm:w-auto grid grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span className="hidden sm:inline">Properties</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Bookings</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Properties</p>
                      {showSkeletons ? (
                        <div className="mt-2 h-7 w-14 bg-muted rounded animate-pulse" />
                      ) : (
                        <p className="text-2xl font-semibold text-foreground">
                          {stats.total_properties}
                        </p>
                      )}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Home className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bookings</p>
                      {showSkeletons ? (
                        <div className="mt-2 h-7 w-14 bg-muted rounded animate-pulse" />
                      ) : (
                        <p className="text-2xl font-semibold text-foreground">
                          {stats.active_bookings}
                        </p>
                      )}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                      {showSkeletons ? (
                        <div className="mt-2 h-7 w-24 bg-muted rounded animate-pulse" />
                      ) : (
                        <p className="text-2xl font-semibold text-foreground">
                          ${stats.monthly_revenue.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Rating</p>
                      {showSkeletons ? (
                        <div className="mt-2 h-7 w-14 bg-muted rounded animate-pulse" />
                      ) : (
                        <p className="text-2xl font-semibold text-foreground">
                          {stats.avg_rating}
                        </p>
                      )}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                      <Star className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Properties Section */}
            <Card className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Properties</CardTitle>
                    <CardDescription>
                      Manage and monitor your property listings
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToTab("properties")}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View All
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedProperty(null);
                        setShowPropertyForm(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Property
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showSkeletons ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-40 rounded-2xl bg-muted/70 animate-pulse" />
                    ))}
                  </div>
                ) : properties.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Home className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No properties yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                      Start hosting by adding your first property. It only takes a few minutes.
                    </p>
                    <Button
                      onClick={() => {
                        setSelectedProperty(null);
                        setShowPropertyForm(true);
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Property
                    </Button>
                  </div>
                ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {properties.map((property) => (
                    <div key={property.id}>
                      <Card className="overflow-hidden border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 group bg-card">
                        <div className="flex">
                          {/* Property Image */}
                          <div className="w-24 h-24 sm:w-36 sm:h-36 flex-shrink-0 relative bg-muted">
                            <img
                              src={property.images?.[0] || '/assets/apartment_lobby_ss.jpg'}
                              alt={property.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=400&fit=crop';
                              }}
                            />
                            <div className="absolute top-3 left-3">
                              <Badge
                                variant="secondary"
                                className={`text-xs font-medium px-2 py-1 ${
                                  property.is_active 
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50" 
                                    : "bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                {property.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>

                          {/* Property Details */}
                          <div className="flex-1 p-4 sm:p-6">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-medium text-foreground text-lg line-clamp-1">
                                {property.title}
                              </h3>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <a href={`/property/${property.id}`} target="_blank" rel="noopener noreferrer">
                                      <Eye className="w-4 h-4 mr-2" />
                                      View on Site
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedProperty(property);
                                      setShowPropertyForm(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Property
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedProperty(property);
                                      setShowCalendar(true);
                                    }}
                                  >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Manage Calendar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setPropertyToDelete(property);
                                      setShowDeleteDialog(true);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Delete Property
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                              <MapPin className="w-4 h-4" />
                              <span className="line-clamp-1">{property.address}</span>
                            </div>

                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Bed className="w-4 h-4" />
                                  <span className="font-medium">{property.bedrooms}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Bath className="w-4 h-4" />
                                  <span className="font-medium">{property.bathrooms}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-foreground text-lg">
                                  ${property.price_per_night}<span className="text-sm font-normal text-muted-foreground">/night</span>
                                </p>
                              </div>
                            </div>

                            {/* Performance Metrics */}
                            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-border/50">
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                  <span className="text-sm font-semibold text-foreground">
                                    {property.rating || 0}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {property.review_count || 0} reviews
                                </p>
                              </div>

                              <div className="text-center">
                                <div className="text-sm font-semibold text-foreground mb-1">
                                  {property.occupancy_rate || 0}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Occupancy
                                </p>
                              </div>

                              <div className="text-center">
                                <div className="text-sm font-semibold text-foreground mb-1">
                                  ${(property.revenue || 0).toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Revenue
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Bookings Section */}
            <Card className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Bookings</CardTitle>
                    <CardDescription>
                      Latest booking requests and confirmations
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigateToTab("bookings")}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showSkeletons ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-28 rounded-2xl bg-muted/70 animate-pulse" />
                    ))}
                  </div>
                ) : recentBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No recent bookings</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                      Your recent booking activity will appear here once guests start making reservations.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentBookingsTop.map((booking) => (
                      <div key={booking.id}>
                        <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 bg-card">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-foreground">
                                  {getInitials(booking.guest_name)}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="font-semibold text-foreground truncate">
                                        {booking.guest_name}
                                      </p>
                                      <p className="text-sm text-muted-foreground truncate">
                                        {getBookingPropertyTitle(booking)}
                                      </p>
                                    </div>

                                    <Badge
                                      variant="secondary"
                                      className={`text-xs font-medium px-2.5 py-1 ${
                                        booking.status === "confirmed"
                                          ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50"
                                          : booking.status === "pending"
                                            ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50"
                                            : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50"
                                      }`}
                                    >
                                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </Badge>
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-muted-foreground" />
                                      <span className="whitespace-nowrap">
                                        {formatDateSafe(getBookingDates(booking).checkIn)}
                                      </span>
                                      <span className="text-muted-foreground">→</span>
                                      <span className="whitespace-nowrap">
                                        {formatDateSafe(getBookingDates(booking).checkOut)}
                                      </span>
                                    </div>
                                    <span className="hidden sm:inline text-muted-foreground/50">•</span>
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                                      <span className="font-semibold text-foreground">
                                        ${booking.total_amount.toLocaleString()}
                                      </span>
                                      <span className="text-muted-foreground">total</span>
                                    </div>
                                    <span className="hidden sm:inline text-muted-foreground/50">•</span>
                                    <div className="text-xs text-muted-foreground">
                                      {formatDateSafe(booking.created_at)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="hidden sm:inline-flex text-muted-foreground hover:text-foreground hover:bg-muted"
                                >
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Contact
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="sm:hidden text-muted-foreground hover:text-foreground hover:bg-muted"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-foreground hover:bg-muted"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <a href={`/property/${booking.property_id}`} target="_blank" rel="noopener noreferrer">
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Property
                                      </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigateToTab("bookings")}>
                                      <Settings className="w-4 h-4 mr-2" />
                                      Manage Bookings
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="mt-6">
            <Card className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Properties</CardTitle>
                    <CardDescription>
                      Manage all your property listings
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedProperty(null);
                      setShowPropertyForm(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Property
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <div key={property.id}>
                      <Card className="overflow-hidden">
                        <div className="relative">
                          <img
                            src={property.images?.[0] || '/placeholder.svg'}
                            alt={property.title}
                            className="w-full h-48 object-cover"
                          />
                          <div className="absolute top-3 left-3">
                            <Badge
                              variant={
                                property.is_active ? "default" : "secondary"
                              }
                              className={
                                property.is_active ? "bg-primary" : ""
                              }
                            >
                              {property.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>

                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground mb-2">
                            {property.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {property.address}
                          </p>

                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Bed className="w-4 h-4" />
                                <span>{property.bedrooms}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Bath className="w-4 h-4" />
                                <span>{property.bathrooms}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-foreground">
                                ${property.price_per_night}/night
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedProperty(property);
                                setShowPropertyForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProperty(property);
                                setShowCalendar(true);
                              }}
                            >
                              <Calendar className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="mt-6">
            {hostProfileId ? (
              <BookingManagement 
                hostId={hostProfileId}
                onBookingUpdate={() => refreshDashboardData(true)}
              />
            ) : (
              <div className="min-h-[400px]">
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-muted/70 animate-pulse" />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            {activeTab === "analytics" ? (
              hostProfileId ? (
                <HostAnalyticsDashboard hostId={hostProfileId} />
              ) : (
                <div className="h-40 rounded-2xl bg-muted/70 animate-pulse" />
              )
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      {/* Property Form Modal */}
      <PropertyForm
        property={selectedProperty}
        isOpen={showPropertyForm}
        onClose={() => {
          setShowPropertyForm(false);
          setSelectedProperty(null);
        }}
        onSuccess={() => {
          // Refresh dashboard data
          refreshDashboardData(true);
        }}
      />

      {/* Calendar Management Modal */}
      {selectedProperty && (
        <CalendarManagement
          propertyId={selectedProperty.id}
          isOpen={showCalendar}
          onClose={() => {
            setShowCalendar(false);
            setSelectedProperty(null);
          }}
        />
      )}

      {/* Delete Property Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{propertyToDelete?.title}"? This action cannot be undone and will remove all associated bookings and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProperty}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Property
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const HostDashboardWithErrorBoundary = () => (
  <ErrorBoundary>
    <ProtectedRoute requiredRole="host" fallbackPath="/auth?mode=signin&next=/host-dashboard">
      <HostDashboard />
    </ProtectedRoute>
  </ErrorBoundary>
);

export default HostDashboardWithErrorBoundary;
