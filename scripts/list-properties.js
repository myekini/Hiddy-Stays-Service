import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listProperties() {
  const { data: properties, error } = await supabase
    .from("properties")
    .select("id, title, location, price_per_night, is_active");

  if (error) {
    console.error("Error fetching properties:", error);
    return;
  }

  console.log("Found properties:");
  properties.forEach(p => {
    console.log(`- [${p.id}] ${p.title} (${p.location}) - $${p.price_per_night} (Active: ${p.is_active})`);
  });
}

listProperties();
