"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  User,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  MoreHorizontal,
  Filter,
  Search,
  Download,
  RefreshCw,
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNotes, setStatusNotes] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    dateRange: "all",
  });

  useEffect(() => {
    loadBookings();
  }, [hostId, propertyId, filters]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (hostId) params.append("host_id", hostId);
      if (propertyId) params.append("property_id", propertyId);
      if (filters.status !== "all") params.append("status", filters.status);
      params.append("limit", "50");

      // Get auth token from Supabase
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(`/api/bookings?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        let filteredBookings = data.bookings || [];

        // Apply search filter
        if (filters.search) {
          filteredBookings = filteredBookings.filter(
            (booking: Booking) =>
              booking.guest_name
                .toLowerCase()
                .includes(filters.search.toLowerCase()) ||
              booking.property.title
                .toLowerCase()
                .includes(filters.search.toLowerCase()) ||
              booking.guest_email
                .toLowerCase()
                .includes(filters.search.toLowerCase())
          );
        }

        setBookings(filteredBookings);
      } else {
        throw new Error("Failed to load bookings");
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async () => {
    if (!selectedBooking || !newStatus) return;

    try {
      // Get auth token from Supabase
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch("/api/bookings", {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          status: newStatus,
          notes: statusNotes,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success! 🎉",
          description: `Booking ${newStatus} successfully`,
        });
        setShowStatusDialog(false);
        setSelectedBooking(null);
        setNewStatus("");
        setStatusNotes("");
        loadBookings();
        // Notify parent component to refresh dashboard data
        if (onBookingUpdate) {
          onBookingUpdate();
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to update booking");
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update booking",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case "pending":
        return <Clock className="w-4 h-4 text-accentCustom-400" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-primary" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Booking Management
          </h2>
          <p className="text-muted-foreground">
            Manage all bookings for your properties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadBookings}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by guest name, property, or email..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger className="w-[180px]">
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
      </Card>

      {/* Bookings List */}
      <div className="space-y-4">
        {bookings.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No bookings found
            </h3>
            <p className="text-muted-foreground">
              {filters.search || filters.status !== "all"
                ? "Try adjusting your filters to see more bookings."
                : "You don't have any bookings yet. Share your properties to start receiving bookings!"}
            </p>
          </Card>
        ) : (
          bookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(booking.status)} text-white`}
                        >
                          {getStatusIcon(booking.status)}
                          <span className="ml-1 capitalize">
                            {booking.status}
                          </span>
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Booking #{booking.id.slice(-8)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">
                            {booking.guest_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.guest_email}
                          </p>
                          {booking.guest_phone && (
                            <p className="text-sm text-muted-foreground">
                              {booking.guest_phone}
                            </p>
                          )}
                        </div>

                        <div>
                          <h4 className="font-medium text-foreground mb-1">
                            {booking.property.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {booking.property.location}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking.guests_count}{" "}
                            {booking.guests_count === 1 ? "guest" : "guests"}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {formatDate(booking.check_in_date)} -{" "}
                              {formatDate(booking.check_out_date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {formatCurrency(booking.total_amount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {booking.special_requests && (
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground">
                            <strong>Special Requests:</strong>{" "}
                            {booking.special_requests}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Created {formatDate(booking.created_at)}</span>
                        {booking.status === "pending" && (
                          <span className="ml-4">
                            Check-in in{" "}
                            {getDaysUntilCheckIn(booking.check_in_date)} days
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowDetails(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBooking(booking);
                              setNewStatus(
                                booking.status === "pending"
                                  ? "confirmed"
                                  : "pending"
                              );
                              setShowStatusDialog(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {booking.status === "pending"
                              ? "Confirm"
                              : "Update Status"}
                          </DropdownMenuItem>
                          {booking.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedBooking(booking);
                                setNewStatus("cancelled");
                                setShowStatusDialog(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel Booking
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </Card>
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
                    <p>
                      <strong>Status:</strong>
                      <Badge
                        className={`ml-2 ${getStatusColor(selectedBooking.status)} text-white`}
                      >
                        {selectedBooking.status}
                      </Badge>
                    </p>
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
