import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hostId = searchParams.get("host_id");

    console.log("Host properties API called with hostId:", hostId);

    if (!hostId) {
      return NextResponse.json(
        { error: "Host ID is required" },
        { status: 400 }
      );
    }

    // Get properties first (without images to isolate the issue)
    console.log("Querying properties for host_id:", hostId);
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("*")
      .eq("host_id", hostId)
      .order("created_at", { ascending: false });

    if (propertiesError) {
      console.error("Supabase error fetching properties:", propertiesError);
      console.error("Error details:", JSON.stringify(propertiesError, null, 2));
      return NextResponse.json(
        { error: "Failed to fetch properties", details: propertiesError.message },
        { status: 500 }
      );
    }

    console.log("Found properties:", properties?.length || 0);

    // Get images for all properties
    const propertyIds = properties?.map(p => p.id) || [];
    const propertyImagesMap: Record<string, string[]> = {};
    
    if (propertyIds.length > 0) {
      const { data: images } = await supabase
        .from("property_images")
        .select("property_id, public_url, storage_path, is_primary, display_order")
        .in("property_id", propertyIds);
      
      if (images) {
        images.forEach((img: any) => {
          const url = img.public_url || img.storage_path;
          if (url && url.trim() !== "") {
            const propId = String(img.property_id);
            if (!propertyImagesMap[propId]) {
              propertyImagesMap[propId] = [];
            }
            propertyImagesMap[propId].push(url);
          }
        });
        
        // Sort images by is_primary and display_order
        Object.keys(propertyImagesMap).forEach(propId => {
          propertyImagesMap[propId].sort((a, b) => {
            const imgA = images.find((img: any) => (img.public_url || img.storage_path) === a && img.property_id === propId);
            const imgB = images.find((img: any) => (img.public_url || img.storage_path) === b && img.property_id === propId);
            if (imgA?.is_primary && !imgB?.is_primary) return -1;
            if (!imgA?.is_primary && imgB?.is_primary) return 1;
            return (imgA?.display_order || 0) - (imgB?.display_order || 0);
          });
        });
      }
    }

    // Get booking metrics for each property
    const propertiesWithMetrics = await Promise.all(
      (properties || []).map(async (property) => {
        // Get bookings for this property
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, total_amount, status, check_in_date, check_out_date, created_at")
          .eq("property_id", property.id);

        // Get reviews for this property
        const { data: reviews } = await supabase
          .from("reviews")
          .select("rating")
          .eq("property_id", property.id);

        // Calculate metrics
        const confirmedBookings = bookings?.filter(b => b.status === "confirmed") || [];
        const bookingCount = confirmedBookings.length;
        const revenue = confirmedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        
        // Calculate occupancy rate (simplified - based on last 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        const recentBookings = confirmedBookings.filter(b => 
          new Date(b.created_at) >= ninetyDaysAgo
        );
        
        const bookedDays = recentBookings.reduce((sum, b) => {
          const checkIn = new Date(b.check_in_date);
          const checkOut = new Date(b.check_out_date);
          return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        
        const occupancyRate = (bookedDays / 90) * 100;

        // Calculate rating
        const avgRating = reviews?.length ? 
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

        // Get images from the separate query
        const images = propertyImagesMap[String(property.id)] || [];

        return {
          id: property.id,
          title: property.title,
          description: property.description,
          address: property.address,
          city: property.city,
          country: property.country,
          price_per_night: parseFloat(property.price_per_night || 0),
          bedrooms: property.bedrooms || 0,
          bathrooms: property.bathrooms || 0,
          max_guests: property.max_guests || 1,
          property_type: property.property_type,
          amenities: property.amenities || [],
          house_rules: property.house_rules || [],
          cancellation_policy: property.cancellation_policy,
          min_nights: property.min_nights || 1,
          max_nights: property.max_nights || 30,
          is_active: property.is_active || false,
          created_at: property.created_at,
          images,
          // Host Dashboard specific metrics
          rating: Math.round(avgRating * 10) / 10,
          review_count: reviews?.length || 0,
          booking_count: bookingCount,
          revenue: Math.round(revenue * 100) / 100,
          occupancy_rate: Math.round(occupancyRate * 10) / 10,
        };
      })
    );

    return NextResponse.json({
      success: true,
      properties: propertiesWithMetrics,
    });
  } catch (error) {
    console.error("Error in host properties API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
