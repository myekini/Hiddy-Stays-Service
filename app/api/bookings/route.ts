import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { unifiedEmailService } from "@/lib/unified-email-service";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple in-memory rate limiter (per IP)
const __rateLimit = new Map<string, { count: number; reset: number }>();
function allowRequest(ip: string, max = 60, windowMs = 5 * 60 * 1000) {
  const now = Date.now();
  const entry = __rateLimit.get(ip);
  if (!entry || now > entry.reset) {
    __rateLimit.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limit per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!allowRequest(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Require Authorization: Bearer <token>
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);

    // Validate token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get profile (for role and profile.id)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hostId = searchParams.get("host_id");
    const guestId = searchParams.get("guest_id");
    const propertyId = searchParams.get("property_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Validate limit and offset
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: "Offset must be non-negative" },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Get payment_status filter
    const paymentStatus = searchParams.get("payment_status");
    const validPaymentStatuses = [
      "pending",
      "processing",
      "succeeded",
      "failed",
      "refunded",
      "partially_refunded",
      "disputed",
    ];
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        {
          error: `Invalid payment_status. Must be one of: ${validPaymentStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Base query - fetch bookings with related data
    let query = supabase
      .from("bookings")
      .select(
        `
        *,
        properties!bookings_property_id_fkey(
          id,
          title,
          address,
          location,
          price_per_night
        ),
        guest:profiles!bookings_guest_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url
        ),
        host:profiles!bookings_host_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `
      )
      .order("created_at", { ascending: false });

    const isAdmin = profile.role === "admin";
    const isHost = profile.role === "host";

    // Apply role-based scoping
    if (isAdmin) {
      // Admin can filter freely
      if (hostId) query = query.eq("host_id", hostId);
      if (guestId) query = query.eq("guest_id", guestId);
    } else if (isHost) {
      // Host can only see their own hosted bookings
      query = query.eq("host_id", profile.id);
    } else {
      // Guest (regular user) can only see their own bookings
      query = query.eq("guest_id", profile.id);
    }

    if (propertyId) {
      query = query.eq("property_id", propertyId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (paymentStatus) {
      query = query.eq("payment_status", paymentStatus);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    // Auto-complete confirmed bookings that have passed check-out date
    if (bookings && bookings.length > 0) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const bookingsToComplete = bookings.filter(
        (booking: any) =>
          booking.status === 'confirmed' &&
          booking.check_out_date < today
      );

      if (bookingsToComplete.length > 0) {
        const bookingIdsToComplete = bookingsToComplete.map((b: any) => b.id);

        await supabase
          .from('bookings')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .in('id', bookingIdsToComplete);

        // Update local bookings array
        bookings.forEach((booking: any) => {
          if (bookingIdsToComplete.includes(booking.id)) {
            booking.status = 'completed';
          }
        });
      }
    }

    // Fetch property images separately to avoid relationship issues
    const propertyIds = bookings?.map(b => b.property_id).filter(Boolean) || [];
    let propertyImagesMap: Record<string, string[]> = {};
    
    if (propertyIds.length > 0) {
      const { data: images, error: imagesError } = await supabase
        .from("property_images")
        .select("property_id, public_url, storage_path, is_primary, display_order")
        .in("property_id", propertyIds);
      
      if (imagesError) {
        console.error("Error fetching property images:", imagesError);
      }
      
      if (images && images.length > 0) {
        images.forEach((img: any) => {
          let url = img.public_url;
          
          // If no public_url, convert storage_path to public URL
          if (!url && img.storage_path) {
            // Check if storage_path is already a full URL
            if (img.storage_path.startsWith('http://') || img.storage_path.startsWith('https://')) {
              url = img.storage_path;
            } else {
              // Convert storage_path to public URL
              const { data } = supabase.storage
                .from("property-images")
                .getPublicUrl(img.storage_path);
              url = data.publicUrl;
            }
          }
          
          // Also check if it's a relative path starting with /assets (old format)
          if (!url && img.storage_path?.startsWith('/assets/')) {
            url = img.storage_path;
          }
          
          if (url && url.trim() !== "") {
            const propId = String(img.property_id); // Ensure string type for consistent mapping
            if (!propertyImagesMap[propId]) {
              propertyImagesMap[propId] = [];
            }
            propertyImagesMap[propId].push(url);
          }
        });
        
        // Sort by is_primary and display_order
        Object.keys(propertyImagesMap).forEach(propId => {
          propertyImagesMap[propId].sort((a, b) => {
            const imgA = images.find((img: any) => {
              let url = img.public_url || (img.storage_path?.startsWith('http') ? img.storage_path : null);
              if (!url && img.storage_path) {
                const { data } = supabase.storage.from("property-images").getPublicUrl(img.storage_path);
                url = data.publicUrl;
              }
              return url === a && img.property_id === propId;
            });
            const imgB = images.find((img: any) => {
              let url = img.public_url || (img.storage_path?.startsWith('http') ? img.storage_path : null);
              if (!url && img.storage_path) {
                const { data } = supabase.storage.from("property-images").getPublicUrl(img.storage_path);
                url = data.publicUrl;
              }
              return url === b && img.property_id === propId;
            });
            if (imgA?.is_primary && !imgB?.is_primary) return -1;
            if (!imgA?.is_primary && imgB?.is_primary) return 1;
            return (imgA?.display_order || 0) - (imgB?.display_order || 0);
          });
        });
      }
    }

    // Transform the data to include property images
    const transformedBookings =
      bookings?.map(booking => {
        const propertyData = booking.properties || {};
        const propertyId = String(booking.property_id); // Ensure string type for consistent mapping
        const images = propertyImagesMap[propertyId] || [];
        
        // Debug: Log image mapping for first booking
        if (booking === bookings[0] && Object.keys(propertyImagesMap).length > 0) {
          console.log("Image mapping debug:", {
            propertyId,
            hasImagesInMap: !!propertyImagesMap[propertyId],
            imagesCount: images.length,
            images: images,
            allPropertyIds: Object.keys(propertyImagesMap),
          });
        }
        
        return {
          ...booking,
          property: {
            ...propertyData,
            images: images,
          },
          guest_name:
            `${booking.guest?.first_name || ""} ${booking.guest?.last_name || ""}`.trim(),
          guest_email: booking.guest?.email,
          guest_phone: booking.guest?.phone,
          host_name: "Hiddy", // Set default host name to Hiddy
          host_email: booking.host?.email,
        };
      }) || [];

    return NextResponse.json(
      {
        success: true,
        bookings: transformedBookings,
        count: transformedBookings.length,
        pagination: {
          limit,
          offset,
          hasMore: transformedBookings.length === limit,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching bookings:", error);

    // Return appropriate error response based on error type
    if (error instanceof Error) {
      if (error.message.includes("Database error")) {
        return NextResponse.json(
          { error: "Database connection error. Please try again later." },
          { status: 503 }
        );
      }
      if (error.message.includes("Invalid")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch bookings. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Require Authorization: Bearer <token>
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);

    // Validate token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get profile (for role and profile.id)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    const body = await request.json();
    const { bookingId, status, notes, specialRequests } = body;

    // Validate required fields
    if (!bookingId || !status) {
      return NextResponse.json(
        { error: "Booking ID and status are required" },
        { status: 400 }
      );
    }

    // Validate booking ID format (should be UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bookingId)) {
      return NextResponse.json(
        { error: "Invalid booking ID format" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    console.log(`Updating booking ${bookingId} to status: ${status}`);

    // Ensure caller is allowed to update this booking
    const { data: existingBooking, error: bookingFetchError } = await supabase
      .from("bookings")
      .select("id, guest_id, host_id, status")
      .eq("id", bookingId)
      .single();

    if (bookingFetchError || !existingBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const isAdmin = profile.role === "admin";
    const isBookingGuest = existingBooking.guest_id === profile.id;
    const isBookingHost = existingBooking.host_id === profile.id;

    if (!isAdmin && !isBookingGuest && !isBookingHost) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Restrict who can set certain statuses
    // Guests shouldn't confirm/complete bookings; hosts/admins can.
    if (!isAdmin && isBookingGuest && ["confirmed", "completed"].includes(status)) {
      return NextResponse.json(
        { error: "Guests cannot set this status" },
        { status: 403 }
      );
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes) updateData.notes = notes;
    if (specialRequests) updateData.special_requests = specialRequests;

    const { data: booking, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .select(
        `
        *,
        properties!bookings_property_id_fkey(
          id,
          title,
          address,
          location,
          price_per_night
        ),
        guest:profiles!bookings_guest_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        host:profiles!bookings_host_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `
      )
      .single();

    if (error) {
      throw error;
    }

    // Create notification for guest based on status change
    if (status === "confirmed") {
      await supabase.from("notifications").insert({
        user_id: booking.guest_id,
        type: "booking_confirmed",
        title: "Booking Confirmed! ✅",
        message: `Your booking for ${booking.properties?.title} has been confirmed`,
        data: {
          booking_id: booking.id,
          property_id: booking.property_id,
          property_title: booking.properties?.title,
        },
        is_read: false,
      });

      // Send booking confirmation emails
      try {
        const emailData = {
          bookingId: booking.id,
          guestName:
            `${booking.guest?.first_name || ""} ${booking.guest?.last_name || ""}`.trim(),
          guestEmail: booking.guest?.email || "",
          hostName:
            `${booking.host?.first_name || ""} ${booking.host?.last_name || ""}`.trim(),
          hostEmail: booking.host?.email || "",
          propertyTitle: booking.properties?.title || "",
          propertyLocation: booking.properties?.address || "",
          propertyAddress: booking.properties?.address || "",
          checkInDate: booking.check_in_date,
          checkInTime: "3:00 PM", // Default check-in time
          checkOutDate: booking.check_out_date,
          checkOutTime: "11:00 AM", // Default check-out time
          guests: booking.num_guests,
          totalAmount: booking.total_amount,
          specialRequests: booking.special_requests,
          hostInstructions: booking.host_instructions,
        };

        // Send emails in parallel
        await Promise.allSettled([
          unifiedEmailService.sendBookingConfirmation(emailData),
          unifiedEmailService.sendHostNotification(emailData),
        ]);
      } catch (emailError) {
        console.error("Error sending booking confirmation emails:", emailError);
        // Don't fail the booking update if emails fail
      }
    } else if (status === "cancelled") {
      await supabase.from("notifications").insert({
        user_id: booking.guest_id,
        type: "booking_cancelled",
        title: "Booking Cancelled ❌",
        message: `Your booking for ${booking.properties?.title} has been cancelled`,
        data: {
          booking_id: booking.id,
          property_id: booking.property_id,
          property_title: booking.properties?.title,
        },
        is_read: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${status} successfully`,
      booking: {
        ...booking,
        guest_name:
          `${booking.guest?.first_name || ""} ${booking.guest?.last_name || ""}`.trim(),
        guest_email: booking.guest?.email,
        host_name:
          `${booking.host?.first_name || ""} ${booking.host?.last_name || ""}`.trim(),
      },
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("id");

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    console.log(`Deleting booking: ${bookingId}`);

    // Check if booking can be cancelled (not completed)
    const { data: booking } = await supabase
      .from("bookings")
      .select("status, check_in_date")
      .eq("id", bookingId)
      .single();

    if (booking && booking.status === "completed") {
      return NextResponse.json(
        { error: "Cannot delete completed bookings" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json(
      { error: "Failed to delete booking" },
      { status: 500 }
    );
  }
}
