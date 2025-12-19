import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  Home,
  Mail,
  MapPin,
  Shield,
  Star,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, isBefore, differenceInDays } from "date-fns";

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

interface BookingData {
  checkIn: string;
  checkOut: string;
  guests: number;
  totalNights: number;
  totalAmount: number;
  cleaningFee: number;
  serviceFee: number;
  subtotal: number;
}

interface BookingCreatePayload {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  guestInfo: {
    userId?: string;
    name: string;
    email: string;
    phone: string;
    specialRequests: string;
  };
}

interface AvailabilityData {
  available: boolean;
  conflicts: Array<{
    checkIn: string;
    checkOut: string;
  }>;
}

import { DateRange } from "react-day-picker";

interface EnhancedBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  onBookingConfirm?: (details: any) => void;
  initialDateRange?: DateRange;
}

const EnhancedBookingModal: React.FC<EnhancedBookingModalProps> = ({
  isOpen,
  onClose,
  property,
  onBookingConfirm,
  initialDateRange,
}) => {
  const router = useRouter();
  const [step, setStep] = useState<
    "dates" | "guests" | "contact" | "review" | "payment" | "confirmation"
  >("dates");
  const [bookingData, setBookingData] = useState<BookingData>({
    checkIn: initialDateRange?.from ? format(initialDateRange.from, "yyyy-MM-dd") : "",
    checkOut: initialDateRange?.to ? format(initialDateRange.to, "yyyy-MM-dd") : "",
    guests: 1,
    totalNights: 0,
    totalAmount: 0,
    cleaningFee: property.cleaning_fee || 100,
    serviceFee: 0,
    subtotal: 0,
  });

  const [availability, setAvailability] = useState<AvailabilityData | null>(
    null
  );
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userProfile, setUserProfile] = useState<any>(null);
  const [guestInfo, setGuestInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const { toast } = useToast();

  // Progress tracking
  const steps = [
    { id: "dates", title: "Dates", description: "Select your stay dates" },
    { id: "guests", title: "Guests", description: "Choose number of guests" },
    { id: "contact", title: "Contact", description: "Your contact information" },
    { id: "review", title: "Review", description: "Confirm your booking" },
    { id: "payment", title: "Payment", description: "Complete payment" },
    {
      id: "confirmation",
      title: "Confirmation",
      description: "Booking confirmed",
    },
  ];

  const getProgressSteps = () => {
    return steps.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      completed:
        steps.indexOf(s) <
        steps.indexOf({ id: step, title: "", description: "" }),
      current: s.id === step,
    }));
  };

  const getProgressPercentage = () => {
    const currentStep = steps.findIndex((s) => s.id === step);
    return ((currentStep + 1) / steps.length) * 100;
  };

  // Get current step index for progress tracking
  const currentStepIndex = steps.findIndex((s) => s.id === step);

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
    if (initialDateRange?.from && initialDateRange?.to) {
      checkAvailability(format(initialDateRange.from, "yyyy-MM-dd"), format(initialDateRange.to, "yyyy-MM-dd"));
    }
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  const loadUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setUserProfile(profile);

        // Pre-fill guest info if user is logged in
        if (profile) {
          setGuestInfo({
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            email: user.email || '',
            phone: profile.phone || '',
          });
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const validateDates = useCallback(
    (checkIn: string, checkOut: string): Record<string, string> => {
      const errors: Record<string, string> = {};
      const today = new Date();
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      if (isBefore(checkInDate, today)) {
        errors.checkIn = "Check-in date cannot be in the past";
      }

      if (isBefore(checkOutDate, checkInDate)) {
        errors.checkOut = "Check-out date must be after check-in date";
      }

      if (differenceInDays(checkOutDate, checkInDate) > 30) {
        errors.checkOut = "Maximum stay is 30 nights";
      }

      if (differenceInDays(checkOutDate, checkInDate) < 1) {
        errors.checkOut = "Minimum stay is 1 night";
      }

      return errors;
    },
    []
  );

  const checkAvailability = async (checkIn: string, checkOut: string) => {
    setIsCheckingAvailability(true);
    setErrors({});

    try {
      const dateErrors = validateDates(checkIn, checkOut);
      if (Object.keys(dateErrors).length > 0) {
        setErrors(dateErrors);
        setAvailability(null);
        return;
      }

      // Check availability via dedicated API endpoint (uses service role to see all bookings)
      const response = await fetch("/api/bookings/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          checkIn,
          checkOut,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check availability");
      }

      const data = await response.json();

      setAvailability({
        available: data.available,
        conflicts: data.conflicts || [],
      });

      if (data.available) {
        calculateTotal(checkIn, checkOut, bookingData.guests);
      }
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

  const calculateTotal = (
    checkIn: string,
    checkOut: string,
    guests: number
  ) => {
    const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
    const subtotal = property.price_per_night * nights;
    const cleaningFee = property.cleaning_fee || 100;
    const serviceFeePercentage = property.service_fee_percentage || 12;
    const serviceFee = Math.round(subtotal * (serviceFeePercentage / 100));
    const total = subtotal + cleaningFee + serviceFee;

    setBookingData((prev) => ({
      ...prev,
      checkIn,
      checkOut,
      guests,
      totalNights: nights,
      subtotal,
      cleaningFee,
      serviceFee,
      totalAmount: total,
    }));
  };

  const handleDateChange = (type: "checkIn" | "checkOut", value: string) => {
    const newData = { ...bookingData, [type]: value };
    setBookingData(newData);

    if (newData.checkIn && newData.checkOut) {
      checkAvailability(newData.checkIn, newData.checkOut);
    }
  };

  const handleGuestChange = (value: number) => {
    if (value >= 1 && value <= property.max_guests) {
      setBookingData((prev) => ({ ...prev, guests: value }));
      if (bookingData.checkIn && bookingData.checkOut) {
        calculateTotal(bookingData.checkIn, bookingData.checkOut, value);
      }
    }
  };

  const handleNext = () => {
    if (
      step === "dates" &&
      availability?.available &&
      bookingData.totalNights > 0
    ) {
      setStep("guests");
    } else if (step === "guests") {
      setStep("contact");
    } else if (step === "contact") {
      // Validate guest info
      const newErrors: Record<string, string> = {};
      if (!guestInfo.name || guestInfo.name.trim().length < 2) {
        newErrors.name = "Name must be at least 2 characters";
      }
      if (!guestInfo.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)) {
        newErrors.email = "Valid email address is required";
      }
      
      // Enhanced phone validation - check for country code
      if (!guestInfo.phone || guestInfo.phone.trim().length === 0) {
        newErrors.phone = "Phone number is required";
      } else {
        const phone = guestInfo.phone.trim();
        // Check if phone starts with + (country code)
        if (!phone.startsWith("+")) {
          // Auto-format: if it's a 10-digit US/Canada number, add +1
          const digitsOnly = phone.replace(/\D/g, "");
          if (digitsOnly.length === 10) {
            // Auto-format to +1 format
            setGuestInfo({ ...guestInfo, phone: `+1${digitsOnly}` });
          } else {
            newErrors.phone = "Please include country code (e.g., +1 for North America)";
          }
        } else if (phone.startsWith("+") && phone.length < 8) {
          newErrors.phone = "Please enter a complete phone number with country code";
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setErrors({});
      setStep("review");
    } else if (step === "review") {
      setStep("payment");
    }
  };

  const handleBack = () => {
    if (step === "guests") setStep("dates");
    if (step === "contact") setStep("guests");
    if (step === "review") setStep("contact");
    if (step === "payment") setStep("review");
  };

  const createBooking = async () => {
    setIsProcessing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        toast({
          title: "Continuing as guest",
          description: "You can complete this reservation without signing in.",
          variant: "info",
        });
      }

      // Prepare booking data
      const bookingPayload: BookingCreatePayload = {
        propertyId: property.id,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests,
        totalAmount: bookingData.totalAmount,
        guestInfo: {
          userId: session?.user?.id,
          name: guestInfo.name.trim(),
          email: guestInfo.email.trim(),
          phone: guestInfo.phone.trim(),
          specialRequests: "",
        },
      };

      // Create booking via API (handles both logged-in and guest users)
      const bookingResponse = await fetch("/api/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingPayload),
      });

      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json().catch(() => ({} as any));

        if (bookingResponse.status === 401 || bookingResponse.status === 403) {
          toast({
            title: "Sign in required",
            description: "Please sign in to complete your reservation.",
            variant: "destructive",
          });
          const next = `${window.location.pathname}${window.location.search}`;
          onClose();
          router.push(`/auth?mode=signin&next=${encodeURIComponent(next)}`);
          return;
        }

        const validationErrors: string[] = Array.isArray(errorData?.details)
          ? (errorData.details as string[])
          : Array.isArray(errorData?.details?.validationErrors)
            ? (errorData.details.validationErrors as string[])
            : [];
        
        // Handle validation errors - show specific field errors
        if (validationErrors.length > 0) {
          const fieldErrors: Record<string, string> = {};
          
          // Map validation errors to form fields
          validationErrors.forEach((error: string) => {
            if (error.toLowerCase().includes("name")) {
              fieldErrors.name = error;
            } else if (error.toLowerCase().includes("email")) {
              fieldErrors.email = error;
            } else if (error.toLowerCase().includes("phone")) {
              fieldErrors.phone = error;
            } else if (error.toLowerCase().includes("check-in") || error.toLowerCase().includes("date")) {
              // Date errors - go back to dates step
              setStep("dates");
              setErrors({ dates: error });
            } else if (error.toLowerCase().includes("guest")) {
              setStep("guests");
              setErrors({ guests: error });
            }
          });
          
          // Set field-specific errors if any
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            setStep("contact"); // Go back to contact step if there are contact errors
          }
          
          // Show toast with all validation errors
          toast({
            title: "Validation Error",
            description: validationErrors.join(". "),
            variant: "destructive",
          });
          
          // Don't throw - let user fix the errors
          return;
        }

        // Handle availability conflicts (409) gracefully
        if (bookingResponse.status === 409) {
          setStep("dates");
          toast({
            title: "Dates Unavailable",
            description: errorData.message || "The property has been booked for these dates. Please select different dates.",
            variant: "destructive",
          });
          // Re-check availability to update the UI with the new conflict
          checkAvailability(bookingData.checkIn, bookingData.checkOut);
          return;
        }
        
        // For other errors, throw with the message
        throw new Error(errorData.message || errorData.error || "Failed to create booking");
      }

      const bookingResult = await bookingResponse.json();

      if (!bookingResult.success) {
        throw new Error(bookingResult.message || "Failed to create booking");
      }

      const bookingId = bookingResult.bookingId;
      const accessToken =
        typeof bookingResult.accessToken === "string" ? bookingResult.accessToken : "";

      toast({
        title: "Booking Created!",
        description:
          "Your booking has been created. Proceeding to payment...",
        variant: "success",
      });

      if (onBookingConfirm) {
        onBookingConfirm(bookingId);
      }

      onClose();
      router.push(
        accessToken
          ? `/booking/${bookingId}/pay?token=${encodeURIComponent(accessToken)}`
          : `/booking/${bookingId}/pay`
      );
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Booking Error",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepNumber = (currentStep: typeof step): number => {
    const steps = ["dates", "guests", "contact", "review", "payment", "confirmation"];
    return steps.indexOf(currentStep) + 1;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
          <div>
            <h2 id="booking-modal-title" className="text-2xl font-bold text-slate-900 dark:text-white">
              Complete Booking
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Step {getStepNumber(step)} of 5
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
            className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Property Info - Compact */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <img
                src={property.images?.[0] || '/placeholder.svg'}
                alt={property.title}
                className="w-full h-full object-cover rounded-xl ring-2 ring-slate-200 dark:ring-slate-700"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate text-lg">
                {property.title}
              </h3>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center text-slate-600 dark:text-slate-400 text-sm">
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  <span className="truncate">{property.location}</span>
                </div>
                {property.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {property.rating}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-2 inline-flex items-baseline gap-1 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  ${property.price_per_night}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">/night</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-240px)]">
          {/* Modern Progress Tracking */}
          <div className="p-6 border-b border-border/50 bg-white dark:bg-slate-900">
            <div className="max-w-3xl mx-auto">
              {/* Progress Steps */}
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-100 dark:bg-slate-700 -translate-y-1/2">
                  <div 
                    className="h-full bg-brand-500 transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                  />
                </div>
                
                {/* Steps */}
                <div className="relative flex justify-between">
                  {steps.slice(0, -1).map((stepItem, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const isUpcoming = index > currentStepIndex;
                    
                    return (
                      <div key={stepItem.id} className="flex flex-col items-center z-10">
                        {/* Step Circle */}
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                          isCompleted 
                            ? 'bg-brand-500 border-brand-500 text-white' 
                            : isCurrent 
                              ? 'bg-white border-brand-500 text-brand-500 shadow-lg shadow-brand-500/20'
                              : 'bg-white border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500'
                        }`}>
                          {isCompleted ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <span className={`text-sm font-medium ${isCurrent ? 'text-brand-600 dark:text-brand-400' : ''}`}>
                              {index + 1}
                            </span>
                          )}
                        </div>
                        
                        {/* Step Label */}
                        <div className={`mt-2 text-center px-1 ${isCurrent ? 'min-w-[80px]' : 'min-w-[60px]'}`}>
                          <div className={`text-xs font-medium transition-colors ${
                            isCurrent 
                              ? 'text-brand-600 dark:text-brand-400 font-semibold' 
                              : isCompleted 
                                ? 'text-gray-600 dark:text-gray-300'
                                : 'text-gray-400 dark:text-slate-500'
                          }`}>
                            {stepItem.title}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Current Step Description */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {steps[currentStepIndex]?.description}
                </p>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Step {currentStepIndex + 1} of {steps.length - 1}
                </div>
              </div>
            </div>
          </div>

        {/* Steps */}
        <div className="p-6">
          {/* Step Content */}
          {step === "dates" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Select Dates
                </h3>
                <p className="text-sm text-gray-600">
                  Choose your check-in and check-out dates
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Check-in Date *
                  </label>
                  <Input
                    type="date"
                    value={bookingData.checkIn}
                    onChange={(e) =>
                      handleDateChange("checkIn", e.target.value)
                    }
                    min={new Date().toISOString().split("T")[0]}
                    className={`w-full text-base ${errors.checkIn ? "border-red-500" : ""}`}
                  />
                  {errors.checkIn && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.checkIn}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Check-out Date *
                  </label>
                  <Input
                    type="date"
                    value={bookingData.checkOut}
                    onChange={(e) =>
                      handleDateChange("checkOut", e.target.value)
                    }
                    min={
                      bookingData.checkIn ||
                      new Date().toISOString().split("T")[0]
                    }
                    className={`w-full text-base ${errors.checkOut ? "border-red-500" : ""}`}
                  />
                  {errors.checkOut && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.checkOut}
                    </p>
                  )}
                </div>
              </div>

              {/* Show nights count if dates selected */}
              {bookingData.checkIn && bookingData.checkOut && bookingData.totalNights > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">
                        {bookingData.totalNights} night{bookingData.totalNights > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-blue-700">
                        {format(new Date(bookingData.checkIn), "MMM dd")} - {format(new Date(bookingData.checkOut), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-700">Estimated total</p>
                      <p className="text-lg font-bold text-blue-900">
                        ${property.price_per_night * bookingData.totalNights}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Availability Status */}
              {isCheckingAvailability && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Checking availability...</span>
                </div>
              )}

              {availability && !isCheckingAvailability && (
                <Alert
                  className={
                    availability.available
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }
                >
                  <AlertCircle
                    className={`w-4 h-4 ${availability.available ? "text-green-600" : "text-red-600"}`}
                  />
                  <AlertDescription
                    className={
                      availability.available ? "text-green-800" : "text-red-800"
                    }
                  >
                    {availability.available
                      ? `${bookingData.totalNights} night${bookingData.totalNights > 1 ? "s" : ""} available`
                      : "Selected dates are not available"}
                  </AlertDescription>
                </Alert>
              )}

              {availability?.conflicts && availability.conflicts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">
                    Conflicting Bookings:
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {availability.conflicts.map((conflict, index) => (
                      <li key={index}>
                        {format(new Date(conflict.checkIn), "MMM dd")} -{" "}
                        {format(new Date(conflict.checkOut), "MMM dd, yyyy")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === "guests" && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground">
                Number of Guests
              </h3>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGuestChange(bookingData.guests - 1)}
                  disabled={bookingData.guests <= 1}
                >
                  -
                </Button>
                <span className="text-2xl font-semibold">
                  {bookingData.guests}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGuestChange(bookingData.guests + 1)}
                  disabled={bookingData.guests >= property.max_guests}
                >
                  +
                </Button>
                <span className="text-gray-600">
                  of {property.max_guests} guests
                </span>
              </div>

              {/* Guest Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">
                  Guest Guidelines
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Maximum {property.max_guests} guests allowed</li>
                  <li>• Check-in: {property.check_in_time || "3:00 PM"}</li>
                  <li>• Check-out: {property.check_out_time || "11:00 AM"}</li>
                </ul>
              </div>
            </div>
          )}

          {step === "contact" && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground">
                Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={guestInfo.name}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, name: e.target.value })
                    }
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={guestInfo.email}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, email: e.target.value })
                    }
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={guestInfo.phone}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Allow only digits, +, spaces, parentheses, and hyphens
                      value = value.replace(/[^\d+\s()-]/g, "");
                      setGuestInfo({ ...guestInfo, phone: value });
                    }}
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                  {!errors.phone && (
                    <p className="text-gray-500 text-xs mt-1">
                      Include country code (e.g., +1 for US/Canada)
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-800 font-medium">
                    Your information is secure and will only be used for this booking
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground">
                Review Your Booking
              </h3>

              {/* Booking Summary */}
              <Card className="p-4">
                <h4 className="font-semibold text-foreground mb-3">
                  Booking Summary
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-in</span>
                    <span>
                      {format(new Date(bookingData.checkIn), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-out</span>
                    <span>
                      {format(new Date(bookingData.checkOut), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Guests</span>
                    <span>
                      {bookingData.guests} guest
                      {bookingData.guests > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nights</span>
                    <span>
                      {bookingData.totalNights} night
                      {bookingData.totalNights > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Cancellation Policy */}
              {property.cancellation_policy && (
                <Card className="p-4">
                  <h4 className="font-semibold text-foreground mb-2">
                    Cancellation Policy
                  </h4>
                  <p className="text-sm text-gray-600">
                    {property.cancellation_policy}
                  </p>
                </Card>
              )}

              {/* Security Notice */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Your payment is secure and encrypted</span>
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          {step !== "confirmation" && bookingData.totalAmount > 0 && (
            <Card className="p-4 mt-6">
              <h4 className="font-semibold text-foreground mb-3">
                Price Details
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>
                    ${property.price_per_night} × {bookingData.totalNights}{" "}
                    night{bookingData.totalNights > 1 ? "s" : ""}
                  </span>
                  <span>${bookingData.subtotal.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                  <span>Estimated Total</span>
                  <span>${bookingData.totalAmount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Final amount calculated at checkout. Includes all fees.
                </p>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between mt-8">
            {step !== "dates" && step !== "confirmation" && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            <div className="ml-auto">
              {step === "dates" && (
                <Button
                  onClick={handleNext}
                  disabled={
                    !bookingData.checkIn ||
                    !bookingData.checkOut ||
                    !availability?.available ||
                    isCheckingAvailability
                  }
                  className="min-w-[120px]"
                >
                  {isCheckingAvailability ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              )}
              {step === "guests" && (
                <Button onClick={handleNext} className="min-w-[140px]">
                  Continue to Contact
                </Button>
              )}
              {step === "contact" && (
                <Button onClick={handleNext} className="min-w-[140px]">
                  Continue to Review
                </Button>
              )}
              {step === "review" && (
                <Button
                  onClick={createBooking}
                  disabled={isProcessing}
                  className="min-w-[160px]"
                >
                  {isProcessing ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    `Book for $${bookingData.totalAmount}`
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedBookingModal;
export { EnhancedBookingModal };
