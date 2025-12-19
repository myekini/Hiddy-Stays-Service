"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  MessageCircle,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  CalendarCheck,
  CircleCheckBig,
  Hourglass,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ReviewForm } from "@/components/ReviewForm";
import { supabase } from "@/integrations/supabase/client";

interface UserBooking {
  id: string;
  property_id: string;
  check_in_date: string;
  check_out_date: string;
  guests_count: number;
  total_amount: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  special_requests?: string;
  created_at: string;
  updated_at: string;
  property: {
    id: string;
    title: string;
    address: string;
    location: string;
    price_per_night: number;
    images: string[];
  };
  host_name: string;
  host_email: string;
}

interface UserBookingDashboardProps {
  userId?: string;
}

export function UserBookingDashboard({ userId }: UserBookingDashboardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<UserBooking | null>(
    null
  );
  const [showDetails, setShowDetails] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [cancellationPolicy, setCancellationPolicy] = useState<{
    can_cancel: boolean;
    refund_amount?: number;
    refund_percentage?: number;
    processing_time?: string;
    reason?: string;
    hours_until_checkin?: number;
  } | null>(null);
  const [loadingCancellation, setLoadingCancellation] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    sortBy: "created_at",
  });

  useEffect(() => {
    // Only show full loading on initial load
    const isInitialLoad = bookings.length === 0;

    if (!isInitialLoad) {
      // Show filter loading overlay when filters change
      setFilterLoading(true);
    }

    loadUserBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user, filters.status, filters.sortBy]);

  const loadUserBookings = async () => {
    setLoading(true);
    try {
      // Get current session for authentication
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setBookings([]);
        if (sessionError) {
          toast({
            title: "Authentication Error",
            description: "Please sign in to view your bookings",
            variant: "destructive",
          });
        }
        return;
      }

      // Note: API uses authenticated user's profile ID automatically
      // No need to send guest_id - it will be determined from the auth token
      const params = new URLSearchParams();
      if (filters.status !== "all") params.append("status", filters.status);
      params.append("limit", "50");

      const response = await fetch(`/api/bookings?${params.toString()}&_t=${Date.now()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        let errorMessage = `Failed to load bookings (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load bookings");
      }

      let userBookings = data.bookings || [];

      // Apply search filter
      if (filters.search) {
        userBookings = userBookings.filter(
          (booking: UserBooking) =>
            booking.property?.title
              ?.toLowerCase()
              .includes(filters.search.toLowerCase()) ||
            booking.property?.location
              ?.toLowerCase()
              .includes(filters.search.toLowerCase()) ||
            booking.host_name
              ?.toLowerCase()
              .includes(filters.search.toLowerCase())
        );
      }

      // Apply sorting
      userBookings.sort((a: UserBooking, b: UserBooking) => {
        switch (filters.sortBy) {
          case "check_in_date":
            return (
              new Date(a.check_in_date).getTime() -
              new Date(b.check_in_date).getTime()
            );
          case "created_at":
          default:
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
        }
      });

      setBookings(userBookings);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load your bookings. Please try again.";

      toast({
        title: "Error Loading Bookings",
        description: errorMessage,
        variant: "destructive",
      });
      setBookings([]);
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  };

  const loadCancellationPolicy = async (booking: UserBooking) => {
    if (!user?.id) return;

    setLoadingCancellation(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `/api/bookings/cancel?booking_id=${booking.id}`,
        {
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCancellationPolicy(data.cancellation_policy);
      }
    } catch {
      // Silently handle cancellation policy errors
    } finally {
      setLoadingCancellation(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking || !user?.id) return;

    setLoadingCancellation(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          reason: "Cancelled by guest",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Booking Cancelled ✅",
          description: `Your booking has been cancelled. ${data.refund?.eligible ? `Refund of ${formatCurrency(data.refund.amount)} will be processed in ${data.refund.processing_time}.` : ""}`,
        });
        setShowCancelDialog(false);
        setSelectedBooking(null);
        setCancellationPolicy(null);
        loadUserBookings();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel booking");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to cancel booking",
        variant: "destructive",
      });
    } finally {
      setLoadingCancellation(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string = "CAD") => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: currency || "CAD",
    }).format(amount);
  };

  const getDaysUntilCheckIn = (checkInDate: string) => {
    const today = new Date();
    const checkIn = new Date(checkInDate);
    const diffTime = checkIn.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const canCancelBooking = (booking: UserBooking) => {
    const daysUntilCheckIn = getDaysUntilCheckIn(booking.check_in_date);
    return booking.status === "confirmed" && daysUntilCheckIn > 1;
  };

  const canReviewBooking = (booking: UserBooking) => {
    // Can review if booking is completed and checkout date has passed
    const checkoutDate = new Date(booking.check_out_date);
    const now = new Date();
    return booking.status === "completed" && checkoutDate < now;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-[#F5F7FA]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent mx-auto"></div>
          <div>
            <p className="text-lg font-medium text-slate-900">
              Loading your trips...
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Please wait while we fetch your reservations
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-12 pb-24 space-y-8 bg-[#F5F7FA] min-h-screen relative">
      {/* Filter Loading Overlay */}
      {filterLoading && !loading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
            <p className="text-base font-medium text-slate-900">
              Loading trips...
            </p>
          </div>
        </div>
      )}

      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
            Trips
          </h1>
          <p className="text-base text-slate-500">
            Where you've been and where you're going
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUserBookings}
            className="gap-2 border-slate-200 hover:bg-white hover:shadow-sm rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Modern Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search by property, location, or host..."
            value={filters.search}
            onChange={e =>
              setFilters(prev => ({ ...prev, search: e.target.value }))
            }
            className="pl-14 h-14 rounded-full border-slate-200 bg-white shadow-sm hover:shadow-md focus:border-slate-900 focus:ring-slate-900 transition-shadow text-base"
          />
        </div>
      </div>

      {/* Tabs & Sort */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <Tabs 
          defaultValue="all" 
          value={filters.status} 
          onValueChange={(val) => setFilters(prev => ({ ...prev, status: val }))} 
          className="w-full md:w-auto"
        >
          <TabsList className="bg-white p-1 rounded-full border border-slate-200 h-auto flex-wrap justify-start w-full md:w-auto">
            <TabsTrigger value="all" className="rounded-full px-4 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white">All Trips</TabsTrigger>
            <TabsTrigger value="confirmed" className="rounded-full px-4 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white">Upcoming</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-full px-4 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white">Pending</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-full px-4 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white">Past</TabsTrigger>
            <TabsTrigger value="cancelled" className="rounded-full px-4 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-1" />
        
        <Select
          value={filters.sortBy}
          onValueChange={value =>
            setFilters(prev => ({ ...prev, sortBy: value }))
          }
        >
          <SelectTrigger className="w-full md:w-auto min-w-[180px] h-11 rounded-full border-slate-200 bg-white hover:bg-slate-50">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date Booked</SelectItem>
            <SelectItem value="check_in_date">Check-in Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Modern Stat Cards - Only show for "All" view to avoid confusion */}
      {filters.status === "all" && bookings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="p-5 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <div className="text-sm text-slate-500 mb-1 font-medium">
              Total Trips
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {bookings.length}
            </div>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CircleCheckBig className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-sm text-slate-500 mb-1 font-medium">
              Confirmed
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {bookings.filter(b => b.status === "confirmed").length}
            </div>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Hourglass className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <div className="text-sm text-slate-500 mb-1 font-medium">
              Pending
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {bookings.filter(b => b.status === "pending").length}
            </div>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-sm text-slate-500 mb-1 font-medium">
              Completed
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {bookings.filter(b => b.status === "completed").length}
            </div>
          </div>
        </div>
      )}

      {/* Bookings List */}
      <div className="space-y-6">
        {bookings.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col items-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <Calendar className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                No trips found
              </h3>
              <p className="text-slate-500 text-base leading-relaxed mb-6">
                {filters.search || filters.status !== "all"
                  ? "Try adjusting your filters to see more bookings."
                  : "You haven't made any bookings yet. Start exploring properties to book your perfect stay!"}
              </p>
              {!filters.search && filters.status === "all" && (
                <Button
                  className="mt-2 rounded-full h-12 px-8 font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => (window.location.href = "/properties")}
                >
                  Explore properties
                </Button>
              )}
            </div>
          </div>
        ) : (
          bookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative group">
                <div className="p-6 lg:p-8">
                  {/* Status Badge */}
                  <div className="absolute top-6 right-6 lg:top-8 lg:right-8 z-10">
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(booking.status)} border font-medium px-3 py-1 rounded-full text-sm shadow-sm`}
                    >
                      <span className="capitalize">
                        {booking.status === "confirmed" ? "Upcoming" : booking.status}
                      </span>
                    </Badge>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Property Image */}
                    <div className="flex-shrink-0">
                      <div className="relative overflow-hidden rounded-xl">
                        {booking.property?.images?.[0] ? (
                          <img
                            src={booking.property.images[0]}
                            alt={booking.property?.title || "Property"}
                            className="w-full lg:w-64 h-56 object-cover rounded-xl border border-slate-200 group-hover:scale-105 transition-transform duration-500"
                            onError={e => {
                              (e.target as HTMLImageElement).src =
                                "/placeholder.svg";
                            }}
                          />
                        ) : (
                          <div className="w-full lg:w-64 h-56 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <Calendar className="w-10 h-10" />
                              <span className="text-sm font-medium">No image</span>
                            </div>
                          </div>
                        )}
                        <Link 
                          href={`/properties/${booking.property_id}`}
                          className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Property Details */}
                    <div className="flex-1 min-w-0 space-y-4">
                      <div>
                        <Link href={`/properties/${booking.property_id}`} className="block group-hover:text-blue-600 transition-colors">
                          <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1 leading-tight">
                            {booking.property?.title || "Property"}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {booking.property?.location ||
                              booking.property?.address ||
                              "Location not available"}
                          </span>
                        </div>
                      </div>

                      {/* Booking Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                            Check-in
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(booking.check_in_date)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                            Check-out
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(booking.check_out_date)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                            Guests
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {booking.guests_count}{" "}
                            {booking.guests_count === 1 ? "guest" : "guests"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                            Total
                          </p>
                          <p className="text-base font-bold text-slate-900">
                            {formatCurrency(booking.total_amount)}
                          </p>
                        </div>
                      </div>

                      {booking.special_requests && (
                        <div className="flex gap-2 items-start p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-800">
                          <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p className="line-clamp-1">{booking.special_requests}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-48 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowDetails(true);
                        }}
                        className="w-full sm:flex-1 lg:w-full justify-center border-slate-200 hover:bg-slate-50 hover:border-slate-900 rounded-xl h-10 font-medium text-slate-900"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>

                      {/* Complete Payment button for pending bookings */}
                      {booking.status === "pending" && (
                        <Button
                          asChild
                          size="sm"
                          className="w-full sm:flex-1 lg:w-full justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 font-medium shadow-sm"
                        >
                          <Link href={`/booking/${booking.id}/pay`}>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay Now
                          </Link>
                        </Button>
                      )}

                      {canCancelBooking(booking) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:flex-1 lg:w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-xl h-10 font-medium"
                          onClick={() => {
                            setSelectedBooking(booking);
                            loadCancellationPolicy(booking);
                            setShowCancelDialog(true);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      )}

                      {canReviewBooking(booking) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:flex-1 lg:w-full justify-center text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 hover:border-amber-300 rounded-xl h-10 font-medium"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowReviewForm(true);
                          }}
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full sm:flex-1 lg:w-full justify-center text-slate-500 hover:text-slate-900 rounded-xl h-10"
                      >
                        Contact Host
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Complete information about your booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Property Information</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Property:</strong>{" "}
                      {selectedBooking.property.title}
                    </p>
                    <p>
                      <strong>Location:</strong>{" "}
                      {selectedBooking.property.location}
                    </p>
                    <p>
                      <strong>Address:</strong>{" "}
                      {selectedBooking.property.address}
                    </p>
                    <p>
                      <strong>Price/Night:</strong>{" "}
                      {formatCurrency(selectedBooking.property.price_per_night)}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Host Information</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Host:</strong> {selectedBooking.host_name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedBooking.host_email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Booking Details</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Check-in:</strong>{" "}
                      {formatDate(selectedBooking.check_in_date)}
                    </p>
                    <p>
                      <strong>Check-out:</strong>{" "}
                      {formatDate(selectedBooking.check_out_date)}
                    </p>
                    <p>
                      <strong>Guests:</strong> {selectedBooking.guests_count}
                    </p>
                    <p>
                      <strong>Total Amount:</strong>{" "}
                      {formatCurrency(selectedBooking.total_amount)}
                    </p>
                    <div className="flex items-center gap-2">
                      <strong>Status:</strong>
                      <Badge
                        className={`${getStatusColor(selectedBooking.status)} text-white`}
                      >
                        {selectedBooking.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Timeline</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Booked:</strong>{" "}
                      {formatDate(selectedBooking.created_at)}
                    </p>
                    <p>
                      <strong>Last Updated:</strong>{" "}
                      {formatDate(selectedBooking.updated_at)}
                    </p>
                    {selectedBooking.status === "confirmed" && (
                      <p>
                        <strong>Days Until Check-in:</strong>{" "}
                        {getDaysUntilCheckIn(selectedBooking.check_in_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedBooking.special_requests && (
                <div>
                  <h4 className="font-semibold mb-2">Special Requests</h4>
                  <p className="text-sm text-neutral-600">
                    {selectedBooking.special_requests}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Cancellation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Review the cancellation policy before proceeding
            </DialogDescription>
          </DialogHeader>

          {loadingCancellation ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : cancellationPolicy ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Cancellation Policy</h4>
                <p className="text-sm text-gray-600 mb-3">
                  {cancellationPolicy.reason}
                </p>

                {cancellationPolicy.can_cancel && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Refund Amount:</span>
                      <span className="font-medium text-green-600">
                        {cancellationPolicy.refund_amount
                          ? formatCurrency(cancellationPolicy.refund_amount)
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing Time:</span>
                      <span>{cancellationPolicy.processing_time || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hours until check-in:</span>
                      <span>
                        {cancellationPolicy.hours_until_checkin
                          ? Math.round(cancellationPolicy.hours_until_checkin)
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {!cancellationPolicy.can_cancel && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Cannot Cancel</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    {cancellationPolicy.reason}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelDialog(false);
                    setCancellationPolicy(null);
                    setSelectedBooking(null);
                  }}
                  className="flex-1"
                >
                  Keep Booking
                </Button>
                {cancellationPolicy.can_cancel && (
                  <Button
                    onClick={handleCancelBooking}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    disabled={loadingCancellation}
                  >
                    {loadingCancellation ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      "Cancel Booking"
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">
                Unable to load cancellation policy
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Form Dialog */}
      {selectedBooking && (
        <ReviewForm
          bookingId={selectedBooking.id}
          propertyId={selectedBooking.property_id}
          propertyTitle={selectedBooking.property.title}
          isOpen={showReviewForm}
          onClose={() => {
            setShowReviewForm(false);
            setSelectedBooking(null);
          }}
          onSuccess={() => {
            toast({
              title: "Review Submitted! ⭐",
              description: "Thank you for sharing your experience",
            });
          }}
        />
      )}
    </div>
  );
}
