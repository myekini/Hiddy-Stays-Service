"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  User,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Home,
  MessageSquare,
  MapPin,
  Users,
  CreditCard,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  payment_status?: string;
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
    description?: string;
    amenities?: string[];
  };
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  host_name: string;
  host_email: string;
}

export default function BookingDetailsPage() {
  const { toast } = useToast();
  const { user, authUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (authUser?.id && bookingId) {
      loadBookingDetails();
    }
  }, [authUser, bookingId]);

  const loadBookingDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);

      if (response.ok) {
        const data = await response.json();
        setBooking(data.booking);

        // Check if the booking belongs to the current user
        if (data.booking.guest_id !== authUser?.id) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to view this booking",
            variant: "destructive",
          });
          router.push("/bookings");
        }
      } else {
        throw new Error("Failed to load booking details");
      }
    } catch (error) {
      console.error("Error loading booking details:", error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
      router.push("/bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Booking Cancelled",
          description:
            data.message || "Your booking has been successfully cancelled",
        });
        setCancelDialogOpen(false);
        loadBookingDetails();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to cancel your booking",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle className="w-3 h-3 mr-1" /> Confirmed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            <XCircle className="w-3 h-3 mr-1" /> Cancelled
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" /> Completed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">
            <AlertCircle className="w-3 h-3 mr-1" /> {status}
          </Badge>
        );
    }
  };

  const getPaymentStatusBadge = (status?: string) => {
    if (!status) return null;

    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <DollarSign className="w-3 h-3 mr-1" /> Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <Clock className="w-3 h-3 mr-1" /> Payment Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            <AlertCircle className="w-3 h-3 mr-1" /> Payment Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const canCancelBooking = () => {
    if (!booking) return false;

    // Only allow cancellation for pending or confirmed bookings
    if (booking.status !== "pending" && booking.status !== "confirmed") {
      return false;
    }

    // Check if check-in date is at least 24 hours away
    const checkInDate = new Date(booking.check_in_date);
    const now = new Date();
    const hoursUntilCheckIn =
      (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntilCheckIn >= 24;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col bg-neutral-50">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 w-1/3 mb-4 rounded"></div>
              <div className="h-4 bg-gray-200 w-1/2 mb-8 rounded"></div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="h-96 bg-gray-200 rounded-lg mb-6"></div>
                  <div className="h-8 bg-gray-200 w-1/2 mb-4 rounded"></div>
                  <div className="h-4 bg-gray-200 w-full mb-2 rounded"></div>
                  <div className="h-4 bg-gray-200 w-full mb-2 rounded"></div>
                  <div className="h-4 bg-gray-200 w-3/4 mb-6 rounded"></div>
                </div>

                <div className="lg:col-span-1">
                  <div className="h-64 bg-gray-200 rounded-lg mb-6"></div>
                  <div className="h-40 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  if (!booking) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col bg-neutral-50">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
            <Card className="w-full max-w-md text-center p-6">
              <CardContent className="pt-6">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Booking Not Found</h2>
                <p className="text-gray-600 mb-6">
                  The booking you're looking for doesn't exist or you don't have
                  permission to view it.
                </p>
                <Link href="/bookings">
                  <Button>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to My Bookings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <Header />

        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="mb-6">
            <Link
              href="/bookings"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to My Bookings
            </Link>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Booking Details
                </h1>
                <p className="text-gray-600 mt-1">Booking ID: {booking.id}</p>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(booking.status)}
                {getPaymentStatusBadge(booking.payment_status)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Property Details */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <div className="relative h-80">
                  <img
                    src={
                      booking.property.images[0] || "/placeholder.svg"
                    }
                    alt={booking.property.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {booking.property.title}
                      </h2>
                      <p className="text-gray-600 flex items-center mb-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {booking.property.location}
                      </p>
                      <p className="text-gray-600 flex items-center">
                        <Home className="w-4 h-4 mr-1" />
                        {booking.property.address}
                      </p>
                    </div>

                    <Link
                      href={`/property/${booking.property_id}`}
                      className="shrink-0"
                    >
                      <Button variant="outline">View Property</Button>
                    </Link>
                  </div>

                  {booking.property.description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Property Description
                      </h3>
                      <p className="text-gray-600">
                        {booking.property.description}
                      </p>
                    </div>
                  )}

                  {booking.property.amenities &&
                    booking.property.amenities.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Amenities
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {booking.property.amenities.map((amenity, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-gray-100"
                            >
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Host Information */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Host Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {booking.host_name}
                      </h3>
                      <p className="text-gray-600">{booking.host_email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Booking Summary */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <CalendarClock className="w-5 h-5 text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Check-in</p>
                        <p className="font-medium">
                          {formatDate(booking.check_in_date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <CalendarClock className="w-5 h-5 text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Check-out</p>
                        <p className="font-medium">
                          {formatDate(booking.check_out_date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Guests</p>
                        <p className="font-medium">{booking.guests_count}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-medium">
                          {calculateNights(
                            booking.check_in_date,
                            booking.check_out_date
                          )}{" "}
                          nights
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center">
                      <CreditCard className="w-5 h-5 text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Payment</p>
                        <p className="font-medium">
                          ${booking.total_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {booking.special_requests && (
                      <div className="pt-2">
                        <div className="flex items-start">
                          <MessageSquare className="w-5 h-5 text-gray-500 mr-3 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-600">
                              Special Requests
                            </p>
                            <p className="font-medium">
                              {booking.special_requests}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>

                {canCancelBooking() && (
                  <CardFooter className="pt-2 pb-6">
                    <Dialog
                      open={cancelDialogOpen}
                      onOpenChange={setCancelDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel Booking
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cancel Booking</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to cancel this booking? This
                            action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <p className="text-sm text-gray-600 mb-2">
                            Booking for:{" "}
                            <span className="font-medium">
                              {booking.property.title}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            Check-in:{" "}
                            <span className="font-medium">
                              {formatDate(booking.check_in_date)}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Total amount:{" "}
                            <span className="font-medium">
                              ${booking.total_amount.toFixed(2)}
                            </span>
                          </p>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setCancelDialogOpen(false)}
                            disabled={cancelling}
                          >
                            Keep Booking
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleCancelBooking}
                            disabled={cancelling}
                          >
                            {cancelling
                              ? "Cancelling..."
                              : "Confirm Cancellation"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                )}
              </Card>

              {/* Booking Timeline */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Booking Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex">
                      <div className="mr-3 relative">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="absolute top-8 bottom-0 left-4 w-0.5 bg-gray-200"></div>
                      </div>
                      <div>
                        <p className="font-medium">Booking Created</p>
                        <p className="text-sm text-gray-600">
                          {new Date(booking.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="mr-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${booking.status === "confirmed" || booking.status === "completed" ? "bg-green-100" : booking.status === "cancelled" ? "bg-red-100" : "bg-gray-100"}`}
                        >
                          {booking.status === "confirmed" ||
                          booking.status === "completed" ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : booking.status === "cancelled" ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium">
                          Booking{" "}
                          {booking.status.charAt(0).toUpperCase() +
                            booking.status.slice(1)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(booking.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
