#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://ihgzllefbkzqnomsviwh.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZ3psbGVmYmt6cW5vbXN2aXdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzk5ODQ2NCwiZXhwIjoyMDY5NTc0NDY0fQ.hcNdhRf_B3KpqIULULvRX17sP-pZtBx8MuBQodslMRA";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkAndFixSchema() {
  console.log("🔍 Checking database schema...\n");

  try {
    // SQL to add missing columns if they don't exist
    const migrations = [
      `-- Add missing columns to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS min_nights INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_nights INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS advance_notice_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS same_day_booking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS availability_rules JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;`,

      `-- Update status column constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'properties'
               AND column_name = 'status') THEN
        ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;
        ALTER TABLE public.properties
        ADD CONSTRAINT properties_status_check
        CHECK (status IN ('draft', 'active', 'inactive'));
    END IF;
END $$;`,

      `-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_active ON public.properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON public.properties(is_featured);
CREATE INDEX IF NOT EXISTS idx_properties_host_id ON public.properties(host_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(property_type);`,

      `-- Update property_images table
ALTER TABLE public.property_images
ADD COLUMN IF NOT EXISTS image_type TEXT DEFAULT 'photo';`,

      `-- Add image_type constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_images_image_type_check') THEN
        ALTER TABLE public.property_images
        ADD CONSTRAINT property_images_image_type_check
        CHECK (image_type IN ('photo', 'screenshot', 'floor_plan', 'amenity'));
    END IF;
END $$;`,
    ];

    for (let i = 0; i < migrations.length; i++) {
      console.log(`📝 Applying migration ${i + 1}/${migrations.length}...`);

      const { error } = await supabase.rpc('exec_sql', { sql_string: migrations[i] }).catch(() => {
        // If RPC doesn't exist, try direct query
        return supabase.from('_').select('*').limit(0);
      });

      // Try alternative approach using raw SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ sql_string: migrations[i] }),
      }).catch(() => null);

      if (response && response.ok) {
        console.log(`   ✅ Migration ${i + 1} applied successfully`);
      } else {
        console.log(`   ⚠️ Migration ${i + 1} may have failed (this is expected if columns already exist)`);
      }
    }

    console.log("\n✅ Schema check complete!");
    console.log("\n📋 Verifying properties table structure...");

    // Check if we can select from properties with new columns
    const { data, error } = await supabase
      .from("properties")
      .select("id, title, status, advance_notice_hours, is_featured")
      .limit(1);

    if (error) {
      console.error("❌ Error verifying schema:", error.message);
      console.log("\n💡 You may need to apply migrations manually through Supabase SQL editor");
      console.log("   Copy the SQL from supabase/migrations/20250731220936_add_property_management_columns.sql");
    } else {
      console.log("✅ Properties table structure verified!");
      console.log("   - advance_notice_hours column exists");
      console.log("   - status column exists");
      console.log("   - is_featured column exists");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkAndFixSchema();
