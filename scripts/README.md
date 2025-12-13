# Scripts Directory

This directory contains utility scripts for development, testing, and setup.

## 🧹 Cache Management

- **`clear-all-cache.ps1`** - Clears all caches (.next, node_modules/.cache, TypeScript, ESLint)
  - Run: `npm run clean`

## 🚀 Development Setup

- **`setup-dev.js`** - Sets up development environment (creates .env.local, installs deps, runs checks)
  - Run: `npm run setup:dev`

- **`setup-mock-data.js`** - Creates mock data for testing
  - Run: `npm run setup:mock`

- **`setup-sample-properties.js`** - Seeds sample properties
  - Run: `npm run setup:properties`

## 👤 Admin Management

- **`init-admin.ts`** - Promotes a user to admin role
  - Run: `npm run create:admin <user-email>`
  - Or: `npx tsx scripts/init-admin.ts <user-email>`

## 🧪 Testing Scripts

- **`test-property-approval.js`** - Tests property approval workflow
  - Run: `npm run test:property-approval`

- **`test-booking-payment-status.js`** - Tests payment status tracking
  - Run: `npm run test:payment-status`

- **`test-review-workflow.js`** - Tests review system
  - Run: `npm run test:reviews`

- **`test-role-based-access.js`** - Tests role-based access control
  - Run: `npm run test:roles`

- **`test-all-new-features.js`** - Runs all test scripts
  - Run: `npm run test:all-features`

## 📊 Database & Migrations

- **`check-all-migrations.js`** - Checks migration order and conflicts
  - Run: `node scripts/check-all-migrations.js`

- **`check-and-fix-schema.js`** - Checks and fixes database schema
  - Run: `node scripts/check-and-fix-schema.js`

- **`verify-realtime-messaging.js`** - Verifies realtime messaging setup
  - Run: `npm run verify:realtime`

## 📦 Data Seeding

- **`seed-dummy-data.js`** - Seeds dummy data for development
  - Run: `npm run seed:dummy`

- **`add-existing-properties.js`** - Adds existing properties to database
  - Run: `node scripts/add-existing-properties.js`

## 📝 Notes

- SQL verification scripts have been moved to `docs/setup-guides/` and `docs/database-migrations/`
- All scripts use Node.js unless specified (`.ps1` for PowerShell, `.ts` for TypeScript)

