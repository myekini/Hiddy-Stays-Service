import { createClient } from "@supabase/supabase-js";
import { readdirSync } from "fs";
import { join } from "path";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// We'll create a sample host profile first
const SAMPLE_HOST_EMAIL = "host@example.com";

const apartmentImages = [
  "apartment_lobby_ss.jpg",
  "bathoom_and_toilet.jpg", 
  "bed_lanscape.jpg",
  "bed_upclose.jpg",
  "city_view_from_backyard.jpg",
  "dining_area.jpg",
  "Full_kitchen.jpg",
  "Gym_area_ss.jpg",
  "kitchen_cutleries_showcase.jpg",
  "little_dinning_area.jpg",
  "night_city_view_from_upstair.jpg",
  "Ouside_infront_apartment_through_the_glass.jpg",
  "sititng_room_washhand_base.jpg",
  "smart_tv_on_stand.jpg",
  "snoker_area_ss.jpg",
  "waiting_room_lobby_ss.jpg",
  "walkway_to_the_room.jpg",
  "washing_machine.jpg"
];

const properties = [
  {
    title: "Modern Downtown Apartment",
    description: "Beautiful modern apartment in the heart of downtown with stunning city views. Features a fully equipped kitchen, comfortable living space, and modern amenities. Perfect for business travelers and tourists alike.",
    address: "123 Main Street, Downtown",
    location: "Toronto, ON, Canada",
    price_per_night: 120,
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
      "Gym",
      "Washer",
      "Dryer"
    ],
    house_rules: [
      "No smoking",
      "No pets",
      "No parties",
      "Check-in after 3 PM",
      "Check-out before 11 AM"
    ],
    cancellation_policy: "moderate",
    min_nights: 1,
    max_nights: 30,
    advance_notice_hours: 24,
    same_day_booking: true,
    is_active: true,
    status: "active"
  },
  {
    title: "Luxury City Center Suite",
    description: "Elegant suite with panoramic city views, premium amenities, and sophisticated design. Features a spacious living area, modern kitchen, and access to building facilities including gym and lounge areas.",
    address: "456 Business District Ave",
    location: "Toronto, ON, Canada", 
    price_per_night: 180,
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
      "Gym",
      "Pool",
      "Balcony",
      "Washer",
      "Dryer"
    ],
    house_rules: [
      "No smoking",
      "No pets", 
      "No parties",
      "Check-in after 4 PM",
      "Check-out before 12 PM"
    ],
    cancellation_policy: "flexible",
    min_nights: 2,
    max_nights: 14,
    advance_notice_hours: 12,
    same_day_booking: false,
    is_active: true,
    status: "active"
  }
];

async function addExistingProperties() {
  try {
    console.log("Starting to add existing properties...");

    // First, create or get a sample host profile
    let hostProfile;
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("first_name", "Sample")
      .eq("last_name", "Host")
      .single();

    if (existingProfile) {
      hostProfile = existingProfile;
      console.log("Using existing host profile:", hostProfile.id);
    } else {
      // Create a sample host profile
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID
          first_name: "Sample",
          last_name: "Host",
          is_host: true
        })
        .select()
        .single();

      if (profileError) {
        console.error("Error creating host profile:", profileError);
        return;
      }

      hostProfile = newProfile;
      console.log("Created new host profile:", hostProfile.id);
    }

    for (const propertyData of properties) {
      console.log(`Creating property: ${propertyData.title}`);

      // Create property
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert({
          host_id: hostProfile.id,
          title: propertyData.title,
          description: propertyData.description,
          address: propertyData.address,
          location: propertyData.location,
          city: "Toronto",
          country: "Canada",
          price_per_night: propertyData.price_per_night,
          bedrooms: propertyData.bedrooms,
          bathrooms: propertyData.bathrooms,
          max_guests: propertyData.max_guests,
          property_type: propertyData.property_type,
          amenities: propertyData.amenities,
          house_rules: propertyData.house_rules,
          cancellation_policy: propertyData.cancellation_policy,
          min_nights: propertyData.min_nights,
          max_nights: propertyData.max_nights,
          advance_notice_hours: propertyData.advance_notice_hours,
          same_day_booking: propertyData.same_day_booking,
          is_active: propertyData.is_active,
          status: propertyData.status
        })
        .select()
        .single();

      if (propertyError) {
        console.error(`Error creating property ${propertyData.title}:`, propertyError);
        continue;
      }

      console.log(`Property created successfully: ${property.id}`);

      // Add images for the first property (using apartment images)
      if (propertyData.title === "Modern Downtown Apartment") {
        const imageInserts = apartmentImages.map((imageName, index) => ({
          property_id: property.id,
          image_url: `/assets/${imageName}`,
          is_primary: index === 0,
          image_type: imageName.endsWith('_ss.jpg') ? 'screenshot' : 'photo'
        }));

        const { error: imageError } = await supabase
          .from("property_images")
          .insert(imageInserts);

        if (imageError) {
          console.error("Error adding images:", imageError);
        } else {
          console.log(`Added ${imageInserts.length} images to property ${property.id}`);
        }
      }
    }

    console.log("All properties added successfully!");
  } catch (error) {
    console.error("Error adding properties:", error);
  }
}

// Run the script
addExistingProperties();
