const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function approveProperties() {
  console.log("✅ Approving all pending properties...\n");
  
  // Update all pending properties to approved
  const { data, error } = await supabase
    .from("properties")
    .update({ 
      approval_status: "approved",
      approved_at: new Date().toISOString()
    })
    .eq("approval_status", "pending")
    .select("id, title");

  if (error) {
    console.error("❌ Error:", error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log(`✅ Approved ${data.length} properties:\n`);
    data.forEach((p, i) => {
      console.log(`${i + 1}. ${p.title}`);
    });
    console.log("\n🎉 Properties are now visible in the API!");
  } else {
    console.log("⚠️  No pending properties found to approve.");
  }
}

approveProperties();

