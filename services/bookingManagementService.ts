import { supabase } from "@/integrations/supabase/client";
import { unifiedEmailService } from "@/lib/unified-email-service";

export interface BookingRequest {
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  guestsCount: number;
  specialRequests?: string;
  userId: string;
}

export interface BookingUpdateRequest {
  bookingId: string;
  checkInDate?: string;
  checkOutDate?: string;
  guestsCount?: number;
  specialRequests?: string;
}

export interface AvailabilityCheck {
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
}

export interface BookingValidationResult {
  isValid: boolean;
  errors: string[];
  conflicts?: Array<{
    checkIn: string;
    checkOut: string;
  }>;
}

export interface BookingSummary {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyImage: string;
  hostName: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  guestsCount: number;
  totalAmount: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt: string;
  updatedAt: string;
  stripePaymentIntentId?: string;
  specialRequests?: string;
}

class BookingManagementService {
  // Check availability for a property
  async checkAvailability(
    request: AvailabilityCheck
  ): Promise<BookingValidationResult> {
    try {
      const { propertyId, checkInDate, checkOutDate } = request;

      // Validate dates
      const validation = this.validateDates(checkInDate, checkOutDate);
      if (!validation.isValid) {
        return validation;
      }

      // Check for existing bookings in the date range
      // Fetch all active bookings and check for overlaps manually
      const { data: allBookings, error } = await supabase
        .from("bookings")
        .select("check_in_date, check_out_date, status")
        .eq("property_id", propertyId)
        .in("status", ["confirmed", "pending"]); // Only check active bookings

      if (error) {
        throw error;
      }

      // Check for date overlaps manually
      // Two date ranges overlap if: start1 < end2 AND start2 < end1
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      
      const conflicts = (allBookings || []).filter((booking) => {
        const existingCheckIn = new Date(booking.check_in_date);
        const existingCheckOut = new Date(booking.check_out_date);
        
        // Check if ranges overlap (check-out dates are exclusive)
        return (
          checkIn < existingCheckOut && 
          existingCheckIn < checkOut
        );
      });

      const hasConflicts = conflicts.length > 0;

      return {
        isValid: !hasConflicts,
        errors: hasConflicts ? ["Selected dates are not available"] : [],
        conflicts: hasConflicts
          ? conflicts.map((conflict) => ({
              checkIn: conflict.check_in_date,
              checkOut: conflict.check_out_date,
            }))
          : undefined,
      };
    } catch (error) {
      console.error("Error checking availability:", error);
      return {
        isValid: false,
        errors: ["Failed to check availability. Please try again."],
      };
    }
  }

  // Create a new booking
  async createBooking(
    request: BookingRequest
  ): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    try {
      const {
        propertyId,
        checkInDate,
        checkOutDate,
        guestsCount,
        specialRequests,
        userId,
      } = request;

      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError || !userProfile) {
        return { success: false, error: "User profile not found" };
      }

      // Get property details
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("*, profiles!properties_host_id_fkey(*)")
        .eq("id", propertyId)
        .single();

      if (propertyError || !property) {
        return { success: false, error: "Property not found" };
      }

