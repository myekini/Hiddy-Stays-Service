import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateUser, createAuthResponse } from "@/lib/auth-middleware";
import { withCache, generateCacheKey, CACHE_TTL } from "@/lib/api-cache";
import { optimizePropertyQuery } from "@/lib/db-optimization";

// Use anon key for public reads so RLS applies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Use service role for trusted server-side writes (after auth/ownership checks)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple in-memory rate limiter (per IP)
const __rateLimit = new Map<string, { count: number; reset: number }>();
function allowRequest(ip: string, max = 120, windowMs = 5 * 60 * 1000) {
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
    // Rate limit per IP (public endpoint)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!allowRequest(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    
    // Generate cache key from request parameters
    const cacheKey = generateCacheKey("/api/properties", Object.fromEntries(searchParams));
    const hostId = searchParams.get("host_id");
    const status = searchParams.get("status");
    const approvalStatus = searchParams.get("approval_status");

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // Max 100
    const offset = (page - 1) * limit;

    // Search and filter parameters
    const location = searchParams.get("location");
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const guests = searchParams.get("guests");
    const propertyType = searchParams.get("property_type");
    const amenities = searchParams.get("amenities");
    const checkIn = searchParams.get("check_in");
    const checkOut = searchParams.get("check_out");
    const sortBy = searchParams.get("sort_by") || "created_at"; // created_at, price_asc, price_desc, rating
    const minRating = searchParams.get("min_rating");

    console.log(`Fetching properties with filters:`, {
      hostId,
      status,
      location,
      maxPrice,
      minPrice,
      guests,
      propertyType,
      amenities,
      checkIn,
      checkOut,
      page,
      limit,
      sortBy,
    });

    let query = supabase
      .from("properties")
      .select(
        `
        *,
        property_images(
          id,
          public_url,
          image_url,
          storage_path,
          is_primary,
          display_order
        ),
        profiles(
          user_id,
          first_name,
          last_name,
          avatar_url
        )
      `,
        { count: "exact" }
      )
      .eq("is_active", true); // Only show active properties by default

    // Apply filters
    if (hostId) {
      query = query.eq("host_id", hostId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (approvalStatus) {
      const validApprovalStatuses = [
        "pending",
        "approved",
        "rejected",
        "flagged",
      ];
      if (validApprovalStatuses.includes(approvalStatus)) {
        query = query.eq("approval_status", approvalStatus);
      }
    } else {
      // By default, only show approved properties to public users
      // Hosts and admins can see all their properties regardless of approval status
      if (!hostId) {
        query = query.eq("approval_status", "approved");
      }
    }

    // Filter to Canada only
    query = query.eq("country", "Canada");

    // Search location in address or city (properly handle special characters)
    if (location) {
      // Clean and escape the location string to prevent parsing errors
      // Remove commas and escape PostgREST special characters
      const cleanedLocation = location
        .trim()
        .replace(/,/g, " ") // Replace commas with spaces
        .replace(/[%_\\]/g, "\\$&") // Escape PostgREST wildcards
        .split(/\s+/) // Split into words
        .filter(word => word.length > 0)
        .join(" "); // Join back with single spaces
      
      if (cleanedLocation) {
        // Use PostgREST or() with proper escaping - wrap each condition
        const searchPattern = `%${cleanedLocation}%`;
        query = query.or(`address.ilike.${searchPattern},city.ilike.${searchPattern}`);
      }
    }

    // Price range filters
    if (minPrice) {
      query = query.gte("price_per_night", parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte("price_per_night", parseFloat(maxPrice));
    }

    // Guest capacity filter
    if (guests) {
      query = query.gte("max_guests", parseInt(guests));
    }

    // Property type filter
    if (propertyType && propertyType !== "all") {
      query = query.eq("property_type", propertyType);
    }

    // Rating filter
    if (minRating) {
      query = query.gte("rating", parseFloat(minRating));
    }

    // SERVER-SIDE amenities filter (moved from client-side)
    if (amenities) {
      const requiredAmenities = amenities.split(",").map(a => a.trim());
      requiredAmenities.forEach(amenity => {
        query = query.contains("amenities", [amenity]);
      });
    }

    // Sorting
    if (sortBy === "price_asc") {
      query = query.order("price_per_night", { ascending: true });
    } else if (sortBy === "price_desc") {
      query = query.order("price_per_night", { ascending: false });
    } else if (sortBy === "rating") {
      query = query.order("rating", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Use cache for public property listings (not for host-specific queries)
    const shouldCache = !hostId && !status;
    const cacheTTL = shouldCache ? CACHE_TTL.MEDIUM : undefined;
    
    let { data: properties, error, count } = await (shouldCache
      ? withCache(
          cacheKey,
          async () => {
            const result = await query;
            return result;
          },
          cacheTTL
        )
      : query);

    // If there's an error with the relationship query, try a simpler query
    if (error && error.code === '42703') {
      console.warn("Relationship query failed, trying simpler query:", error.message);
      
      // Fallback: fetch properties without nested relationships
      let simpleQuery = supabase
        .from("properties")
        .select("*", { count: "exact" })
        .eq("is_active", true);
      
      // Reapply all filters
      if (hostId) simpleQuery = simpleQuery.eq("host_id", hostId);
      if (status) simpleQuery = simpleQuery.eq("status", status);
      if (!hostId && !approvalStatus) simpleQuery = simpleQuery.eq("approval_status", "approved");
      if (approvalStatus && ["pending", "approved", "rejected", "flagged"].includes(approvalStatus)) {
        simpleQuery = simpleQuery.eq("approval_status", approvalStatus);
      }
      simpleQuery = simpleQuery.eq("country", "Canada");
      
      if (location) {
        const cleanedLocation = location.trim().replace(/,/g, " ").replace(/[%_\\]/g, "\\$&").split(/\s+/).filter(word => word.length > 0).join(" ");
        if (cleanedLocation) {
          const searchPattern = `%${cleanedLocation}%`;
          simpleQuery = simpleQuery.or(`address.ilike.${searchPattern},city.ilike.${searchPattern}`);
        }
      }
      if (minPrice) simpleQuery = simpleQuery.gte("price_per_night", parseFloat(minPrice));
      if (maxPrice) simpleQuery = simpleQuery.lte("price_per_night", parseFloat(maxPrice));
      if (guests) simpleQuery = simpleQuery.gte("max_guests", parseInt(guests));
      if (propertyType && propertyType !== "all") simpleQuery = simpleQuery.eq("property_type", propertyType);
      if (minRating) simpleQuery = simpleQuery.gte("rating", parseFloat(minRating));
      if (amenities) {
        const requiredAmenities = amenities.split(",").map(a => a.trim());
        requiredAmenities.forEach(amenity => {
          simpleQuery = simpleQuery.contains("amenities", [amenity]);
        });
      }
      
      if (sortBy === "price_asc") {
        simpleQuery = simpleQuery.order("price_per_night", { ascending: true });
      } else if (sortBy === "price_desc") {
        simpleQuery = simpleQuery.order("price_per_night", { ascending: false });
      } else if (sortBy === "rating") {
        simpleQuery = simpleQuery.order("rating", { ascending: false, nullsFirst: false });
      } else {
        simpleQuery = simpleQuery.order("created_at", { ascending: false });
      }
      
      simpleQuery = simpleQuery.range(offset, offset + limit - 1);
      
      const simpleResult = await simpleQuery;
      properties = simpleResult.data;
      count = simpleResult.count;
      error = simpleResult.error;
      
      // If we got properties, fetch images separately
      if (properties && properties.length > 0) {
        const propertyIds = properties.map(p => p.id);
        const { data: images } = await supabase
          .from("property_images")
          .select("id, property_id, public_url, image_url, storage_path, is_primary, display_order")
          .in("property_id", propertyIds);
        
        // Attach images to properties
        if (images) {
          properties = properties.map(property => ({
            ...property,
            property_images: images.filter(img => img.property_id === property.id)
          }));
        }
        
        // Fetch profiles separately
        const hostIds = [...new Set(properties.map(p => p.host_id))];
        const { data: hostProfiles } = await supabase
          .from("profiles")
          .select("id, user_id, first_name, last_name, avatar_url")
          .in("id", hostIds);
        
        if (hostProfiles) {
          properties = properties.map(property => ({
            ...property,
            profiles: hostProfiles.find(profile => profile.id === property.host_id)
          }));
        }
      }
    }

    if (error) {
      throw error;
    }

    let filteredProperties = properties || [];

    // SERVER-SIDE availability check using database function
    if (checkIn && checkOut && filteredProperties.length > 0) {
      const availabilityPromises = filteredProperties.map(async property => {
        const { data: availCheck } = await supabase.rpc(
          "check_property_availability",
          {
            property_uuid: property.id,
            check_in_date: checkIn,
            check_out_date: checkOut,
          }
        );

        return {
          property,
          isAvailable: availCheck?.[0]?.is_available || false,
        };
      });

      const availabilityResults = await Promise.all(availabilityPromises);
      filteredProperties = availabilityResults
        .filter(r => r.isAvailable)
        .map(r => r.property);
    }

    // Calculate additional metrics for each property
    const propertiesWithMetrics = filteredProperties.map(property => {
      // Use property rating if available
      const avgRating = property.rating || null;
      const reviewCount = property.review_count || 0;

      // Get primary image or first image
      const primaryImage = property.property_images?.find(
        (img: any) => img.is_primary
      );
      const images =
        property.property_images
          ?.sort((a: any, b: any) => {
            // Sort by primary first, then by display_order
            if (a.is_primary && !b.is_primary) return -1;
            if (!a.is_primary && b.is_primary) return 1;
            return (a.display_order || 0) - (b.display_order || 0);
          })
          ?.map((img: any) => {
            // Use public_url if available, fallback to image_url, then storage_path
            return img.public_url || img.image_url || img.storage_path || null;
          })
          .filter((url: string | null) => url && url.trim() !== "") || [];

      return {
        id: property.id,
        title: property.title,
        description: property.description,
        address: property.address,
        city: property.city,
        country: property.country,
        price_per_night: parseFloat(property.price_per_night),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        max_guests: property.max_guests,
        property_type: property.property_type,
        amenities: property.amenities || [],
        house_rules: property.house_rules || [],
        cancellation_policy: property.cancellation_policy,
        min_nights: property.min_nights,
        max_nights: property.max_nights,
        created_at: property.created_at,
        host: {
          id: property.profiles?.user_id,
          name:
            `${property.profiles?.first_name || ""} ${property.profiles?.last_name || ""}`.trim() ||
            "Host",
          avatar: property.profiles?.avatar_url,
        },
        rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        review_count: reviewCount,
        images: images,
        primary_image: primaryImage?.public_url || primaryImage?.image_url || primaryImage?.storage_path || images[0] || null,
      };
    });

    return NextResponse.json({
      success: true,
      properties: propertiesWithMetrics,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching properties:", error);
    
    // Provide helpful error messages based on error type
    if (error?.code === "PGRST100" || error?.message?.includes("parse logic tree")) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid search query. Please try a simpler location search.",
          details: "Location search contains invalid characters"
        },
        { status: 400 }
      );
    }
    
    if (error?.code === "PGRST116") {
      // No rows found - not really an error
      return NextResponse.json({
        success: true,
        properties: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      });
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch properties. Please try again.",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticateUser(request);
    if (!user) {
      return createAuthResponse("Authentication required");
    }

    const body = await request.json();
    const {
      title,
      description,
      address,
      location,
      city,
      country,
      price_per_night,
      bedrooms,
      bathrooms,
      max_guests,
      property_type,
      amenities,
      images,
      availability_rules,
      house_rules,
      cancellation_policy,
      min_nights,
      max_nights,
      advance_notice_hours,
      same_day_booking,
      status,
      is_active,
    } = body;

    if (!title || !description || !address || !price_per_night) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`Creating property for host: ${user.profile_id}`);

    // Create property
    const { data: property, error: propertyError } = await supabaseAdmin
      .from("properties")
      .insert({
        host_id: user.profile_id,
        title,
        description,
        address,
        location,
        city: city || "Toronto",
        country: country || "Canada",
        price_per_night: parseFloat(price_per_night),
        bedrooms: parseInt(bedrooms) || 1,
        bathrooms: parseInt(bathrooms) || 1,
        max_guests: parseInt(max_guests) || 2,
        property_type: property_type || "apartment",
        amenities: amenities || [],
        availability_rules: availability_rules || {},
        house_rules: house_rules || [],
        cancellation_policy: cancellation_policy || "moderate",
        min_nights: parseInt(min_nights) || 1,
        max_nights: parseInt(max_nights) || 30,
        advance_notice_hours: parseInt(advance_notice_hours) || 24,
        same_day_booking: same_day_booking || false,
        status: status || "draft",
        is_active: is_active || false,
      })
      .select()
      .single();

    if (propertyError) {
      throw propertyError;
    }

    // Add images if provided
    if (images && images.length > 0) {
      const imageInserts = images.map((imageUrl: string, index: number) => ({
        property_id: property.id,
        public_url: imageUrl,
        is_primary: index === 0,
        display_order: index,
      }));

      const { error: imageError } = await supabaseAdmin
        .from("property_images")
        .insert(imageInserts);

      if (imageError) {
        console.error("Error adding images:", imageError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Property created successfully",
      property: {
        ...property,
        images: images || [],
      },
    });
  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticateUser(request);
    if (!user) {
      return createAuthResponse("Authentication required");
    }

    const body = await request.json();
    const {
      id,
      title,
      description,
      address,
      location,
      price_per_night,
      bedrooms,
      bathrooms,
      max_guests,
      property_type,
      amenities,
      images,
      availability_rules,
      house_rules,
      cancellation_policy,
      status,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Check if user owns this property
    const { data: existingProperty } = await supabaseAdmin
      .from("properties")
      .select("host_id")
      .eq("id", id)
      .single();

    if (!existingProperty || existingProperty.host_id !== user.profile_id) {
      return NextResponse.json(
        { error: "Unauthorized to update this property" },
        { status: 403 }
      );
    }

    console.log(`Updating property: ${id}`);

    // Update property
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (address) updateData.address = address;
    if (location) updateData.location = location;
    if (price_per_night)
      updateData.price_per_night = parseFloat(price_per_night);
    if (bedrooms) updateData.bedrooms = parseInt(bedrooms);
    if (bathrooms) updateData.bathrooms = parseInt(bathrooms);
    if (max_guests) updateData.max_guests = parseInt(max_guests);
    if (property_type) updateData.property_type = property_type;
    if (amenities) updateData.amenities = amenities;
    if (availability_rules) updateData.availability_rules = availability_rules;
    if (house_rules) updateData.house_rules = house_rules;
    if (cancellation_policy)
      updateData.cancellation_policy = cancellation_policy;
    if (status) updateData.status = status;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedProperty, error: propertyError } = await supabaseAdmin
      .from("properties")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (propertyError) {
      throw propertyError;
    }

    // Update images if provided
    if (images) {
      // Delete existing images
      await supabaseAdmin.from("property_images").delete().eq("property_id", id);

      // Add new images
      if (images.length > 0) {
        const imageInserts = images.map((imageUrl: string, index: number) => ({
          property_id: id,
          public_url: imageUrl,
          is_primary: index === 0,
          display_order: index,
        }));

        const { error: imageError } = await supabaseAdmin
          .from("property_images")
          .insert(imageInserts);

        if (imageError) {
          console.error("Error updating images:", imageError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Property updated successfully",
      property: updatedProperty,
    });
  } catch (error) {
    console.error("Error updating property:", error);
    return NextResponse.json(
      { error: "Failed to update property" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticateUser(request);
    if (!user) {
      return createAuthResponse("Authentication required");
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("id");

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Check if user owns this property
    const { data: existingProperty } = await supabase
      .from("properties")
      .select("host_id")
      .eq("id", propertyId)
      .single();

    if (!existingProperty || existingProperty.host_id !== user.profile_id) {
      return NextResponse.json(
        { error: "Unauthorized to delete this property" },
        { status: 403 }
      );
    }

    console.log(`Deleting property: ${propertyId}`);

    // Check if property has active bookings
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("property_id", propertyId)
      .in("status", ["pending", "confirmed"]);

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete property with active bookings" },
        { status: 400 }
      );
    }

    // Delete property images first
    await supabase
      .from("property_images")
      .delete()
      .eq("property_id", propertyId);

    // Delete property
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", propertyId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json(
      { error: "Failed to delete property" },
      { status: 500 }
    );
  }
}

function calculateOccupancyRate(bookings: any[]): number {
  if (!bookings || bookings.length === 0) return 0;

  const confirmedBookings = bookings.filter(
    (booking: any) => booking.status === "confirmed"
  );

  // This is a simplified calculation
  // In a real app, you'd calculate based on actual availability vs bookings
  return Math.min(100, (confirmedBookings.length / bookings.length) * 100);
}
