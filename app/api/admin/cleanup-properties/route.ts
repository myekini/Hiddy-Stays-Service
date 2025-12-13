import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyTitles = searchParams.get("titles");
    
    if (!propertyTitles) {
      return NextResponse.json(
        { error: "Property titles are required" },
        { status: 400 }
      );
    }

    const titlesToDelete = propertyTitles.split(",").map(title => title.trim());
    
    console.log("🧹 Starting property cleanup for:", titlesToDelete);

    // Find properties by title
    const { data: properties, error: findError } = await supabase
      .from("properties")
      .select("id, title, host_id")
      .in("title", titlesToDelete);

    if (findError) {
      console.error("❌ Error finding properties:", findError);
      return NextResponse.json(
        { error: "Failed to find properties", details: findError.message },
        { status: 500 }
      );
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json(
        { message: "No properties found with those titles", deleted: [] },
        { status: 200 }
      );
    }

    console.log(`📋 Found ${properties.length} properties to delete`);
    const propertyIds = properties.map(p => p.id);
    const deletedProperties = [...properties];

    // 1. Delete property images
    console.log("🖼️  Deleting property images...");
    const { error: imagesError } = await supabase
      .from("property_images")
      .delete()
      .in("property_id", propertyIds);

    if (imagesError) {
      console.error("❌ Error deleting property images:", imagesError);
    }

    // 2. Delete reviews
    console.log("⭐ Deleting reviews...");
    const { error: reviewsError } = await supabase
      .from("reviews")
      .delete()
      .in("property_id", propertyIds);

    if (reviewsError) {
      console.error("❌ Error deleting reviews:", reviewsError);
    }

    // 3. Delete review images
    console.log("📸 Deleting review images...");
    const { error: reviewImagesError } = await supabase
      .from("review_images")
      .delete()
      .in("property_id", propertyIds);

    if (reviewImagesError) {
      console.error("❌ Error deleting review images:", reviewImagesError);
    }

    // 4. Delete bookings
    console.log("📅 Deleting bookings...");
    const { error: bookingsError } = await supabase
      .from("bookings")
      .delete()
      .in("property_id", propertyIds);

    if (bookingsError) {
      console.error("❌ Error deleting bookings:", bookingsError);
    }

    // 5. Delete payment transactions
    console.log("💳 Deleting payment transactions...");
    const { error: paymentsError } = await supabase
      .from("payment_transactions")
      .delete()
      .in("property_id", propertyIds);

    if (paymentsError) {
      console.error("❌ Error deleting payment transactions:", paymentsError);
    }

    // 6. Delete notifications
    console.log("🔔 Deleting notifications...");
    const { error: notificationsError } = await supabase
      .from("notifications")
      .delete()
      .in("property_id", propertyIds);

    if (notificationsError) {
      console.error("❌ Error deleting notifications:", notificationsError);
    }

    // 7. Finally, delete the properties themselves
    console.log("🏠 Deleting properties...");
    const { error: propertiesError } = await supabase
      .from("properties")
      .delete()
      .in("id", propertyIds);

    if (propertiesError) {
      console.error("❌ Error deleting properties:", propertiesError);
      return NextResponse.json(
        { error: "Failed to delete properties", details: propertiesError.message },
        { status: 500 }
      );
    }

    console.log("🎉 Cleanup completed successfully!");

    return NextResponse.json({
      success: true,
      message: "Properties and all related data deleted successfully",
      deleted: deletedProperties.map(p => ({
        id: p.id,
        title: p.title,
        host_id: p.host_id
      }))
    });

  } catch (error) {
    console.error("💥 Unexpected error during cleanup:", error);
    return NextResponse.json(
      { error: "Internal server error during cleanup" },
      { status: 500 }
    );
  }
}
