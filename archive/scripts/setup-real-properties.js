const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Real apartment images organized by room/area
const realApartmentImages = [
  { path: "/assets/bed_lanscape.jpg", order: 0, primary: true },
  { path: "/assets/bed_upclose.jpg", order: 1 },
  { path: "/assets/Full_kitchen.jpg", order: 2 },
  { path: "/assets/kitchen_cutleries_showcase.jpg", order: 3 },
  { path: "/assets/dining_area.jpg", order: 4 },
  { path: "/assets/little_dinning_area.jpg", order: 5 },
  { path: "/assets/bathoom_and_toilet.jpg", order: 6 },
  { path: "/assets/sititng_room_washhand_base.jpg", order: 7 },
  { path: "/assets/smart_tv_on_stand.jpg", order: 8 },
  { path: "/assets/city_view_from_backyard.jpg", order: 9 },
  { path: "/assets/night_city_view_from_upstair.jpg", order: 10 },
  { path: "/assets/walkway_to_the_room.jpg", order: 11 },
  { path: "/assets/washing_machine.jpg", order: 12 },
];

// Building amenity images (for dummy property or shared amenities)
const buildingAmenityImages = [
  { path: "/assets/apartment_lobby_ss.jpg", order: 0, primary: true },
  { path: "/assets/waiting_room_lobby_ss.jpg", order: 1 },
  { path: "/assets/Gym_area_ss.jpg", order: 2 },
  { path: "/assets/snoker_area_ss.jpg", order: 3 },
  { path: "/assets/Ouside_infront_apartment_through_the_glass.jpg", order: 4 },
];

async function setupProperties() {
  console.log("🏠 Setting up properties...\n");

  try {
    // Step 1: Get existing properties
    const { data: existingProperties } = await supabase
      .from("properties")
      .select("id, title");

    console.log(`Found ${existingProperties?.length || 0} existing properties`);

    // Step 2: Delete all existing properties and their images
    if (existingProperties && existingProperties.length > 0) {
      console.log("\n🗑️  Cleaning up existing properties...");
      
      for (const prop of existingProperties) {
        // Delete images first
        await supabase
          .from("property_images")
          .delete()
          .eq("property_id", prop.id);
        
        // Delete bookings
        await supabase
          .from("bookings")
          .delete()
          .eq("property_id", prop.id);
        
        // Delete property
        await supabase
          .from("properties")
          .delete()
          .eq("id", prop.id);
        
        console.log(`  ✅ Deleted: ${prop.title}`);
      }
    }

    // Step 3: Get or create a host profile
    const { data: hostProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_host", true)
      .limit(1)
      .single();

    if (!hostProfile) {
      console.log("\n⚠️  No host profile found. Please create a host account first.");
      return;
    }

    console.log(`\n👤 Using host profile: ${hostProfile.id}`);

    // Step 4: Create the REAL apartment property
    console.log("\n🏢 Creating real apartment property...");
    
    const { data: realProperty, error: realError } = await supabase
      .from("properties")
      .insert({
        host_id: hostProfile.id,
        title: "BC Rentals Vancouver",
        description: `Experience urban living at its finest in this stunning modern apartment featuring breathtaking city views, both day and night. 

This beautifully appointed space includes:
• Spacious bedroom with premium bedding and panoramic views
• Fully equipped modern kitchen with quality cutlery and appliances
• Elegant dining area perfect for meals with a view
• Cozy breakfast nook for morning coffee
• Modern bathroom with full amenities
• Entertainment center with smart TV
• In-unit laundry facilities

Building amenities include:
• Grand lobby with waiting lounge
• State-of-the-art fitness center
• Recreation room with snooker table
• Secure entry and parking

Located in a prime location with easy access to restaurants, shopping, and public transit. Perfect for business travelers, couples, or anyone seeking a premium urban retreat.`,
        address: "Surrey, BC",
        location: "Surrey, BC, Canada",
        city: "Vancouver",
        country: "Canada",
        price_per_night: 140,
        bedrooms: 1,
        bathrooms: 1,
        max_guests: 2,
        property_type: "apartment",
        amenities: [
          "WiFi",
          "Kitchen",
          "Air conditioning",
          "Heating",
          "TV",
          "Washer",
          "Gym",
          "City view",
          "Workspace",
          "Free parking"
        ],
        house_rules: [
          "No smoking",
          "No parties",
          "Quiet hours 10pm-8am"
        ],
        cancellation_policy: "moderate",
        min_nights: 1,
        max_nights: 30,
        advance_notice_hours: 24,
        same_day_booking: true,
        is_active: true,
        status: "active",
        approval_status: "approved",
        rating: 4.9,
        review_count: 47
      })
      .select()
      .single();

    if (realError) {
      console.error("Error creating real property:", realError);
      return;
    }

    console.log(`  ✅ Created: ${realProperty.title}`);

    // Add images to real property
    const realImageInserts = realApartmentImages.map(img => ({
      property_id: realProperty.id,
      public_url: img.path,
      storage_path: img.path,
      file_name: img.path.split('/').pop(),
      is_primary: img.primary || false,
      display_order: img.order
    }));

    await supabase.from("property_images").insert(realImageInserts);
    console.log(`  📸 Added ${realImageInserts.length} images`);

    // Step 5: Create a DUMMY property for testing
    console.log("\n🧪 Creating dummy test property...");
    
    const { data: dummyProperty, error: dummyError } = await supabase
      .from("properties")
      .insert({
        host_id: hostProfile.id,
        title: "Cozy Studio - Test Property",
        description: `This is a test property for development and testing purposes.

Features modern amenities including a grand lobby, fitness center, and recreation facilities. Great for testing the booking flow.

Note: This is a dummy listing for testing.`,
        address: "456 Test Street, Toronto",
        location: "Midtown Toronto, ON, Canada",
        city: "Toronto",
        country: "Canada",
        price_per_night: 99,
        bedrooms: 1,
        bathrooms: 1,
        max_guests: 2,
        property_type: "studio",
        amenities: [
          "WiFi",
          "Kitchen",
          "Air conditioning",
          "Gym",
          "Parking"
        ],
        house_rules: ["No smoking", "No pets"],
        cancellation_policy: "flexible",
        min_nights: 1,
        max_nights: 14,
        advance_notice_hours: 12,
        same_day_booking: true,
        is_active: true,
        status: "active",
        approval_status: "approved",
        rating: 4.5,
        review_count: 12
      })
      .select()
      .single();

    if (dummyError) {
      console.error("Error creating dummy property:", dummyError);
      return;
    }

    console.log(`  ✅ Created: ${dummyProperty.title}`);

    // Add building amenity images to dummy property
    const dummyImageInserts = buildingAmenityImages.map(img => ({
      property_id: dummyProperty.id,
      public_url: img.path,
      storage_path: img.path,
      file_name: img.path.split('/').pop(),
      is_primary: img.primary || false,
      display_order: img.order
    }));

    await supabase.from("property_images").insert(dummyImageInserts);
    console.log(`  📸 Added ${dummyImageInserts.length} images`);

    console.log("\n✅ Setup complete!");
    console.log("\n📋 Summary:");
    console.log(`  1. Real Property: "${realProperty.title}" - $${realProperty.price_per_night}/night`);
    console.log(`  2. Test Property: "${dummyProperty.title}" - $${dummyProperty.price_per_night}/night`);

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

setupProperties();

