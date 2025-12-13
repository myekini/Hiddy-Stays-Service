import { createClient } from "@/integrations/supabase/server";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const MAX_IMAGES_PER_PROPERTY = 10;

/**
 * POST /api/properties/[id]/images/upload
 * Upload images for a property
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7)
      : null;

    const {
      data: { user },
      error: userError,
    } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const propertyId = resolvedParams.id;

    // Verify property ownership
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("host_id, image_count")
      .eq("id", propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // properties.host_id stores the host profile id, not auth user id.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    if (property.host_id !== profile.id) {
      return NextResponse.json(
        { error: "You can only upload images to your own properties" },
        { status: 403 }
      );
    }

    // Check image count limit
    const currentImageCount = property.image_count || 0;
    if (currentImageCount >= MAX_IMAGES_PER_PROPERTY) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_IMAGES_PER_PROPERTY} images allowed per property`,
        },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const files = formData.getAll("images") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    // Check total image count doesn't exceed limit
    if (currentImageCount + files.length > MAX_IMAGES_PER_PROPERTY) {
      return NextResponse.json(
        {
          error: `Can only upload ${MAX_IMAGES_PER_PROPERTY - currentImageCount} more image(s)`,
        },
        { status: 400 }
      );
    }

    const uploadedImages = [];
    const errors = [];

    // Upload each image
    for (const file of files) {
      try {
        // Validate file
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          errors.push({
            fileName: file.name,
            error: "Invalid file type. Only JPEG, PNG, and WebP allowed",
          });
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          errors.push({
            fileName: file.name,
            error: `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          });
          continue;
        }

        // Generate unique file name
        const fileExt = file.name.split(".").pop();
        const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          errors.push({
            fileName: file.name,
            error: uploadError.message,
          });
          continue;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("property-images").getPublicUrl(fileName);

        // Get image dimensions (basic validation)
        const width = null;
        const height = null;

        // Save image metadata to database
        const { data: imageRecord, error: dbError } = await supabase
          .from("property_images")
          .insert({
            property_id: propertyId,
            storage_path: fileName,
            storage_bucket: "property-images",
            public_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            width: width || null,
            height: height || null,
            is_primary: currentImageCount === 0 && uploadedImages.length === 0, // First image is primary
            display_order: currentImageCount + uploadedImages.length,
            uploaded_by: user.id,
          } as TablesInsert<"property_images">)
          .select()
          .single();

        if (dbError || !imageRecord) {
          console.error("Database error:", dbError);
          // Try to delete uploaded file
          await supabase.storage.from("property-images").remove([fileName]);
          errors.push({
            fileName: file.name,
            error: "Failed to save image metadata",
          });
          continue;
        }

        const img: Tables<"property_images"> = imageRecord as Tables<"property_images">;
        uploadedImages.push({
          id: img.id as string,
          url: publicUrl,
          fileName: file.name,
          isPrimary: (img.is_primary ?? false) as boolean,
        });
      } catch (error) {
        console.error("Error uploading file:", error);
        errors.push({
          fileName: file.name,
          error: "Unexpected error during upload",
        });
      }
    }

    // Log activity
    if (uploadedImages.length > 0) {
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "upload_property_images",
        entity_type: "property",
        entity_id: propertyId,
        metadata: {
          uploaded_count: uploadedImages.length,
          failed_count: errors.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      uploaded: uploadedImages,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${uploadedImages.length} image(s)${errors.length > 0 ? `, ${errors.length} failed` : ""}`,
    });
  } catch (error) {
    console.error("Error in image upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/properties/[id]/images/upload
 * Get upload information and limits
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const resolvedParams = await params;
    const propertyId = resolvedParams.id;

    // Get property images count
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("image_count")
      .eq("id", propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const currentImageCount = property.image_count || 0;

    return NextResponse.json({
      propertyId,
      currentImageCount,
      maxImagesPerProperty: MAX_IMAGES_PER_PROPERTY,
      remainingSlots: MAX_IMAGES_PER_PROPERTY - currentImageCount,
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
      allowedExtensions: ["jpg", "jpeg", "png", "webp"],
    });
  } catch (error) {
    console.error("Error getting upload info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
