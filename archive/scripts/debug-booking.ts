
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBooking(id: string) {
  console.log(`Retrieving booking: ${id}`);

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      properties!bookings_property_id_fkey (
        id,
        title,
        description,
        address,
        location,
        price_per_night,
        max_guests,
        property_images!property_images_property_id_fkey(image_url)
      ),
      guest:profiles!bookings_guest_id_fkey (
        id,
        first_name,
        last_name,
        email,
        phone,
        avatar_url
      ),
      host:profiles!bookings_host_id_fkey (
        id,
        first_name,
        last_name,
        email,
        phone
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Booking retrieval error:", JSON.stringify(error, null, 2));
  } else {
    console.log("Booking retrieved successfully:", JSON.stringify(booking, null, 2));
  }
}

const bookingId = "6081d8a9-2e9a-4cd9-993f-2d155e7b5fa2";
debugBooking(bookingId);
