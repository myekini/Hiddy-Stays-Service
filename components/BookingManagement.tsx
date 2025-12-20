"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  User,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  MoreHorizontal,
  Search,
  Download,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  property_id: string;
  guest_id: string;
  host_id: string;
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
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  host_name: string;
  host_email: string;
}

interface BookingManagementProps {
  hostId?: string;
  propertyId?: string;
  onBookingUpdate?: () => void;
}

export function BookingManagement({
  hostId,
  propertyId,
  onBookingUpdate,
}: BookingManagementProps) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"cancel" | "update" | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNotes, setStatusNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    dateRange: "all",
    sort: "created_desc",
  });

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();

      if (hostId) params.append("host_id", hostId);
      if (propertyId) params.append("property_id", propertyId);
      if (filters.status !== "all") params.append("status", filters.status);
      params.append("limit", "50");

      const { supabase } = await import("@/integrations/supabase/client");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      const url = `/api/bookings?${params.toString()}`;
      console.log("[BookingManagement] Fetching bookings from:", url);
      console.log("[BookingManagement] Request params:", { hostId, propertyId, filters });
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("[BookingManagement] Response status:", response.status);
      console.log("[BookingManagement] Response ok:", response.ok);

      if (!response.ok) {
        const responseText = await response.text();
        console.error("[BookingManagement] Response status:", response.status);
        console.error("[BookingManagement] Response text:", responseText);
        
        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error("[BookingManagement] Failed to parse error response as JSON");
        }
        
        console.error("[BookingManagement] API error:", data);
        throw new Error(data?.error || `Failed to load bookings (HTTP ${response.status})`);
      }

      const data = await response.json().catch(() => ({}));
      console.log("[BookingManagement] Received data:", data);
      console.log("[BookingManagement] Bookings count:", data.bookings?.length || 0);
      setBookings(data.bookings || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load bookings";
      setErrorMessage(message);

      if (message.toLowerCase().includes("authentication token")) {
        toast({
          title: "Session required",
          description: "Please sign in again to view bookings.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [filters.status, hostId, propertyId, toast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

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

  const cancelBooking = async (booking: Booking) => {
    try {
      setActionBookingId(booking.id);
      setActionType("cancel");
      const { supabase } = await import("@/integrations/supabase/client");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: booking.id,
          reason: "Cancelled by host",
          refund: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to cancel booking");
      }

      toast({
        title: "Cancelled",
        description: "Booking cancelled successfully",
      });

      await loadBookings();
      onBookingUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to cancel booking",
        variant: "destructive",
      });
    } finally {
      setActionBookingId(null);
      setActionType(null);
    }
  };

  const exportCsv = () => {
    const headers = [
      "Booking ID",
      "Status",
      "Guest Name",
      "Guest Email",
      "Property",
      "Check-in",
      "Check-out",
      "Guests",
      "Total",
      "Created",
    ];

    const rows = bookings.map((b: Booking) => [
      b.id,
      b.status,
      b.guest_name,
      b.guest_email,
      b.property?.title || "",
      b.check_in_date,
      b.check_out_date,
      String(b.guests_count ?? ""),
      String(b.total_amount ?? ""),
      b.created_at,
    ]);

    const escapeCell = (v: string) => {
      const s = (v ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""');
      return `"${s}"`;
    };

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => escapeCell(String(c ?? ""))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const updateBookingStatus = async () => {
    if (!selectedBooking || !newStatus) return;

    try {
      setActionBookingId(selectedBooking.id);
      setActionType("update");
      const { supabase } = await import("@/integrations/supabase/client");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch("/api/bookings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          status: newStatus,
          notes: statusNotes,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update booking");
      }

      toast({
        title: "Success",
        description: `Booking ${newStatus} successfully`,
      });

      setShowStatusDialog(false);
      setSelectedBooking(null);
      setNewStatus("");
      setStatusNotes("");

      await loadBookings();
      onBookingUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update booking",
        variant: "destructive",
      });
    } finally {
      setActionBookingId(null);
      setActionType(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-primary";
      case "pending":
        return "bg-accentCustom-400";
      case "cancelled":
        return "bg-destructive";
      case "completed":
        return "bg-primary";
      default:
        return "bg-muted";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  const getDaysUntilCheckIn = (checkInDate: string) => {
    const today = new Date();
    const checkIn = new Date(checkInDate);
    const diffTime = checkIn.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const bookingRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let rows = bookings.slice();

    if (q) {
      rows = rows.filter((b) => {
        const guest = (b.guest_name || "").toLowerCase();
        const email = (b.guest_email || "").toLowerCase();
        const property = (b.property?.title || "").toLowerCase();
        return guest.includes(q) || email.includes(q) || property.includes(q);
      });
    }

    if (filters.dateRange !== "all") {
      rows = rows.filter((b) => {
        const checkIn = new Date(b.check_in_date);
        const checkOut = new Date(b.check_out_date);
        if (filters.dateRange === "upcoming") return checkIn >= startOfToday;
        if (filters.dateRange === "past") return checkOut < startOfToday;
        if (filters.dateRange === "next_30") {
          const end = new Date(startOfToday);
          end.setDate(end.getDate() + 30);
          return checkIn >= startOfToday && checkIn <= end;
        }
        return true;
      });
    }

    rows.sort((a, b) => {
      if (filters.sort === "checkin_asc") {
        return (
          new Date(a.check_in_date).getTime() -
          new Date(b.check_in_date).getTime()
        );
      }
      if (filters.sort === "total_desc") {
        return (b.total_amount || 0) - (a.total_amount || 0);
      }
      if (filters.sort === "guest_asc") {
        return (a.guest_name || "").localeCompare(b.guest_name || "");
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return rows;
  }, [bookings, filters.dateRange, filters.sort, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Booking Management
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage all bookings for your properties
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBookings}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={loading || bookings.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-destructive">
                Couldn&apos;t load bookings
              </p>
              <p className="text-sm text-muted-foreground break-words">{errorMessage}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadBookings}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 bg-muted/20 border-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by guest name, property, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>
          <div className="w-full">
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="w-full sm:w-[180px] h-10">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full">
            <Select
              value={filters.dateRange}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, dateRange: value }))
              }
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
                <SelectItem value="next_30">Next 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full">
            <Select
              value={filters.sort}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, sort: value }))}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Newest</SelectItem>
                <SelectItem value="checkin_asc">Check-in date</SelectItem>
                <SelectItem value="total_desc">Highest total</SelectItem>
                <SelectItem value="guest_asc">Guest name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {bookingRows.length} booking{bookingRows.length === 1 ? "" : "s"}
          </p>
          {(searchQuery || filters.status !== "all" || filters.dateRange !== "all" || filters.sort !== "created_desc") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFilters((prev) => ({
                  ...prev,
                  status: "all",
                  dateRange: "all",
                  sort: "created_desc",
                }));
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Bookings List */}
      <div className="space-y-3">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/50 bg-card p-4"
              >
                <div className="flex items-start justify-between gap-4 animate-pulse">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-lg bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-40 bg-muted rounded" />
                      <div className="h-3 w-56 bg-muted rounded" />
                      <div className="h-3 w-64 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-8 w-20 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : bookingRows.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="mx-auto max-w-md">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchQuery || filters.status !== "all" || filters.dateRange !== "all"
                  ? "No matching bookings found"
                  : "No bookings yet"}
              </h3>
              
              <p className="text-muted-foreground mb-6">
                {searchQuery || filters.status !== "all" || filters.dateRange !== "all"
                  ? "Try adjusting your search or filters."
                  : "When you receive bookings, they'll appear here."}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {searchQuery || filters.status !== "all" || filters.dateRange !== "all" ? (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setFilters((prev) => ({
                        ...prev,
                        status: "all",
                        dateRange: "all",
                        sort: "created_desc",
                      }));
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/host-dashboard?tab=properties">
                      <Plus className="w-4 h-4 mr-2" />
                      Add a property
                    </Link>
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={loadBookings}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-1">
            {bookingRows.map((booking) => (
              <Card 
                key={booking.id} 
                className="border border-border/50 bg-card hover:bg-card/90 transition-colors group"
              >
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold flex-shrink-0 mt-0.5">
                            {getInitials(booking.guest_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-foreground truncate">
                                {booking.guest_name}
                              </h3>
                              <Badge 
                                variant="secondary" 
                                className={`${getStatusColor(booking.status)} text-white border-0 text-xs h-5 px-1.5`}
                              >
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate max-w-[240px]">
                              {booking.property?.title}
                            </p>
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2 flex-shrink-0 ml-auto">
                          <span className="text-xs text-muted-foreground font-mono">
                            #{booking.id.slice(-6)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                          <div className="flex items-center gap-2 text-foreground">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              {formatDate(booking.check_in_date)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="whitespace-nowrap">
                              {formatDate(booking.check_out_date)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-foreground">
                            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span>
                              {booking.guests_count} {booking.guests_count === 1 ? 'guest' : 'guests'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                          <div className="flex items-center gap-2 text-foreground">
                            <DollarSign className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium">{formatCurrency(booking.total_amount)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>Booked {formatDate(booking.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {booking.status === "pending" && (
                        <div className="mt-2 text-xs font-medium text-amber-600 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>Check-in in {getDaysUntilCheckIn(booking.check_in_date)} days</span>
                        </div>
                      )}

                      {booking.special_requests && (
                        <div className="mt-3 text-sm">
                          <button 
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDetails(true);
                            }}
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View special requests
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowDetails(true);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Details</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            disabled={actionBookingId === booking.id && !!actionType}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {booking.status !== "cancelled" && booking.status !== "completed" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedBooking(booking);
                                setNewStatus(booking.status === "pending" ? "confirmed" : booking.status);
                                setShowStatusDialog(true);
                              }}
                              className="cursor-pointer"
                              disabled={
                                actionBookingId === booking.id && actionType === "update"
                              }
                            >
                              <CheckCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                              {actionBookingId === booking.id && actionType === "update"
                                ? "Updating..."
                                : booking.status === "pending"
                                  ? "Confirm booking"
                                  : "Update status"}
                            </DropdownMenuItem>
                          )}

                          {booking.status !== "cancelled" && booking.status !== "completed" && (
                            <DropdownMenuItem 
                              onClick={() => cancelBooking(booking)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                              disabled={
                                actionBookingId === booking.id && actionType === "cancel"
                              }
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              {actionBookingId === booking.id && actionType === "cancel"
                                ? "Cancelling..."
                                : "Cancel booking"}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => {
                              toast({
                                title: "Coming soon",
                                description: "Messaging will be available in the next update.",
                              });
                            }}
                            className="cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4 mr-2 text-muted-foreground" />
                            Message guest
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Complete information about this booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Guest Information</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Name:</strong> {selectedBooking.guest_name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedBooking.guest_email}
                    </p>
                    {selectedBooking.guest_phone && (
                      <p>
                        <strong>Phone:</strong> {selectedBooking.guest_phone}
                      </p>
                    )}
                    <p>
                      <strong>Guests:</strong> {selectedBooking.guests_count}
                    </p>
                  </div>
                </div>
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
                      <strong>Created:</strong>{" "}
                      {formatDate(selectedBooking.created_at)}
                    </p>
                    <p>
                      <strong>Last Updated:</strong>{" "}
                      {formatDate(selectedBooking.updated_at)}
                    </p>
                    <p>
                      <strong>Days Until Check-in:</strong>{" "}
                      {getDaysUntilCheckIn(selectedBooking.check_in_date)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedBooking.special_requests && (
                <div>
                  <h4 className="font-semibold mb-2">Special Requests</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedBooking.special_requests}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Booking Status</DialogTitle>
            <DialogDescription>
              Change the status of this booking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this status change..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowStatusDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={updateBookingStatus}>Update Status</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