      // Validate booking request
      const validation = await this.validateBookingRequest(request);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(", ") };
      }

      // Calculate total amount
      const totalAmount = this.calculateTotalAmount(
        property.price_per_night,
        checkInDate,
        checkOutDate
      );

      // Create booking record
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          property_id: propertyId,
          guest_id: userProfile.id,
          host_id: property.host_id,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          guests_count: guestsCount,
          total_amount: totalAmount,
          status: "pending",
          special_requests: specialRequests || null,
        })
        .select()
        .single();

      if (bookingError) {
        throw bookingError;
      }

      console.log("✅ Booking created:", booking.id);

      return { success: true, bookingId: booking.id };
    } catch (error) {
      console.error("Error creating booking:", error);
      return {
        success: false,
        error: "Failed to create booking. Please try again.",
      };
    }
  }

  // Update an existing booking
  async updateBooking(
    request: BookingUpdateRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        bookingId,
        checkInDate,
        checkOutDate,
        guestsCount,
        specialRequests,
      } = request;

      // Get existing booking
      const { data: existingBooking, error: fetchError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (fetchError || !existingBooking) {
        return { success: false, error: "Booking not found" };
      }

      // Check if booking can be modified
      if (
        existingBooking.status !== "pending" &&
        existingBooking.status !== "confirmed"
      ) {
        return {
          success: false,
          error: "Booking cannot be modified in its current state",
        };
      }

      // Validate new dates if provided
      if (checkInDate && checkOutDate) {
        const validation = await this.checkAvailability({
          propertyId: existingBooking.property_id,
          checkInDate,
          checkOutDate,
        });

        if (!validation.isValid) {
          return { success: false, error: validation.errors.join(", ") };
        }
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (checkInDate) updateData.check_in_date = checkInDate;
      if (checkOutDate) updateData.check_out_date = checkOutDate;
      if (guestsCount) updateData.guests_count = guestsCount;
      if (specialRequests !== undefined)
        updateData.special_requests = specialRequests;

      // Update booking
      const { error: updateError } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", bookingId);

      if (updateError) {
        throw updateError;
      }

      console.log("✅ Booking updated:", bookingId);

      return { success: true };
    } catch (error) {
      console.error("Error updating booking:", error);
      return {
        success: false,
        error: "Failed to update booking. Please try again.",
      };
    }
  }

  // Cancel a booking
  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get booking details
      const { data: booking, error: fetchError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          properties!bookings_property_id_fkey(*),
          profiles!bookings_guest_id_fkey(*),
          profiles!bookings_host_id_fkey(*)
        `
        )
        .eq("id", bookingId)
        .single();

      if (fetchError || !booking) {
        return { success: false, error: "Booking not found" };
      }

      // Check if user can cancel this booking
      const canCancel =
        booking.guest_id === userId || booking.host_id === userId;
      if (!canCancel) {
        return {
          success: false,
          error: "You are not authorized to cancel this booking",
        };
      }

      // Check if booking can be cancelled
      if (booking.status === "cancelled" || booking.status === "completed") {
        return {
          success: false,
          error: "Booking cannot be cancelled in its current state",
        };
      }

      // Update booking status
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (updateError) {
        throw updateError;
      }

      console.log("✅ Booking cancelled:", bookingId);

      // Send cancellation emails
      await this.sendCancellationEmails(booking, reason);

      return { success: true };
    } catch (error) {
      console.error("Error cancelling booking:", error);
      return {
        success: false,
        error: "Failed to cancel booking. Please try again.",
      };
    }
  }

  // Get user's bookings
  async getUserBookings(
    userId: string,
    status?: string
  ): Promise<{
    success: boolean;
    bookings?: BookingSummary[];
    error?: string;
  }> {
    try {
      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError || !userProfile) {
        return { success: false, error: "User profile not found" };
      }

      // Build query
      let query = supabase
        .from("bookings")
        .select(
          `
          *,
          properties!bookings_property_id_fkey(
            title,
            location,
            property_images!property_images_property_id_fkey(image_url)
          ),
          profiles!bookings_guest_id_fkey(first_name, last_name),
          profiles!bookings_host_id_fkey(first_name, last_name)
        `
        )
        .or(`guest_id.eq.${userProfile.id},host_id.eq.${userProfile.id}`)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data: bookings, error } = await query;

      if (error) {
        throw error;
      }

      // Transform data
      const bookingSummaries: BookingSummary[] = bookings.map(
        (booking: any) => ({
          id: booking.id,
          propertyId: booking.property_id,
          propertyTitle: booking.properties.title,
          propertyLocation: booking.properties.location,
          propertyImage:
            booking.properties.property_images?.[0]?.image_url || "",
          hostName: `${booking.profiles_host_id_fkey.first_name} ${booking.profiles_host_id_fkey.last_name}`,
          guestName: `${booking.profiles_guest_id_fkey.first_name} ${booking.profiles_guest_id_fkey.last_name}`,
          checkInDate: booking.check_in_date,
          checkOutDate: booking.check_out_date,
          guestsCount: booking.guests_count,
          totalAmount: booking.total_amount,
          status: booking.status,
          createdAt: booking.created_at,
          updatedAt: booking.updated_at,
          stripePaymentIntentId: booking.stripe_payment_intent_id,
          specialRequests: booking.special_requests,
        })
      );

      return { success: true, bookings: bookingSummaries };
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      return {
        success: false,
        error: "Failed to fetch bookings. Please try again.",
      };
    }
  }

  // Get booking details
  async getBookingDetails(
    bookingId: string,
    userId: string
  ): Promise<{ success: boolean; booking?: any; error?: string }> {
    try {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          properties!bookings_property_id_fkey(
            *,
            property_images!property_images_property_id_fkey(*)
          ),
          profiles!bookings_guest_id_fkey(*),
          profiles!bookings_host_id_fkey(*)
        `
        )
        .eq("id", bookingId)
        .single();

      if (error || !booking) {
        return { success: false, error: "Booking not found" };
      }

      // Check if user can access this booking
      const canAccess =
        booking.guest_id === userId || booking.host_id === userId;
      if (!canAccess) {
        return {
          success: false,
          error: "You are not authorized to view this booking",
        };
      }

      return { success: true, booking };
    } catch (error) {
      console.error("Error fetching booking details:", error);
      return {
        success: false,
        error: "Failed to fetch booking details. Please try again.",
      };
    }
  }

  // Validate booking request
  private async validateBookingRequest(
    request: BookingRequest
  ): Promise<BookingValidationResult> {
    const errors: string[] = [];

    // Validate dates
    const dateValidation = this.validateDates(
      request.checkInDate,
      request.checkOutDate
    );
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }

    // Validate guest count
    if (request.guestsCount < 1) {
      errors.push("Guest count must be at least 1");
    }

    // Check availability
    const availabilityCheck = await this.checkAvailability({
      propertyId: request.propertyId,
      checkInDate: request.checkInDate,
      checkOutDate: request.checkOutDate,
    });

    if (!availabilityCheck.isValid) {
      errors.push(...availabilityCheck.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate dates
  private validateDates(
    checkInDate: string,
    checkOutDate: string
  ): BookingValidationResult {
    const errors: string[] = [];
    const today = new Date();
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkIn < today) {
      errors.push("Check-in date cannot be in the past");
    }

    if (checkOut <= checkIn) {
      errors.push("Check-out date must be after check-in date");
    }

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (nights > 30) {
      errors.push("Maximum stay is 30 nights");
    }

    if (nights < 1) {
      errors.push("Minimum stay is 1 night");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Calculate total amount
  private calculateTotalAmount(
    pricePerNight: number,
    checkInDate: string,
    checkOutDate: string
  ): number {
    const nights = Math.ceil(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const subtotal = pricePerNight * nights;
    const cleaningFee = 100; // This could be configurable per property
    const serviceFee = Math.round(subtotal * 0.12); // 12% service fee
    return subtotal + cleaningFee + serviceFee;
  }

  // Send cancellation emails
  private async sendCancellationEmails(booking: any, reason?: string) {
    try {
      const emailData = {
        bookingId: booking.id,
        guestName: `${booking.profiles_guest_id_fkey.first_name} ${booking.profiles_guest_id_fkey.last_name}`,
        guestEmail: booking.profiles_guest_id_fkey.email,
        hostName: `${booking.profiles_host_id_fkey.first_name} ${booking.profiles_host_id_fkey.last_name}`,
        hostEmail: booking.profiles_host_id_fkey.email,
        propertyTitle: booking.properties.title,
        propertyLocation: booking.properties.location,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        guestsCount: booking.guests_count,
        totalAmount: booking.total_amount,
        bookingStatus: "cancelled" as const,
      };

      // Send cancellation emails (guest and host)
      await unifiedEmailService.sendBookingCancellation({
        bookingId: booking.id,
        guestName: emailData.guestName,
        guestEmail: emailData.guestEmail,
        hostName: emailData.hostName,
        hostEmail: emailData.hostEmail,
        propertyTitle: emailData.propertyTitle,
        propertyLocation: emailData.propertyLocation,
        checkInDate: emailData.checkInDate,
        checkOutDate: emailData.checkOutDate,
        guests: emailData.guestsCount,
        totalAmount: emailData.totalAmount,
        cancellationReason: reason,
      } as any);
    } catch (error) {
      console.error("Error sending cancellation emails:", error);
    }
  }
}

export const bookingManagementService = new BookingManagementService();
