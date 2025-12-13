import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { user: null, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { user: null, error: "Invalid token" };
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return { user: null, error: "Profile not found" };
  }

  return { user: { ...user, profile }, error: null };
}

/**
 * GET /api/reviews
 * Get reviews with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("property_id");
    const status = searchParams.get("status") || "published";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const validStatuses = ["published", "pending", "flagged", "hidden"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    let query = supabase
      .from("reviews")
      .select(
        `
        *,
        property:properties(
          id,
          title,
          address
        ),
        guest:profiles!reviews_guest_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url
        ),
        host:profiles(
          id,
          first_name,
          last_name
        )
      `
      )
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (propertyId) {
      query = query.eq("property_id", propertyId);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: reviews, error } = await query;
    
    if (error) {
      console.error("Error fetching reviews:", error);
      
      // Handle specific foreign key relationship errors
      if (error.code === "PGRST200" || error.message?.includes("relationship")) {
        // Fallback to a simpler query without foreign key hints
        let fallbackQuery = supabase
          .from("reviews")
          .select("*")
          .eq("status", status)
          .order("created_at", { ascending: false });
          
        if (propertyId) {
          fallbackQuery = fallbackQuery.eq("property_id", propertyId);
        }
        
        const { data: fallbackReviews, error: fallbackError } = await fallbackQuery.range(offset, offset + limit - 1);
        
        if (fallbackError) {
          throw fallbackError;
        }
        
        // Manually fetch related data if needed
        const reviewsWithRelations = await Promise.all(
          (fallbackReviews || []).map(async (review) => {
            // Fetch related data manually
            const [property, guest, host, images] = await Promise.all([
              supabase.from("properties").select("id, title, address").eq("id", review.property_id).single(),
              supabase.from("profiles").select("id, first_name, last_name, avatar_url").eq("id", review.guest_id).single(),
              supabase.from("profiles").select("id, first_name, last_name").eq("id", review.host_id).single(),
              supabase.from("review_images").select("id, image_url, caption, order_index").eq("review_id", review.id),
            ]);
            
            return {
              ...review,
              property: property.data,
              guest: guest.data,
              host: host.data,
              review_images: images.data || [],
            };
          })
        );
        
        return NextResponse.json({
          success: true,
          reviews: reviewsWithRelations,
          pagination: {
            limit,
            offset,
            total: reviewsWithRelations.length,
          },
        });
      }
      
      throw error;
    }

    // Fetch review_images separately if not included in the query
    if (reviews && reviews.length > 0) {
      const reviewsWithImages = await Promise.all(
        reviews.map(async (review: any) => {
          if (review.review_images === undefined) {
            const { data: images } = await supabase
              .from("review_images")
              .select("id, image_url, caption, order_index")
              .eq("review_id", review.id)
              .order("order_index");
            
            return {
              ...review,
              review_images: images || [],
            };
          }
          return review;
        })
      );

      return NextResponse.json({
        reviews: reviewsWithImages,
        pagination: {
          limit,
          offset,
          hasMore: reviews.length === limit,
        },
      });
    }

    return NextResponse.json({
      reviews: reviews || [],
      pagination: {
        limit,
        offset,
        hasMore: false,
      },
    });
  } catch (error: any) {
    console.error("Reviews fetch error:", error);
    
    // Provide helpful error messages
    if (error?.code === "PGRST200" || error?.message?.includes("relationship")) {
      return NextResponse.json(
        { 
          error: "Failed to fetch reviews due to database schema issue",
          details: process.env.NODE_ENV === "development" ? error?.message : undefined
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to fetch reviews. Please try again.",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Create a new review
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: auth.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      bookingId,
      propertyId,
      rating,
      title,
      comment,
      cleanlinessRating,
      accuracyRating,
      communicationRating,
      locationRating,
      valueRating,
      reviewImages,
    } = body;

    // Validate required fields
    if (!bookingId || !propertyId || !rating) {
      return NextResponse.json(
        { error: "Booking ID, property ID, and rating are required" },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    // Validate optional ratings
    const optionalRatings = {
      cleanliness: cleanlinessRating,
      accuracy: accuracyRating,
      communication: communicationRating,
      location: locationRating,
      value: valueRating,
    };

    for (const [key, value] of Object.entries(optionalRatings)) {
      if (
        value !== undefined &&
        (value < 1 || value > 5 || !Number.isInteger(value))
      ) {
        return NextResponse.json(
          { error: `${key} rating must be an integer between 1 and 5` },
          { status: 400 }
        );
      }
    }

    // Validate comment length
    if (comment && (comment.length < 10 || comment.length > 2000)) {
      return NextResponse.json(
        { error: "Comment must be between 10 and 2000 characters" },
        { status: 400 }
      );
    }

    // Validate title length
    if (title && title.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or less" },
        { status: 400 }
      );
    }

    // Check if booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        property_id,
        guest_id,
        host_id,
        status,
        check_out_date
      `
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify booking belongs to user and is completed
    if (booking.guest_id !== auth.user.profile.id) {
      return NextResponse.json(
        { error: "Unauthorized to review this booking" },
        { status: 403 }
      );
    }

    if (booking.status !== "completed") {
      return NextResponse.json(
        { error: "Can only review completed bookings" },
        { status: 400 }
      );
    }

    // Check if check-out date has passed
    const checkOutDate = new Date(booking.check_out_date);
    const today = new Date();
    if (checkOutDate >= today) {
      return NextResponse.json(
        { error: "Can only review bookings after check-out date" },
        { status: 400 }
      );
    }

    // Check if review already exists for this booking
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: "Review already exists for this booking" },
        { status: 400 }
      );
    }

    // Create review
    const reviewData = {
      property_id: propertyId,
      booking_id: bookingId,
      guest_id: auth.user.profile.id,
      host_id: booking.host_id,
      rating,
      title,
      comment,
      cleanliness_rating: cleanlinessRating,
      accuracy_rating: accuracyRating,
      communication_rating: communicationRating,
      location_rating: locationRating,
      value_rating: valueRating,
      status: "pending", // Reviews start as pending for moderation
    };

    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert(reviewData)
      .select()
      .single();

    if (reviewError) {
      console.error("Review creation error:", reviewError);
      return NextResponse.json(
        { error: "Failed to create review" },
        { status: 500 }
      );
    }

    // Add review images if provided
    if (reviewImages && reviewImages.length > 0) {
      const imageData = reviewImages.map((image: any, index: number) => ({
        review_id: review.id,
        image_url: image.url,
        caption: image.caption,
        order_index: index,
      }));

      const { error: imagesError } = await supabase
        .from("review_images")
        .insert(imageData);

      if (imagesError) {
        console.warn("Failed to add review images:", imagesError);
        // Don't fail the request if images fail
      }
    }

    // Send notification to host
    try {
      await supabase.from("notifications").insert({
        user_id: booking.host_id,
        type: "review_received",
        title: "New Review Received! ⭐",
        message: `You received a new review for your property`,
        data: {
          review_id: review.id,
          property_id: propertyId,
          booking_id: bookingId,
          rating,
          guest_name: auth.user.profile.first_name,
        },
      });
    } catch (notificationError) {
      console.warn("Failed to send notification:", notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      review,
      message: "Review submitted successfully and is pending moderation",
    });
  } catch (error) {
    console.error("Review creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
