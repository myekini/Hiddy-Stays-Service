"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInDays } from "date-fns";
import { Calendar, Users, Mail, Phone, User, DollarSign, Clock, Shield } from "lucide-react";
import {
  DialogStack,
  DialogStackOverlay,
  DialogStackBody,
  DialogStackContent,
  DialogStackHeader,
  DialogStackTitle,
  DialogStackDescription,
  DialogStackFooter,
  DialogStackNext,
  DialogStackPrevious,
} from "@/components/ui/dialog-stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Property {
  id: string;
  title: string;
  price_per_night: number;
  max_guests: number;
  images: string[];
  location: string;
  rating?: number;
  review_count?: number;
  cleaning_fee?: number;
  service_fee_percentage?: number;
  cancellation_policy?: string;
  check_in_time?: string;
  check_out_time?: string;
  house_rules?: string[];
  amenities?: string[];
  host_id?: string;
}

interface BookingModalStackProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

export default function BookingModalStack({
  isOpen,
  onClose,
  property,
}: BookingModalStackProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availability, setAvailability] = useState<{ available: boolean; conflicts: any[] } | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const totalNights = checkIn && checkOut ? differenceInDays(new Date(checkOut), new Date(checkIn)) : 0;
  const subtotal = property.price_per_night * totalNights;
  const cleaningFee = property.cleaning_fee || 100;
  const serviceFee = property.service_fee_percentage ? Math.round(subtotal * (property.service_fee_percentage / 100)) : 0;
  const totalAmount = subtotal + cleaningFee + serviceFee;

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setGuestName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim());
          setGuestEmail(user.email || '');
          setGuestPhone(profile.phone || '');
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  // Check availability when dates change
  useEffect(() => {
    if (checkIn && checkOut) {
      checkAvailability();
    }
  }, [checkIn, checkOut]);

  const checkAvailability = async () => {
    setIsCheckingAvailability(true);
    setErrors({});

    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Validate dates
      const newErrors: Record<string, string> = {};
      if (checkInDate < today) {
        newErrors.checkIn = "Check-in date cannot be in the past";
      }
      if (checkOutDate <= checkInDate) {
        newErrors.checkOut = "Check-out date must be after check-in";
      }
      if (totalNights > 30) {
        newErrors.checkOut = "Maximum stay is 30 nights";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setAvailability(null);
        return;
      }

      // Check for existing bookings
      // Fetch all active bookings and check for overlaps manually
      const { data: allBookings, error } = await supabase
        .from("bookings")
        .select("check_in_date, check_out_date")
        .eq("property_id", property.id)
        .in("status", ["confirmed", "pending"]); // Only check active bookings

      if (error) throw error;

      // Check for date overlaps manually
      // Two date ranges overlap if: start1 < end2 AND start2 < end1
      // Reuse checkInDate and checkOutDate from above
      
      const conflicts = (allBookings || []).filter((booking) => {
        const existingCheckIn = new Date(booking.check_in_date);
        const existingCheckOut = new Date(booking.check_out_date);
        
        // Check if ranges overlap (check-out dates are exclusive)
        return (
          checkInDate < existingCheckOut && 
          existingCheckIn < checkOutDate
        );
      });

      const hasConflicts = conflicts.length > 0;
      setAvailability({
        available: !hasConflicts,
        conflicts: hasConflicts ? conflicts.map(c => ({
          checkIn: c.check_in_date,
          checkOut: c.check_out_date,
        })) : [],
      });
    } catch (error) {
      console.error("Error checking availability:", error);
      toast({
        title: "Error",
        description: "Failed to check availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const validateContactInfo = () => {
    const newErrors: Record<string, string> = {};
    if (!guestName || guestName.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      newErrors.email = "Valid email address is required";
    }
    if (!guestPhone || guestPhone.trim().length < 10) {
      newErrors.phone = "Valid phone number is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createBooking = async () => {
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create booking via API
      const bookingResponse = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          checkIn,
          checkOut,
          guests,
          totalAmount,
          guestInfo: {
            userId: user?.id || null,
            name: guestName,
            email: guestEmail,
            phone: guestPhone,
            specialRequests: "",
          },
        }),
      });

      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json();
        throw new Error(errorData.message || errorData.error || "Failed to create booking");
      }

      const bookingResult = await bookingResponse.json();
      const { bookingId } = bookingResult;

      // Show success message for booking creation
      toast({
        title: "Booking Created! 🎉",
        description: "Your booking request has been submitted. Redirecting to payment...",
      });

      onClose();
      router.push(`/booking/${bookingId}/pay`);
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({
        title: "Booking Error",
        description: error instanceof Error ? error.message : "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DialogStack open={isOpen} onOpenChange={onClose} clickable>
      <DialogStackOverlay />
      <DialogStackBody className="max-w-2xl">
        {/* Step 1: Select Dates */}
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Your Dates
            </DialogStackTitle>
            <DialogStackDescription>
              Choose your check-in and check-out dates
            </DialogStackDescription>
          </DialogStackHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Check-in *</label>
                <Input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className={errors.checkIn ? "border-red-500" : ""}
                />
                {errors.checkIn && <p className="text-red-500 text-sm mt-1">{errors.checkIn}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Check-out *</label>
                <Input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split("T")[0]}
                  className={errors.checkOut ? "border-red-500" : ""}
                />
                {errors.checkOut && <p className="text-red-500 text-sm mt-1">{errors.checkOut}</p>}
              </div>
            </div>

            {isCheckingAvailability && (
              <Alert>
                <Clock className="w-4 h-4 animate-spin" />
                <AlertDescription>Checking availability...</AlertDescription>
              </Alert>
            )}

            {availability && !isCheckingAvailability && (
              <Alert className={availability.available ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                <AlertDescription className={availability.available ? "text-green-800" : "text-red-800"}>
                  {availability.available
                    ? `✓ ${totalNights} night${totalNights > 1 ? 's' : ''} available`
                    : `✗ Selected dates not available`}
                </AlertDescription>
              </Alert>
            )}

            {checkIn && checkOut && totalNights > 0 && availability?.available && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-blue-900">{totalNights} nights</p>
                    <p className="text-sm text-blue-700">
                      {checkIn && checkOut ? (
                        <>
                          {format(new Date(checkIn), "MMM dd")} - {format(new Date(checkOut), "MMM dd, yyyy")}
                        </>
                      ) : (
                        "Select dates"
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-700">Estimated total</p>
                    <p className="text-lg font-bold text-blue-900">${subtotal}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogStackFooter>
            <DialogStackNext disabled={!availability?.available || totalNights === 0}>
              Continue
            </DialogStackNext>
          </DialogStackFooter>
        </DialogStackContent>

        {/* Step 2: Select Guests */}
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Number of Guests
            </DialogStackTitle>
            <DialogStackDescription>
              How many guests will be staying?
            </DialogStackDescription>
          </DialogStackHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setGuests(Math.max(1, guests - 1))}
                disabled={guests <= 1}
              >
                -
              </Button>
              <div className="text-center min-w-[100px]">
                <div className="text-3xl font-bold">{guests}</div>
                <div className="text-sm text-muted-foreground">
                  of {property.max_guests} max
                </div>
              </div>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setGuests(Math.min(property.max_guests, guests + 1))}
                disabled={guests >= property.max_guests}
              >
                +
              </Button>
            </div>

            <Alert>
              <Shield className="w-4 h-4" />
              <AlertDescription>
                • Check-in: {property.check_in_time || "3:00 PM"}<br />
                • Check-out: {property.check_out_time || "11:00 AM"}
              </AlertDescription>
            </Alert>
          </div>

          <DialogStackFooter>
            <DialogStackPrevious />
            <DialogStackNext>Continue</DialogStackNext>
          </DialogStackFooter>
        </DialogStackContent>

        {/* Step 3: Contact Information */}
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Contact Information
            </DialogStackTitle>
            <DialogStackDescription>
              We'll use this to send your booking confirmation
            </DialogStackDescription>
          </DialogStackHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Full Name *</label>
              <Input
                placeholder="John Doe"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Email Address *</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Phone Number *</label>
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <Alert className="bg-green-50 border-green-200">
              <Shield className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your information is secure and will only be used for this booking
              </AlertDescription>
            </Alert>
          </div>

          <DialogStackFooter>
            <DialogStackPrevious />
            <DialogStackNext
              onClick={() => {
                if (!validateContactInfo()) {
                  return false;
                }
                return true;
              }}
            >
              Continue to Review
            </DialogStackNext>
          </DialogStackFooter>
        </DialogStackContent>

        {/* Step 4: Review & Confirm */}
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Review Your Booking
            </DialogStackTitle>
            <DialogStackDescription>
              Please review all details before confirming
            </DialogStackDescription>
          </DialogStackHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dates</span>
                <span className="font-medium">
                  {checkIn && checkOut ? (
                    <>
                      {format(new Date(checkIn), "MMM dd")} - {format(new Date(checkOut), "MMM dd, yyyy")}
                    </>
                  ) : (
                    "Not selected"
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guests</span>
                <span className="font-medium">{guests} guest{guests > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nights</span>
                <span className="font-medium">{totalNights}</span>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Price Breakdown</h3>
              <div className="flex justify-between text-sm">
                <span>${property.price_per_night} × {totalNights} nights</span>
                <span>${subtotal}</span>
              </div>
              {cleaningFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Cleaning fee</span>
                  <span>${cleaningFee}</span>
                </div>
              )}
              {serviceFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Service fee</span>
                  <span>${serviceFee}</span>
                </div>
              )}
              {(cleaningFee === 0 && serviceFee === 0) && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  ✓ Zero platform fees!
                </Badge>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>${totalAmount}</span>
              </div>
            </div>
          </div>

          <DialogStackFooter>
            <DialogStackPrevious />
            <Button
              onClick={createBooking}
              disabled={isProcessing}
              className="min-w-[160px]"
            >
              {isProcessing ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Book for $${totalAmount}`
              )}
            </Button>
          </DialogStackFooter>
        </DialogStackContent>
      </DialogStackBody>
    </DialogStack>
  );
}
