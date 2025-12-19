const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPropertyImages() {
  console.log("🖼️  Checking property images in database...\n");
  
  // Try different column combinations to find what exists
  const columnSchemas = [
    { cols: "id, property_id, public_url, image_url, storage_path, is_primary, display_order", name: "all fields" },
    { cols: "id, property_id, public_url, storage_path, is_primary, display_order", name: "without image_url" },
    { cols: "id, property_id, image_url, is_primary, sort_order", name: "old schema" },
    { cols: "id, property_id, is_primary", name: "minimal" }
  ];
  
  let foundImages = null;
  let schemaName = null;
  
  for (const schema of columnSchemas) {
    const { data, error, count } = await supabase
      .from("property_images")
      .select(schema.cols, { count: "exact" })
      .limit(10);
    
    if (!error || error.code === "PGRST116") {
      foundImages = data;
      schemaName = schema.name;
      console.log(`📊 Total images found: ${count || 0}\n`);
      break;
    } else if (error.code === "42703") {
      // Column doesn't exist, try next schema
      continue;
    } else if (error.code !== "42P01") {
      // Table doesn't exist
      console.error("❌ Error:", error.message);
      return;
    }
  }
  
  if (foundImages && foundImages.length > 0) {
    console.log(`✅ Property images (schema: ${schemaName}):`);
    foundImages.forEach((img, i) => {
      const url = img.public_url || img.image_url || img.storage_path || "NONE";
      console.log(
        `${i + 1}. Property: ${img.property_id?.substring(0, 8) || 'N/A'}..., Primary: ${img.is_primary || 'N/A'}, URL: ${url !== "NONE" ? url.substring(0, 60) + "..." : "NONE"}`
      );
    });
    
    // Check if any images have valid URLs
    const validImages = foundImages.filter(img => {
      const url = img.public_url || img.image_url || img.storage_path;
      return url && url.trim() !== "" && url !== "NONE";
    });
    
    console.log(`\n✅ Images with valid URLs: ${validImages.length}/${foundImages.length}`);
    
    if (validImages.length === 0) {
      console.log("\n⚠️  Warning: No images have valid URLs!");
      console.log("   Images may need to be uploaded to storage or URLs fixed.");
    }
  } else {
    console.log("⚠️  No images found in property_images table.");
    console.log("   Run 'npm run setup:properties' to add images to properties.\n");
  }
}

checkPropertyImages();

