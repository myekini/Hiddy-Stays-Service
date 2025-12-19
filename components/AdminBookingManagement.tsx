import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  guests_count: number;
  total_amount: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  payment_method?: string;
  payment_status:
    | "pending"
    | "processing"
    | "paid"
    | "failed"
    | "refunded"
    | "partially_refunded"
    | "disputed";
  created_at: string;
  updated_at: string;
  guest: {
    id: string;
    name: string;
    email: string;
  };
  host: {
    id: string;
    name: string;
    email: string;
  };
  property: {
    id: string;
    title: string;
    location: string;
    price_per_night: number;
  };
  payment_intent_id?: string;
  refund_amount?: number;
  cancellation_reason?: string;
}

const AdminBookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);

  const getAdminToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      throw new Error("No auth token available");
    }
    return token;
  };

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);

      const token = await getAdminToken();
      const response = await fetch("/api/admin/bookings?limit=500", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Failed to load bookings");
      }

      const bookingsData = payload?.bookings || [];
      const transformedBookings: Booking[] = (bookingsData || []).map(
        (booking: any) => ({
          id: booking.id,
          check_in_date: booking.check_in_date,
          check_out_date: booking.check_out_date,
          guests_count: booking.guests_count,
          total_amount: booking.total_amount,
          status: booking.status,
          payment_method: booking.payment_method,
          payment_status: booking.payment_status,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          guest: {
            id: booking.guest?.id || booking.guest_id || "",
            name:
              `${booking.guest?.first_name || ""} ${booking.guest?.last_name || ""}`
                .trim() ||
              `${booking.guest_name || ""}`.trim(),
            email: booking.guest?.email || booking.guest_email || "",
          },
          host: {
            id: booking.host?.id || booking.host_id || "",
            name: `${booking.host?.first_name || ""} ${booking.host?.last_name || ""}`.trim(),
            email: booking.host?.email || "",
          },
          property: {
            id: booking.property?.id || booking.property_id || "",
            title: booking.property?.title || "",
            location:
              `${booking.property?.city || ""}`.trim() ||
              `${booking.property?.address || ""}`.trim(),
            price_per_night: booking.property?.price_per_night || 0,
          },
          payment_intent_id: booking.payment_intent_id,
          refund_amount: booking.refund_amount,
          cancellation_reason: booking.cancellation_reason,
        })
      );

      setBookings(transformedBookings);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterBookings = useCallback(() => {
    let filtered = bookings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.host.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.property.title
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((booking) => booking.status === filterStatus);
    }

    // Payment status filter
    if (filterPaymentStatus !== "all") {
      filtered = filtered.filter(
        (booking) => booking.payment_status === filterPaymentStatus
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, filterPaymentStatus, filterStatus, searchTerm]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    filterBookings();
  }, [filterBookings]);

  const handleBookingAction = async (bookingId: string, action: string) => {
    try {
      const token = await getAdminToken();

      if (action === "confirm" || action === "complete") {
        const nextStatus = action === "confirm" ? "confirmed" : "completed";
        const response = await fetch("/api/admin/bookings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bookingId,
            updates: { status: nextStatus },
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || payload?.error || `Failed to ${action} booking`);
        }
      }

      if (action === "cancel") {
        const response = await fetch("/api/admin/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bookingId,
            action: "cancel",
            reason: "Cancelled by admin",
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || payload?.error || "Failed to cancel booking");
        }
      }

      if (action === "mark_paid") {
        const response = await fetch("/api/admin/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bookingId,
            action: "mark_paid",
            reason: "Marked as paid by admin",
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || payload?.error || "Failed to mark as paid");
        }
      }

      if (action === "refund") {
        const booking = bookings.find((b) => b.id === bookingId);
        const refundAmount = booking?.total_amount || 0;

        const response = await fetch("/api/admin/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bookingId,
            action: "refund",
            reason: "Refund processed by admin",
            refundAmount,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || payload?.error || "Failed to refund booking");
        }
      }

      // Reload bookings
      await loadBookings();
    } catch (error) {
      console.error(`Error performing ${action} on booking:`, error);
    }
  };

  const openBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge variant="default" className="bg-green-600">
            Confirmed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600">
            Pending
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "completed":
        return (
          <Badge variant="outline" className="text-blue-600">
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="outline" className="text-green-600">
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600">
            Pending
          </Badge>
        );
      case "refunded":
        return (
          <Badge variant="outline" className="text-blue-600">
            Refunded
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Booking Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage all bookings and reservations
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredBookings.length} shown
            <span className="mx-2">•</span>
            {bookings.length} total
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="sticky top-4 z-10 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by guest, host, property, or booking ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
        <CardHeader className="pb-3">
          <CardTitle>Bookings ({filteredBookings.length})</CardTitle>
          <CardDescription>
            Manage booking statuses and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="h-10 px-3 text-xs">Booking ID</TableHead>
                <TableHead className="h-10 px-3 text-xs">Guest</TableHead>
                <TableHead className="h-10 px-3 text-xs">Property</TableHead>
                <TableHead className="h-10 px-3 text-xs">Dates</TableHead>
                <TableHead className="h-10 px-3 text-xs text-right">Amount</TableHead>
                <TableHead className="h-10 px-3 text-xs">Status</TableHead>
                <TableHead className="h-10 px-3 text-xs">Payment</TableHead>
                <TableHead className="h-10 px-3 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="p-3">
                    <div className="font-mono text-sm">
                      {booking.id.slice(0, 8)}...
                    </div>
                  </TableCell>
                  <TableCell className="p-3">
                    <div>
                      <div className="font-medium">{booking.guest.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {booking.guest.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-3">
                    <div>
                      <div className="font-medium">
                        {booking.property.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {booking.property.location}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-3">
                    <div className="text-sm">
                      <div>
                        {new Date(booking.check_in_date).toLocaleDateString()}
                      </div>
                      <div className="text-muted-foreground">
                        to{" "}
                        {new Date(booking.check_out_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {calculateNights(
                          booking.check_in_date,
                          booking.check_out_date
                        )}{" "}
                        nights
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-3 text-right">
                    <div className="font-medium">${booking.total_amount}</div>
                    <div className="text-sm text-muted-foreground">
                      {booking.guests_count} guests
                    </div>
                  </TableCell>
                  <TableCell className="p-3">{getStatusBadge(booking.status)}</TableCell>
                  <TableCell className="p-3">
                    {getPaymentStatusBadge(booking.payment_status)}
                  </TableCell>
                  <TableCell className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => openBookingDetails(booking)}>
                          View details
                        </DropdownMenuItem>

                        {booking.status === "pending" && (
                          <DropdownMenuItem onSelect={() => handleBookingAction(booking.id, "confirm")}>
                            Confirm booking
                          </DropdownMenuItem>
                        )}

                        {booking.payment_method === "bank_transfer" &&
                          booking.payment_status === "pending" &&
                          booking.status !== "cancelled" &&
                          booking.status !== "completed" && (
                            <DropdownMenuItem onSelect={() => handleBookingAction(booking.id, "mark_paid")}>
                              Mark as paid
                            </DropdownMenuItem>
                          )}

                        {booking.status === "confirmed" && (
                          <DropdownMenuItem onSelect={() => handleBookingAction(booking.id, "complete")}>
                            Mark as completed
                          </DropdownMenuItem>
                        )}

                        {(booking.status !== "cancelled" && booking.status !== "completed") && (
                          <>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                  Cancel booking
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this booking? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleBookingAction(booking.id, "cancel")}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Cancel Booking
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}

                        {booking.payment_status === "paid" && (
                          <>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem>
                                  Process refund
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Process Refund</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to process a refund for this booking?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleBookingAction(booking.id, "refund")}>
                                    Process Refund
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={bookingDetailsOpen} onOpenChange={setBookingDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-2">Booking Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Booking ID:</span>
                      <p className="text-sm font-mono">{selectedBooking.id}</p>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <div className="mt-1">
                        {getStatusBadge(selectedBooking.status)}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Payment Status:</span>
                      <div className="mt-1">
                        {getPaymentStatusBadge(selectedBooking.payment_status)}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Total Amount:</span>
                      <p className="text-sm font-semibold">
                        ${selectedBooking.total_amount}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Dates & Guests</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Check-in:</span>
                      <p className="text-sm">
                        {new Date(
                          selectedBooking.check_in_date
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Check-out:</span>
                      <p className="text-sm">
                        {new Date(
                          selectedBooking.check_out_date
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>
                      <p className="text-sm">
                        {calculateNights(
                          selectedBooking.check_in_date,
                          selectedBooking.check_out_date
                        )}{" "}
                        nights
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Guests:</span>
                      <p className="text-sm">
                        {selectedBooking.guests_count} people
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-2">Guest Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Name:</span>
                      <p className="text-sm">{selectedBooking.guest.name}</p>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>
                      <p className="text-sm">{selectedBooking.guest.email}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Host Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Name:</span>
                      <p className="text-sm">{selectedBooking.host.name}</p>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>
                      <p className="text-sm">{selectedBooking.host.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Property Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Title:</span>
                    <p className="text-sm">{selectedBooking.property.title}</p>
                  </div>
                  <div>
                    <span className="font-medium">Location:</span>
                    <p className="text-sm">
                      {selectedBooking.property.location}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Price per Night:</span>
                    <p className="text-sm">
                      ${selectedBooking.property.price_per_night}
                    </p>
                  </div>
                </div>
              </div>

              {selectedBooking.payment_intent_id && (
                <div>
                  <h3 className="font-semibold mb-2">Payment Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Payment Intent ID:</span>
                      <p className="text-sm font-mono">
                        {selectedBooking.payment_intent_id}
                      </p>
                    </div>
                    {selectedBooking.refund_amount && (
                      <div>
                        <span className="font-medium">Refund Amount:</span>
                        <p className="text-sm">
                          ${selectedBooking.refund_amount}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedBooking.cancellation_reason && (
                <div>
                  <h3 className="font-semibold mb-2">
                    Cancellation Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Reason:</span>
                      <p className="text-sm">
                        {selectedBooking.cancellation_reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Created:{" "}
                    {new Date(selectedBooking.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Updated:{" "}
                    {new Date(selectedBooking.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBookingManagement;
