# New Features Testing Guide

This document outlines the new features implemented and how to test them.

## 🆕 New Features Implemented

### 1. Property Approval System

- **New Column**: `approval_status` in `properties` table
- **Status Values**: `pending`, `approved`, `rejected`, `flagged`
- **Admin Functions**: Approve, reject, or flag properties
- **API Endpoint**: `/api/admin/properties/approve`

### 2. Payment Status Tracking

- **New Column**: `payment_status` in `bookings` table
- **Status Values**: `pending`, `processing`, `succeeded`, `failed`, `refunded`, `partially_refunded`, `disputed`
- **Additional Columns**: `payment_intent_id`, `stripe_session_id`, `payment_method`, `refund_amount`, etc.
- **API Enhancement**: Updated booking APIs to filter by payment status

### 3. Review System with Moderation

- **New Tables**: `reviews`, `review_images`, `review_helpful_votes`, `review_reports`
- **Features**: Review creation, moderation, helpful votes, reporting
- **API Endpoints**: `/api/reviews`, `/api/admin/reviews`
- **Auto-updates**: Property ratings updated automatically via database triggers

### 4. Role-Based Access Control

- **New Column**: `role` in `profiles` table
- **Roles**: `user`, `host`, `admin`, `super_admin`, `moderator`
- **Additional Columns**: `is_verified`, `location`, `last_login_at`, `login_count`
- **API Endpoint**: `/api/admin/users/roles`
- **Functions**: Role validation functions (`is_admin`, `is_host`)

## 🧪 Testing the New Features

### Prerequisites

1. Ensure your Supabase instance is running
2. Make sure all migrations have been applied
3. Set up environment variables:
   ```bash
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

### Running Individual Tests

#### 1. Property Approval Workflow

```bash
npm run test:property-approval
```

**What it tests:**

- Property creation with pending approval status
- Property filtering by approval status
- Admin approval workflow
- Property visibility based on approval status
- Property rejection and flagging workflows

#### 2. Payment Status Tracking

```bash
npm run test:payment-status
```

**What it tests:**

- Booking creation with pending payment status
- Payment status filtering
- Payment processing workflow
- Successful payment handling
- Payment failure scenarios
- Refund processing

#### 3. Review System

```bash
npm run test:reviews
```

**What it tests:**

- Review creation and submission
- Review image attachments
- Review approval and publishing
- Property rating updates via triggers
- Review helpful votes
- Review reporting system
- Review moderation workflows

#### 4. Role-Based Access Control

```bash
npm run test:roles
```

**What it tests:**

- User creation with different roles
- Role-based property access
- Property visibility based on roles
- Role-based user management
- Admin-specific functions
- Activity logging
- Role validation functions

### Running All Tests

```bash
npm run test:all-features
```

This runs all the above tests in sequence and provides a comprehensive summary.

## 📊 Expected Test Results

### Successful Test Run

```
🚀 Starting Comprehensive Test Suite for New Features

🧪 Running: Property Approval Workflow
✅ Property Approval Workflow - PASSED

🧪 Running: Booking Payment Status Tracking
✅ Booking Payment Status Tracking - PASSED

🧪 Running: Review Submission and Moderation
✅ Review Submission and Moderation - PASSED

🧪 Running: Role-Based Access Control
✅ Role-Based Access Control - PASSED

📊 TEST SUMMARY
Total Tests: 4
✅ Passed: 4
❌ Failed: 0
📈 Success Rate: 100.0%
```

## 🔧 API Endpoints Created/Updated

### New API Endpoints

- `POST /api/admin/properties/approve` - Approve/reject/flag properties
- `GET /api/admin/properties/approve` - Get properties pending approval
- `POST /api/reviews` - Create a new review
- `GET /api/reviews` - Get reviews with filters
- `PUT /api/admin/reviews` - Moderate reviews
- `POST /api/admin/reviews` - Report reviews
- `GET /api/admin/users/roles` - Get users with roles
- `PUT /api/admin/users/roles` - Update user role
- `POST /api/admin/users/roles` - Bulk update user roles

### Updated API Endpoints

- `GET /api/bookings` - Added payment_status filtering
- `GET /api/properties` - Added approval_status filtering and default approved-only visibility
- `POST /api/bookings/create` - Added payment_status and currency fields

## 🗄️ Database Schema Changes

### New Columns Added

**Properties Table:**

- `approval_status` (pending/approved/rejected/flagged)
- `approved_at`, `approved_by`, `admin_notes`
- `rejected_reason`, `rejection_notes`
- Rating columns: `cleanliness_rating`, `accuracy_rating`, etc.

**Bookings Table:**

- `payment_status` (pending/processing/succeeded/failed/refunded/partially_refunded/disputed)
- `payment_intent_id`, `stripe_session_id`, `payment_method`
- `refund_amount`, `refund_date`, `refund_reason`
- `guest_name`, `guest_email`, `guest_phone`

**Profiles Table:**

- `role` (user/host/admin/super_admin/moderator)
- `is_verified`, `location`, `last_login_at`, `login_count`

### New Tables

- `reviews` - Guest reviews and ratings
- `review_images` - Images attached to reviews
- `review_helpful_votes` - Helpful votes on reviews
- `review_reports` - Reports of inappropriate reviews
- `activity_logs` - System activity tracking
- `message_templates` - Message templates for hosts

## 🚀 Deployment Checklist

Before deploying these features to production:

1. ✅ **Database Migrations Applied**
   - Run all migrations in order
   - Verify schema matches expected structure

2. ✅ **TypeScript Types Generated**

   ```bash
   npx supabase gen types typescript --local > integrations/supabase/types.ts
   ```

3. ✅ **API Routes Updated**
   - All API routes use new columns
   - Proper validation and error handling
   - Role-based access control implemented

4. ✅ **Tests Passing**

   ```bash
   npm run test:all-features
   ```

5. ✅ **RLS Policies Configured**
   - Properties: Only approved properties visible to public
   - Reviews: Proper access control for creation and moderation
   - Users: Role-based access to admin functions

6. ✅ **Environment Variables Set**
   - Supabase URL and keys configured
   - Admin user created with proper role

## 🐛 Troubleshooting

### Common Issues

1. **Migration Errors**
   - Ensure migrations are run in order
   - Check for conflicting table definitions
   - Verify RLS policies are properly configured

2. **Type Errors**
   - Regenerate types after schema changes
   - Check import paths in lib/types.ts
   - Verify all new columns are included

3. **Permission Errors**
   - Check user roles in profiles table
   - Verify RLS policies allow required operations
   - Ensure service role key has proper permissions

4. **Test Failures**
   - Check database connection
   - Verify test data cleanup
   - Review foreign key constraints

### Getting Help

If you encounter issues:

1. Check the test output for specific error messages
2. Verify your database schema matches the migrations
3. Ensure all environment variables are set correctly
4. Review the API route implementations for proper error handling

## 📝 Next Steps

After successful testing:

1. **Frontend Integration**
   - Update components to use new API endpoints
   - Implement property approval UI for admins
   - Add payment status indicators
   - Create review submission and moderation interfaces

2. **Admin Dashboard**
   - Property moderation queue
   - Review moderation panel
   - User role management
   - System activity monitoring

3. **Production Deployment**
   - Run migrations on production database
   - Deploy updated API routes
   - Update frontend application
   - Configure admin users with proper roles

4. **Monitoring**
   - Set up alerts for failed payments
   - Monitor property approval queue
   - Track review moderation metrics
   - Monitor user role changes

