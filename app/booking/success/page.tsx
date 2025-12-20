"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Home,
} from "lucide-react";
import LogoImage from "@/components/LogoImage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface BookingDetails {
  id: string;
  reference: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  guestsCount: number;
  totalAmount: number;
  currency: string;
  property: {
    id?: string;
    title: string;
    address?: string;
    city?: string;
    state?: string;
    image?: string | null;
  };
  guest?: {
    name: string;
    email: string;
  };
  payment?: {
    status: string;
    method?: string;
    brand?: string;
    last4?: string;
    receiptUrl?: string;
  };
  // Fallback fields for backward compatibility
  propertyTitle?: string;
  guestName?: string;
  guestEmail?: string;
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");
  const accessToken = searchParams.get("token");
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBookingDetails = useCallback(async () => {
    if (!bookingId) return;

    try {
      const qs = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
      const response = await fetch(`/api/bookings/${bookingId}${qs}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok || !data?.success || !data?.booking) {
        throw new Error(data?.message || data?.error || "Unable to load booking");
      }

      const b = data.booking;
      const mapped: BookingDetails = {
        id: b.id,
        reference: b.reference || b.id,
        status: b.status,
        checkInDate: b.check_in_date,
        checkOutDate: b.check_out_date,
        guestsCount: b.guests_count,
        totalAmount: b.total_amount,
        currency: b.currency || "CAD",
        property: {
          id: b.property?.id,
          title: b.property?.title || b.property_title || "Property",
          address: b.property?.address,
          city: b.property?.city,
          state: b.property?.state,
          image: (b.property?.images && b.property.images[0]) || null,
        },
        guest: {
          name: b.guest_name || b.guest?.name || b.guestName || "Guest",
          email: b.guest_email || b.guest?.email || b.guestEmail || "",
        },
        payment: {
          status: b.payment_status || "pending",
          method: b.payment_method,
        },
        propertyTitle: b.property?.title,
        guestName: b.guest_name,
        guestEmail: b.guest_email,
      };

      setBooking(mapped);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load booking");
      setLoading(false);
    }
  }, [accessToken, bookingId]);

  const verifyPayment = useCallback(async () => {
    try {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      const response = await fetch("/api/payments/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        retryCountRef.current = 0;
        setBooking(data.booking);
        setLoading(false);
      } else {
        if (data?.processing && retryCountRef.current < 10) {
          retryCountRef.current += 1;
          retryTimeoutRef.current = setTimeout(() => {
            verifyPayment();
          }, 2000);
        } else {
          setError(data.message || "Payment verification failed");
          setLoading(false);
        }
      }
    } catch {
      setError("Unable to verify payment. Please check your bookings.");
      setLoading(false);
    } finally {
      // loading is controlled explicitly above to avoid stale state issues
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      setLoading(true);
      setError(null);
      setBooking(null);
      verifyPayment();
    } else if (bookingId) {
      setLoading(true);
      setError(null);
      setBooking(null);
      fetchBookingDetails();
    } else {
      setError("No session or booking ID provided");
      setLoading(false);
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [bookingId, fetchBookingDetails, sessionId, verifyPayment]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatMoney = (amount: number, currency?: string) => {
    const code = (currency || "CAD").toUpperCase();
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-400/10 dark:to-purple-400/10 flex items-center justify-center ring-1 ring-blue-500/20 dark:ring-blue-400/20 mx-auto mb-4">
            <LogoImage variant="icon" size="md" />
          </div>
          <p className="text-muted-foreground">Confirming your booking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Verification Issue
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/bookings">View My Bookings</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {booking?.payment?.status === "paid" ? "Booking Confirmed ✓" : "Booking Created"}
          </h1>
          <p className="text-muted-foreground">
            {booking?.payment?.status === "paid"
              ? "Your reservation is confirmed and paid."
              : "Complete payment to confirm your reservation."}
          </p>
        </div>

        {booking && (
          <Card className="p-6 mb-6 bg-card">
            {/* Property with Image */}
            <div className="flex gap-4 mb-4">
              {booking.property?.image ? (
                <img 
                  src={booking.property.image} 
                  alt={booking.property?.title || "Property"}
                  className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center shrink-0">
                  <Home className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Property</p>
                <p className="font-semibold text-foreground line-clamp-2">
                  {booking.property?.title || booking.propertyTitle}
                </p>
                {(booking.property?.address || booking.property?.city) && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {booking.property?.address || `${booking.property?.city}, ${booking.property?.state}`}
                  </p>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1" /> Check-in
                </p>
                <p className="font-medium text-foreground">
                  {formatDate(booking.checkInDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1" /> Check-out
                </p>
                <p className="font-medium text-foreground">
                  {formatDate(booking.checkOutDate)}
                </p>
              </div>
            </div>

            {/* Guests & Total */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1" /> Guests
                </p>
                <p className="font-medium text-foreground">
                  {booking.guestsCount} {booking.guestsCount === 1 ? "guest" : "guests"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center">
                  <CreditCard className="w-3.5 h-3.5 mr-1" /> Total Paid
                </p>
                <p className="font-semibold text-green-600 dark:text-green-400 text-lg">
                  {formatMoney(Number(booking.totalAmount) || 0, booking.currency)}
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Confirmation sent to */}
            <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
              <p className="text-sm text-muted-foreground">
                Confirmation sent to: <span className="font-medium text-foreground">
                  {booking.guest?.email || booking.guestEmail}
                </span>
              </p>
            </div>
          </Card>
        )}

        {/* What's Next */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-6">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
            What's next?
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Check your email for booking details and check-in instructions.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {booking?.payment?.status === "paid" ? (
            <>
              <Button asChild className="w-full h-12 text-base">
                <Link href="/bookings">
                  View My Bookings
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full h-12 text-base">
                <Link href="/properties">
                  Browse Properties
                </Link>
              </Button>
            </>
          ) : (
            <>
              {(bookingId || booking?.id) && (
                <Button asChild className="w-full h-12 text-base">
                  <Link
                    href={
                      accessToken
                        ? `/booking/${bookingId || booking?.id}/pay?token=${encodeURIComponent(accessToken)}`
                        : `/booking/${bookingId || booking?.id}/pay`
                    }
                  >
                    Complete Payment
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild className="w-full h-12 text-base">
                <Link href="/properties">
                  Browse Properties
                </Link>
              </Button>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-4">
            Questions?{" "}
            <a href="mailto:support@hiddystays.com" className="text-foreground underline">
              support@hiddystays.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-400/10 dark:to-purple-400/10 flex items-center justify-center ring-1 ring-blue-500/20 dark:ring-blue-400/20 mx-auto">
            <LogoImage variant="icon" size="md" />
          </div>
        </div>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  );
}
