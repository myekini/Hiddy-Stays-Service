"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  Plus,
  Home,
  Calendar,
  DollarSign,
  Users,
  User,
  Star,
  TrendingUp,
  Eye,
  Edit,
  MoreHorizontal,
  MapPin,
  Bed,
  Bath,
  Clock,
  MessageSquare,
  Settings,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PropertyForm } from "@/components/PropertyForm";
import { CalendarManagement } from "@/components/CalendarManagement";
import { BookingManagement } from "@/components/BookingManagement";
import { HostAnalyticsDashboard } from "@/components/HostAnalyticsDashboard";
import { supabase } from "@/integrations/supabase/client";

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
  property_title: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  total_amount: number;
  status: "confirmed" | "pending" | "cancelled";
  created_at: string;
}

function HostDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    total_properties: 0,
    active_bookings: 0,
    monthly_revenue: 0,
    avg_rating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [hostProfileId, setHostProfileId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

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

      // Refresh properties with metrics
      const propertiesResponse = await fetch(`/api/host/properties?host_id=${hostIdParam}`);
      if (propertiesResponse.ok) {
        const propertiesData = await propertiesResponse.json();
        setProperties(propertiesData.properties || []);
      }

      // Refresh stats
      const statsResponse = await fetch(`/api/host/stats?host_id=${hostIdParam}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Refresh recent bookings
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const bookingsResponse = await fetch(
          `/api/bookings?host_id=${hostIdParam}&limit=5`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json();
          setRecentBookings(bookingsData.bookings || []);
        }
      }
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
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
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();
          if (profile?.id) {
            hostIdParam = profile.id as string;
            setHostProfileId(profile.id as string);
          } else {
            console.error("No profile found for user:", user.id, profileError);

            // Attempt to auto-create missing profile (same pattern as middleware.ts)
            const { error: createError } = await supabase.rpc(
              "create_missing_profile",
              {
                user_uuid: user.id,
              }
            );

            if (createError) {
              console.error("Error creating missing profile:", createError);
              toast({
                title: "Profile Error",
                description: "Unable to create your profile. Please sign out and sign in again.",
                variant: "destructive",
              });
              return;
            }

            const { data: newProfile, error: newProfileError } = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", user.id)
              .single();

            if (!newProfile?.id) {
              console.error("Failed to fetch newly created profile:", newProfileError);
              toast({
                title: "Profile Error",
                description: "Profile was created but could not be loaded. Please refresh the page.",
                variant: "destructive",
              });
              return;
            }

            hostIdParam = newProfile.id as string;
            setHostProfileId(newProfile.id as string);
          }
        }

        // Load properties for this host only (using host-specific API)
        console.log("Loading properties for host ID:", hostIdParam);
        const propertiesResponse = await fetch(`/api/host/properties?host_id=${hostIdParam}`);
        if (propertiesResponse.ok) {
          const propertiesData = await propertiesResponse.json();
          console.log("Properties response:", propertiesData);
          // Host API already returns properties with all required metrics
          setProperties(propertiesData.properties || []);
        } else {
          console.error("Failed to load properties:", await propertiesResponse.text());
        }

        // Load bookings with authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const bookingsResponse = await fetch(
            `/api/bookings?host_id=${hostIdParam}&limit=5`,
            {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            setRecentBookings(bookingsData.bookings || []);
          } else {
            console.error("Failed to load bookings:", await bookingsResponse.text());
          }
        }

        // Load stats
        const statsResponse = await fetch(`/api/host/stats?host_id=${hostIdParam}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
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
      console.error("Error deleting property:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete property",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">
                Host Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.user_metadata?.first_name || "Host"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveTab("bookings")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Bookings
              </Button>
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
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Home className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Properties</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.total_properties}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Bookings</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.active_bookings}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${stats.monthly_revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rating</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.avg_rating}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monte-styled Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200">
            <TabsList className="grid w-full grid-cols-4 bg-transparent h-12 p-1">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 font-medium rounded-xl transition-all duration-200"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="properties" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 font-medium rounded-xl transition-all duration-200"
              >
                Properties
              </TabsTrigger>
              <TabsTrigger 
                value="bookings" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 font-medium rounded-xl transition-all duration-200"
              >
                Bookings
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 font-medium rounded-xl transition-all duration-200"
              >
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-12">
            {/* Properties Section */}
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="pb-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-light text-slate-900 tracking-tight">Your Properties</CardTitle>
                    <CardDescription className="text-slate-600 font-light">
                      Manage and monitor your property listings with ease
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("properties")}
                    className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Home className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No properties yet</h3>
                    <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                      Start hosting by adding your first property. It only takes a few minutes.
                    </p>
                    <Button
                      onClick={() => {
                        setSelectedProperty(null);
                        setShowPropertyForm(true);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Property
                    </Button>
                  </div>
                ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {properties.map((property, index) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <Card className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group bg-white">
                        <div className="flex">
                          {/* Property Image */}
                          <div className="w-36 h-36 flex-shrink-0 relative bg-slate-50">
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
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {property.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>

                          {/* Property Details */}
                          <div className="flex-1 p-6">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-medium text-slate-900 text-lg line-clamp-1 group-hover:text-slate-800">
                                {property.title}
                              </h3>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
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

                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                              <MapPin className="w-4 h-4" />
                              <span className="line-clamp-1">{property.address}</span>
                            </div>

                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-6 text-sm text-slate-600">
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
                                <p className="font-semibold text-slate-900 text-lg">
                                  ${property.price_per_night}<span className="text-sm font-normal text-slate-500">/night</span>
                                </p>
                              </div>
                            </div>

                            {/* Performance Metrics */}
                            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                  <span className="text-sm font-semibold text-slate-900">
                                    {property.rating || 0}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                  {property.review_count || 0} reviews
                                </p>
                              </div>

                              <div className="text-center">
                                <div className="text-sm font-semibold text-slate-900 mb-1">
                                  {property.occupancy_rate || 0}%
                                </div>
                                <p className="text-xs text-slate-500">
                                  Occupancy
                                </p>
                              </div>

                              <div className="text-center">
                                <div className="text-sm font-semibold text-slate-900 mb-1">
                                  ${(property.revenue || 0).toLocaleString()}
                                </div>
                                <p className="text-xs text-slate-500">
                                  Revenue
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Bookings Section */}
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="pb-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-light text-slate-900 tracking-tight">Recent Bookings</CardTitle>
                    <CardDescription className="text-slate-600 font-light">
                      Latest booking requests and confirmations from your guests
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab("bookings")}
                    className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No recent bookings</h3>
                    <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                      Your recent booking activity will appear here once guests start making reservations.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentBookings.map((booking, index) => (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                      >
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group bg-slate-50/50 hover:bg-white">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-slate-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-semibold text-slate-900 group-hover:text-slate-800">
                                        {booking.guest_name}
                                      </h3>
                                      <Badge
                                        variant="secondary"
                                        className={`text-xs font-medium px-3 py-1 ${
                                          booking.status === "confirmed"
                                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                            : booking.status === "pending"
                                              ? "bg-amber-100 text-amber-700 border-amber-200"
                                              : "bg-red-100 text-red-700 border-red-200"
                                        }`}
                                      >
                                        {booking.status === "confirmed" && (
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                        )}
                                        {booking.status === "pending" && (
                                          <Clock className="w-3 h-3 mr-1" />
                                        )}
                                        {booking.status === "cancelled" && (
                                          <AlertCircle className="w-3 h-3 mr-1" />
                                        )}
                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">
                                      {booking.guest_email}
                                    </p>
                                  </div>
                                </div>

                                <div className="bg-white rounded-lg p-4 border border-slate-100 mb-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Home className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium text-slate-900 text-sm">
                                      {booking.property_title}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                      <Calendar className="w-4 h-4" />
                                      <div>
                                        <p className="font-medium">Check-in</p>
                                        <p>{new Date(booking.check_in).toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                      <Calendar className="w-4 h-4" />
                                      <div>
                                        <p className="font-medium">Check-out</p>
                                        <p>{new Date(booking.check_out).toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-slate-400" />
                                    <span className="font-semibold text-slate-900 text-lg">
                                      ${booking.total_amount.toLocaleString()}
                                    </span>
                                    <span className="text-sm text-slate-500">total</span>
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {new Date(booking.created_at).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric'
                                    })}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 ml-6">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                >
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Contact
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
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
                                  <DropdownMenuItem
                                    onClick={() => setActiveTab("bookings")}
                                  >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Manage Bookings
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Properties</CardTitle>
                    <CardDescription>
                      Manage all your property listings
                    </CardDescription>
                  </div>
                  <Button
                    className="bg-primary hover:bg-primary/90"
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
                  {properties.map((property, index) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
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
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            {hostProfileId ? (
              <BookingManagement 
                hostId={hostProfileId}
                onBookingUpdate={() => refreshDashboardData(true)}
              />
            ) : (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading bookings...</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            {hostProfileId && <HostAnalyticsDashboard hostId={hostProfileId} />}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedProperty(null);
                  setShowPropertyForm(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Add Property
                      </p>
                      <p className="text-sm text-muted-foreground">
                        List new property
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  if (properties.length > 0) {
setSelectedProperty(properties[0]!);
                    setShowCalendar(true);
                  } else {
                    toast({
                      title: "No Properties",
                      description:
                        "Please add a property first to manage calendar",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Manage Calendar
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Update availability
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Analytics</p>
                      <p className="text-sm text-muted-foreground">View insights</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Form Modal */}
      <PropertyForm
        property={selectedProperty}
        isOpen={showPropertyForm}
        onClose={() => {
          setShowPropertyForm(false);
          setSelectedProperty(null);
        }}
        onSuccess={(property) => {
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
    <HostDashboard />
  </ErrorBoundary>
);

export default HostDashboardWithErrorBoundary;
