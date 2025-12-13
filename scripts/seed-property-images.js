const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Map local images with descriptions for properties
const propertyImages = [
  {
    path: "/assets/bed_lanscape.jpg",
    description: "Spacious bedroom with panoramic view",
    category: "bedroom"
  },
  {
    path: "/assets/bed_upclose.jpg",
    description: "Cozy bed with premium linens",
    category: "bedroom"
  },
  {
    path: "/assets/Full_kitchen.jpg",
    description: "Fully equipped modern kitchen",
    category: "kitchen"
  },
  {
    path: "/assets/kitchen_cutleries_showcase.jpg",
    description: "Premium kitchen cutlery and utensils",
    category: "kitchen"
  },
  {
    path: "/assets/dining_area.jpg",
    description: "Elegant dining area",
    category: "dining"
  },
  {
    path: "/assets/little_dinning_area.jpg",
    description: "Intimate breakfast nook",
    category: "dining"
  },
  {
    path: "/assets/bathoom_and_toilet.jpg",
    description: "Modern bathroom with full amenities",
    category: "bathroom"
  },
  {
    path: "/assets/sititng_room_washhand_base.jpg",
    description: "Living area with wash basin",
    category: "living"
  },
  {
    path: "/assets/smart_tv_on_stand.jpg",
    description: "Entertainment center with smart TV",
    category: "living"
  },
  {
    path: "/assets/city_view_from_backyard.jpg",
    description: "Stunning city views from backyard",
    category: "exterior"
  },
  {
    path: "/assets/night_city_view_from_upstair.jpg",
    description: "Breathtaking night city skyline",
    category: "exterior"
  },
  {
    path: "/assets/walkway_to_the_room.jpg",
    description: "Welcoming entrance walkway",
    category: "exterior"
  },
  {
    path: "/assets/Ouside_infront_apartment_through_the_glass.jpg",
    description: "Modern apartment exterior view",
    category: "exterior"
  },
  {
    path: "/assets/apartment_lobby_ss.jpg",
    description: "Grand apartment lobby",
    category: "amenities"
  },
  {
    path: "/assets/waiting_room_lobby_ss.jpg",
    description: "Comfortable waiting lounge",
    category: "amenities"
  },
  {
    path: "/assets/Gym_area_ss.jpg",
    description: "State-of-the-art fitness center",
    category: "amenities"
  },
  {
    path: "/assets/snoker_area_ss.jpg",
    description: "Recreation room with snooker table",
    category: "amenities"
  },
  {
    path: "/assets/washing_machine.jpg",
    description: "In-unit laundry facilities",
    category: "amenities"
  }
];

async function seedPropertyImages() {
  try {
    console.log("🖼️  Starting to seed property images...");

    // Get all properties
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("id, title");

    if (propertiesError) throw propertiesError;

    if (!properties || properties.length === 0) {
      console.log("No properties found. Please create properties first.");
      return;
    }

    console.log(`Found ${properties.length} properties`);

    for (const property of properties) {
      console.log(`\n📍 Processing property: ${property.title}`);

      // Delete existing images for this property
      const { error: deleteError } = await supabase
        .from("property_images")
        .delete()
        .eq("property_id", property.id);

      if (deleteError) {
        console.error(`Error deleting existing images for ${property.title}:`, deleteError);
        continue;
      }

      // Select a varied set of images for each property (8-12 images)
      const selectedImages = [];
      
      // Always include: 1 bedroom, 1 kitchen, 1 bathroom, 1 living, 2 exterior, 2 amenities
      const categories = ["bedroom", "kitchen", "bathroom", "living", "exterior", "exterior", "amenities", "amenities"];
      
      for (const cat of categories) {
        const catImages = propertyImages.filter(img => img.category === cat);
        const randomImg = catImages[Math.floor(Math.random() * catImages.length)];
        if (randomImg && !selectedImages.includes(randomImg)) {
          selectedImages.push(randomImg);
        }
      }

      // Add more random images to reach 10-12 total
      const remaining = propertyImages.filter(img => !selectedImages.includes(img));
      const additionalCount = Math.min(4, remaining.length);
      for (let i = 0; i < additionalCount; i++) {
        const randomIndex = Math.floor(Math.random() * remaining.length);
        selectedImages.push(remaining.splice(randomIndex, 1)[0]);
      }

      // Insert images for this property
      const imageInserts = selectedImages.map((img, index) => ({
        property_id: property.id,
        public_url: img.path,
        storage_path: img.path,
        file_name: img.path.split('/').pop(),
        is_primary: index === 0,
        display_order: index
      }));

      const { error: insertError } = await supabase
        .from("property_images")
        .insert(imageInserts);

      if (insertError) {
        console.error(`Error inserting images for ${property.title}:`, insertError);
      } else {
        console.log(`  ✅ Added ${imageInserts.length} images`);
      }
    }

    console.log("\n✅ Property images seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding property images:", error);
  }
}

seedPropertyImages();

