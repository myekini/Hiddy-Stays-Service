import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PROPERTY_ID = "d093065c-7cd7-4493-84fa-777777777777";

async function seedSurreyProperty() {
  try {
    console.log("Seeding Surrey Property...");

    // 1. Get or Create Host
    let hostId;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (profiles && profiles.length > 0) {
      hostId = profiles[0].id;
      console.log("Using existing host:", hostId);
    } else {
      // Create dummy host
      const { data: newHost } = await supabase
        .from("profiles")
        .insert({
          first_name: "Hiddy",
          last_name: "Host",
          is_host: true,
          email: "host@hiddystays.com"
        })
        .select()
        .single();
      hostId = newHost.id;
      console.log("Created new host:", hostId);
    }

    // 2. Upsert Property
    const propertyData = {
      id: PROPERTY_ID,
      host_id: hostId,
      title: "Luxury Urban Sanctuary in Surrey",
      description: "Escape to a premium skyline suite with breathtaking views in Surrey, BC. Modern, well-appointed space with premium amenities including a full kitchen, gym access, and panoramic night views.",
      address: "123 Skyline Blvd",
      location: "Surrey, BC",
      city: "Surrey",
      country: "Canada",
      price_per_night: 140,
      bedrooms: 1,
      bathrooms: 1,
      max_guests: 2,
      property_type: "apartment",
      amenities: ["WiFi", "Kitchen", "Gym", "Free Parking", "Washer", "Dryer", "Smart TV", "Air Conditioning"],
      is_active: true,
      status: "active",
      rating: 4.9,
      review_count: 47
    };

    const { error: propError } = await supabase
      .from("properties")
      .upsert(propertyData);

    if (propError) throw propError;
    console.log("Property upserted:", PROPERTY_ID);

    // 3. Upsert Images
    // First delete existing to avoid dupes if running again
    await supabase.from("property_images").delete().eq("property_id", PROPERTY_ID);

    const images = [
      { url: "/assets/bed_lanscape.jpg", primary: true },
      { url: "/assets/night_city_view_from_upstair.jpg", primary: false },
      { url: "/assets/Full_kitchen.jpg", primary: false },
      { url: "/assets/bathoom_and_toilet.jpg", primary: false },
      { url: "/assets/apartment_lobby_ss.jpg", primary: false },
      { url: "/assets/dining_area.jpg", primary: false },
      { url: "/assets/Gym_area_ss.jpg", primary: false },
    ];

    const imageInserts = images.map((img) => ({
      property_id: PROPERTY_ID,
      image_url: img.url,
      is_primary: img.primary
    }));

    const { error: imgError } = await supabase
      .from("property_images")
      .insert(imageInserts);

    if (imgError) throw imgError;
    console.log("Images inserted.");

    console.log("Seeding complete! Property ID:", PROPERTY_ID);

  } catch (error) {
    console.error("Error seeding property:", error);
  }
}

seedSurreyProperty();
