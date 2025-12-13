/**
 * Script to check all migrations and verify they're in sync
 * Lists all migration files and checks for potential conflicts
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../supabase/migrations');

function getAllMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  return files;
}

function checkRealtimeMigrations() {
  console.log('🔍 Checking Realtime-related migrations...\n');

  const migrations = getAllMigrations();
  const realtimeMigrations = [];

  migrations.forEach(file => {
    const content = fs.readFileSync(
      path.join(migrationsDir, file),
      'utf8'
    );

    if (content.includes('supabase_realtime') || 
        content.includes('ALTER PUBLICATION')) {
      realtimeMigrations.push({
        file,
        hasRealtime: true,
        tables: extractTables(content)
      });
    }
  });

  console.log('📋 Realtime migrations found:');
  realtimeMigrations.forEach(({ file, tables }) => {
    console.log(`   ✅ ${file}`);
    if (tables.length > 0) {
      console.log(`      Tables: ${tables.join(', ')}`);
    }
  });

  // Check for our specific migration
  const ourMigration = migrations.find(f => 
    f.includes('20251015000000_enable_realtime_messaging')
  );

  if (ourMigration) {
    console.log(`\n✅ Our realtime migration found: ${ourMigration}`);
  } else {
    console.log('\n❌ Our realtime migration NOT found!');
  }

  return realtimeMigrations;
}

function extractTables(content) {
  const tables = [];
  
  // Look for table names in ALTER PUBLICATION statements
  const publicationMatches = content.matchAll(
    /ALTER PUBLICATION\s+supabase_realtime\s+ADD TABLE\s+public\.(\w+)/gi
  );
  
  for (const match of publicationMatches) {
    if (match[1] && !tables.includes(match[1])) {
      tables.push(match[1]);
    }
  }

  return tables;
}

function checkMigrationOrder() {
  console.log('\n📅 Checking migration order...\n');

  const migrations = getAllMigrations();
  
  // Check if messaging system migration exists before realtime migration
  const messagingMigration = migrations.find(f => 
    f.includes('20251010000001_create_messaging_system')
  );
  
  const realtimeMigration = migrations.find(f => 
    f.includes('20251015000000_enable_realtime_messaging')
  );

  if (messagingMigration && realtimeMigration) {
    console.log('   ✅ Messaging system migration exists before realtime migration');
    console.log(`      ${messagingMigration} → ${realtimeMigration}`);
  } else if (!messagingMigration) {
    console.log('   ⚠️  Messaging system migration not found');
  } else if (!realtimeMigration) {
    console.log('   ⚠️  Realtime migration not found');
  }

  // Check for duplicate realtime enables
  console.log('\n🔍 Checking for duplicate realtime enables...');
  
  const messagesRealtimeCount = migrations.filter(f => {
    const content = fs.readFileSync(
      path.join(migrationsDir, f),
      'utf8'
    );
    return content.includes('supabase_realtime') && 
           content.includes('messages');
  }).length;

  if (messagesRealtimeCount > 1) {
    console.log(`   ⚠️  Found ${messagesRealtimeCount} migrations enabling realtime for messages`);
    console.log('   💡 This is OK - our migration checks if already enabled');
  } else {
    console.log('   ✅ No duplicate realtime enables detected');
  }
}

function main() {
  console.log('🚀 Migration Check Script\n');
  console.log('='.repeat(50) + '\n');

  const allMigrations = getAllMigrations();
  console.log(`📦 Total migrations found: ${allMigrations.length}\n`);

  checkRealtimeMigrations();
  checkMigrationOrder();

  console.log('\n' + '='.repeat(50));
  console.log('\n📝 Summary:');
  console.log('   1. Review the migrations listed above');
  console.log('   2. Run: npm run verify:realtime');
  console.log('   3. Apply migration in Supabase SQL Editor if needed\n');
}

main();

