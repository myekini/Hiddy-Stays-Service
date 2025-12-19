const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProperties() {
  console.log("🔍 Checking for properties in database...\n");
  
  const { data, error, count } = await supabase
    .from("properties")
    .select("id, title, is_active, approval_status, city", { count: "exact" })
    .limit(10);

  if (error) {
    console.error("❌ Error:", error.message);
    return;
  }

  console.log(`📊 Total properties found: ${count || 0}\n`);

  if (data && data.length > 0) {
    console.log("✅ Properties in database:");
    data.forEach((p, i) => {
      console.log(
        `${i + 1}. ${p.title}`
      );
      console.log(`   - Active: ${p.is_active}, Approval: ${p.approval_status || "N/A"}, City: ${p.city || "N/A"}\n`);
    });
  } else {
    console.log("⚠️  No properties found in database.");
    console.log("   Run 'npm run setup:properties' to create sample properties.\n");
  }
}

checkProperties();

