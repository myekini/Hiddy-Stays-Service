const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "Bookdirect";

// Local images to upload
const localImages = [
  { file: "apartment_lobby_ss.jpg", description: "Grand apartment lobby" },
  { file: "bathoom_and_toilet.jpg", description: "Modern bathroom" },
  { file: "bed_lanscape.jpg", description: "Spacious bedroom" },
  { file: "bed_upclose.jpg", description: "Cozy bed" },
  { file: "city_view_from_backyard.jpg", description: "City views" },
  { file: "dining_area.jpg", description: "Elegant dining area" },
  { file: "Full_kitchen.jpg", description: "Full kitchen" },
  { file: "Gym_area_ss.jpg", description: "Fitness center" },
  { file: "kitchen_cutleries_showcase.jpg", description: "Kitchen utensils" },
  { file: "little_dinning_area.jpg", description: "Breakfast nook" },
  { file: "night_city_view_from_upstair.jpg", description: "Night skyline" },
  { file: "Ouside_infront_apartment_through_the_glass.jpg", description: "Exterior view" },
  { file: "sititng_room_washhand_base.jpg", description: "Living area" },
  { file: "smart_tv_on_stand.jpg", description: "Entertainment center" },
  { file: "snoker_area_ss.jpg", description: "Recreation room" },
  { file: "waiting_room_lobby_ss.jpg", description: "Waiting lounge" },
  { file: "walkway_to_the_room.jpg", description: "Entrance walkway" },
  { file: "washing_machine.jpg", description: "Laundry facilities" }
];

async function uploadImagesToSupabase() {
  console.log(`🚀 Uploading images to Supabase Storage bucket: ${BUCKET_NAME}\n`);

  const uploadedImages = [];

  for (const img of localImages) {
    const filePath = path.join(__dirname, "..", "public", "assets", img.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${img.file}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `property-images/${img.file}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: "image/jpeg",
        upsert: true
      });

    if (error) {
      console.log(`❌ Failed to upload ${img.file}:`, error.message);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    console.log(`✅ Uploaded: ${img.file}`);
    uploadedImages.push({
      file: img.file,
      storagePath,
      publicUrl: urlData.publicUrl,
      description: img.description
    });
  }

  console.log(`\n📸 Uploaded ${uploadedImages.length} images\n`);

  // Now update properties with these images
  if (uploadedImages.length > 0) {
    await updatePropertyImages(uploadedImages);
  }
}

async function updatePropertyImages(uploadedImages) {
  console.log("🏠 Updating properties with Supabase Storage URLs...\n");

  const { data: properties, error } = await supabase
    .from("properties")
    .select("id, title");

  if (error || !properties?.length) {
    console.log("No properties found");
    return;
  }

  for (const property of properties) {
    console.log(`📍 ${property.title}`);

    // Delete existing images
    await supabase
      .from("property_images")
      .delete()
      .eq("property_id", property.id);

    // Select 10-12 random images for variety
    const shuffled = [...uploadedImages].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(12, shuffled.length));

    const imageInserts = selected.map((img, index) => ({
      property_id: property.id,
      storage_path: img.storagePath,
      storage_bucket: BUCKET_NAME,
      public_url: img.publicUrl,
      file_name: img.file,
      is_primary: index === 0,
      display_order: index
    }));

    const { error: insertError } = await supabase
      .from("property_images")
      .insert(imageInserts);

    if (insertError) {
      console.log(`  ❌ Error: ${insertError.message}`);
    } else {
      console.log(`  ✅ Added ${imageInserts.length} images`);
    }
  }

  console.log("\n✅ All properties updated with Supabase Storage images!");
}

uploadImagesToSupabase();

