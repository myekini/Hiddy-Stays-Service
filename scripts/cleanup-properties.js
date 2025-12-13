const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const propertiesToDelete = [
  'Luxury Urban Sanctuary in Surrey',
  'Cozy Studio - Test Property'
];

async function cleanupProperties() {
  console.log('🧹 Starting property cleanup...');
  
  try {
    // Find properties by title
    const { data: properties, error: findError } = await supabase
      .from('properties')
      .select('id, title, host_id')
      .in('title', propertiesToDelete);

    if (findError) {
      console.error('❌ Error finding properties:', findError);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('ℹ️  No properties found with those titles');
      return;
    }

    console.log(`📋 Found ${properties.length} properties to delete:`);
    properties.forEach(p => console.log(`   - ${p.title} (ID: ${p.id})`));

    const propertyIds = properties.map(p => p.id);

    // 1. Delete property images
    console.log('\n🖼️  Deleting property images...');
    const { error: imagesError } = await supabase
      .from('property_images')
      .delete()
      .in('property_id', propertyIds);

    if (imagesError) {
      console.error('❌ Error deleting property images:', imagesError);
    } else {
      console.log('✅ Property images deleted');
    }

    // 2. Delete reviews
    console.log('⭐ Deleting reviews...');
    const { error: reviewsError } = await supabase
      .from('reviews')
      .delete()
      .in('property_id', propertyIds);

    if (reviewsError) {
      console.error('❌ Error deleting reviews:', reviewsError);
    } else {
      console.log('✅ Reviews deleted');
    }

    // 3. Delete review images
    console.log('📸 Deleting review images...');
    const { error: reviewImagesError } = await supabase
      .from('review_images')
      .delete()
      .in('property_id', propertyIds);

    if (reviewImagesError) {
      console.error('❌ Error deleting review images:', reviewImagesError);
    } else {
      console.log('✅ Review images deleted');
    }

    // 4. Delete bookings (this will also handle related payment transactions)
    console.log('📅 Deleting bookings...');
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .in('property_id', propertyIds);

    if (bookingsError) {
      console.error('❌ Error deleting bookings:', bookingsError);
    } else {
      console.log('✅ Bookings deleted');
    }

    // 5. Delete payment transactions (if any remain)
    console.log('💳 Deleting payment transactions...');
    const { error: paymentsError } = await supabase
      .from('payment_transactions')
      .delete()
      .in('property_id', propertyIds);

    if (paymentsError) {
      console.error('❌ Error deleting payment transactions:', paymentsError);
    } else {
      console.log('✅ Payment transactions deleted');
    }

    // 6. Delete notifications related to these properties
    console.log('🔔 Deleting notifications...');
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .in('property_id', propertyIds);

    if (notificationsError) {
      console.error('❌ Error deleting notifications:', notificationsError);
    } else {
      console.log('✅ Notifications deleted');
    }

    // 7. Finally, delete the properties themselves
    console.log('🏠 Deleting properties...');
    const { error: propertiesError } = await supabase
      .from('properties')
      .delete()
      .in('id', propertyIds);

    if (propertiesError) {
      console.error('❌ Error deleting properties:', propertiesError);
    } else {
      console.log('✅ Properties deleted');
    }

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('📊 Summary:');
    properties.forEach(p => console.log(`   ✅ Deleted: ${p.title}`));

  } catch (error) {
    console.error('💥 Unexpected error during cleanup:', error);
  }
}

// Run the cleanup
cleanupProperties()
  .then(() => {
    console.log('\n🏁 Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
