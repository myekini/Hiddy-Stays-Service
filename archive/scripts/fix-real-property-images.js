import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PROPERTY_ID = "ed71c0f6-2204-4d14-b04c-6081b9d22c67";

async function fixImages() {
  console.log(`Fixing images for property: ${PROPERTY_ID}`);

  // 1. Check if property exists
  const { data: property, error: propError } = await supabase
    .from("properties")
    .select("id, title")
    .eq("id", PROPERTY_ID)
    .single();

  if (propError || !property) {
    console.error("Property not found!", propError);
    return;
  }
  console.log(`Found property: ${property.title}`);

  // 2. Check existing images
  const { count, error: countError } = await supabase
    .from("property_images")
    .select("*", { count: "exact", head: true })
    .eq("property_id", PROPERTY_ID);

  if (countError) {
    console.error("Error checking images:", countError);
  } else {
    console.log(`Property has ${count} images.`);
  }

  // 3. Delete existing images to reset (optional, but ensures cleanliness)
  // console.log("Deleting existing images...");
  // await supabase.from("property_images").delete().eq("property_id", PROPERTY_ID);

  if (count > 0) {
    console.log("Property already has images. Skipping insert.");
    return;
  }

  // 4. Insert Images
  console.log("Inserting images...");
  const images = [
    { url: "/assets/bed_lanscape.jpg", primary: true },
    { url: "/assets/night_city_view_from_upstair.jpg", primary: false },
    { url: "/assets/Full_kitchen.jpg", primary: false },
    { url: "/assets/bathoom_and_toilet.jpg", primary: false },
    { url: "/assets/apartment_lobby_ss.jpg", primary: false },
    { url: "/assets/dining_area.jpg", primary: false },
    { url: "/assets/Gym_area_ss.jpg", primary: false },
  ];

  // Note: Providing storage_path AND image_url to satisfy schema
  const imageInserts = images.map((img, index) => ({
    property_id: PROPERTY_ID,
    image_url: img.url,
    storage_path: img.url, // Using the same path as storage_path to satisfy constraint
    file_name: img.url.split('/').pop(),
    is_primary: img.primary,
    display_order: index
  }));

  const { error: insertError } = await supabase
    .from("property_images")
    .insert(imageInserts);

  if (insertError) {
    console.error("Error inserting images:", insertError);
  } else {
    console.log("Images inserted successfully!");
  }
}

fixImages();
