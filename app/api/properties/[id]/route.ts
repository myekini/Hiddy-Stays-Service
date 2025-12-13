import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  authenticateUser,
  authorizePropertyAccess,
  createAuthResponse,
} from "@/lib/auth-middleware";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching property: ${propertyId}`);

    // Fetch property with related data (excluding images for now)
    const { data: property, error } = await supabase
      .from("properties")
      .select(
        `
        *,
        profiles(
          first_name,
          last_name,
          avatar_url,
          email
        )
      `
      )
      .eq("id", propertyId)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching property:", error);
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Fetch images for this specific property with all necessary fields
    const { data: propertyImages, error: imagesError } = await supabase
      .from("property_images")
      .select(`
        id, 
        property_id, 
        public_url, 
        storage_bucket, 
        storage_path, 
        is_primary, 
        display_order,
        width,
        height,
        mime_type,
        file_name
      `)
      .eq("property_id", propertyId)
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true });

    if (imagesError) {
      console.error("Error fetching property images:", imagesError);
    }

    // Process images to get the best available URL and include all image metadata
    const processedImages = await Promise.all(
      (propertyImages || []).map(async (img) => {
        let url = img.public_url;
        
        // Try to get a signed URL for better reliability
        if (img.storage_bucket && img.storage_path) {
          try {
            const { data: signed } = await supabase.storage
              .from(img.storage_bucket)
              .createSignedUrl(img.storage_path, 3600); // 1 hour
              
            if (signed?.signedUrl) {
              url = signed.signedUrl;
            }
          } catch (error) {
            console.error("Error creating signed URL:", error);
          }
        }

        return {
          id: img.id,
          url,
          is_primary: img.is_primary,
          display_order: img.display_order,
          width: img.width,
          height: img.height,
          mime_type: img.mime_type,
          file_name: img.file_name
        };
      })
    );

    // Filter out any images without a valid URL and sort by display order
    const validImages = processedImages
      .filter(img => img.url && img.url.trim() !== "")
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    // Extract just the URLs for backward compatibility
    const imageUrls = validImages.map(img => img.url);

    const transformedProperty = {
      ...property,
      images: imageUrls,
      property_images: validImages, // Include full image objects
      metrics: {
        images: imageUrls,
        image_count: validImages.length
      },
    };

    return NextResponse.json(
      {
      success: true,
      property: transformedProperty,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json(
      { error: "Failed to fetch property" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await authenticateUser(request);
    if (!user) {
      return createAuthResponse("Authentication required");
    }

    const { id: propertyId } = await params;
    const body = await request.json();

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Check if user owns this property
    const isAuthorized = await authorizePropertyAccess(user, propertyId);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized to update this property" },
        { status: 403 }
      );
    }

    console.log(`Updating property: ${propertyId}`);

    // Update property
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    const allowedFields = [
      "title",
      "description",
      "address",
      "location",
      "price_per_night",
      "bedrooms",
      "bathrooms",
      "max_guests",
      "property_type",
      "amenities",
      "availability_rules",
      "house_rules",
      "cancellation_policy",
      "status",
      "is_active",
      "is_featured",
      "min_nights",
      "max_nights",
      "advance_notice_hours",
      "same_day_booking",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .update(updateData)
      .eq("id", propertyId)
      .select()
      .single();

    if (propertyError) {
      throw propertyError;
    }

    // Update images if provided
    if (Array.isArray(body.images)) {
      const normalizeUrl = (value: string) => {
        try {
          const u = new URL(value);
          return `${u.origin}${u.pathname}`;
        } catch {
          return value.split("?")[0] || value;
        }
      };

      const incoming = (body.images as unknown[])
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .map((v) => ({ raw: v, normalized: normalizeUrl(v.trim()) }));

      const { data: existingImages, error: existingError } = await supabase
        .from("property_images")
        .select("id, public_url")
        .eq("property_id", propertyId);

      if (existingError) {
        console.error("Error loading existing images:", existingError);
      } else {
        const existingByNormalized = new Map<string, { id: string; public_url: string | null }>();
        (existingImages || []).forEach((img: any) => {
          const publicUrl = typeof img.public_url === "string" ? img.public_url : "";
          existingByNormalized.set(normalizeUrl(publicUrl), {
            id: img.id as string,
            public_url: img.public_url as string | null,
          });
        });

        // Update ordering/is_primary for existing rows
        for (let i = 0; i < incoming.length; i++) {
          const item = incoming[i];
          if (!item) continue;
          const match = existingByNormalized.get(item.normalized);
          if (!match) continue;

          const { error: updateImageError } = await supabase
            .from("property_images")
            .update({
              display_order: i,
              is_primary: i === 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", match.id);

          if (updateImageError) {
            console.error("Error updating image order:", updateImageError);
          }
        }

        // Insert any brand-new URLs (do not overwrite storage metadata for existing images)
        const toInsert = incoming.filter((item) => !existingByNormalized.has(item.normalized));
        if (toInsert.length > 0) {
          const inserts = toInsert.map((item, idx) => ({
            property_id: propertyId,
            public_url: item.normalized,
            is_primary: incoming.length > 0 ? false : idx === 0,
            display_order: incoming.findIndex((x) => x.normalized === item.normalized),
          }));

          const { error: insertError } = await supabase
            .from("property_images")
            .insert(inserts);

          if (insertError) {
            console.error("Error inserting new images:", insertError);
          }
        }

        // Keep property image_count in sync
        const { error: countError } = await supabase
          .from("properties")
          .update({ image_count: incoming.length, updated_at: new Date().toISOString() })
          .eq("id", propertyId);

        if (countError) {
          console.error("Error updating property image_count:", countError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Property updated successfully",
      property,
    });
  } catch (error) {
    console.error("Error updating property:", error);
    return NextResponse.json(
      { error: "Failed to update property" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await authenticateUser(request);
    if (!user) {
      return createAuthResponse("Authentication required");
    }

    const { id: propertyId } = await params;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Check if user owns this property
    const isAuthorized = await authorizePropertyAccess(user, propertyId);
    if (!isAuthorized) {
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
