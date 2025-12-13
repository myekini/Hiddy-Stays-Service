# Realtime Messaging Setup Guide

This guide will help you set up and verify Supabase Realtime subscriptions for the messaging system.

## Overview

The realtime messaging feature uses Supabase Realtime (WebSocket) to provide instant message delivery without polling. This replaces the previous REST API polling approach.

## Prerequisites

- Supabase project with messaging tables already created
- Migration `20251010000001_create_messaging_system.sql` must be applied
- Access to Supabase Dashboard

## Step 1: Apply the Migration

### Option A: Via Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com) → Your Project → SQL Editor
2. Open the migration file: `supabase/migrations/20251015000000_enable_realtime_messaging.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click "Run" to execute

### Option B: Via Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or link to your project and push
supabase link --project-ref your-project-ref
supabase db push
```

## Step 2: Verify the Migration

### Quick Verification

Run this SQL in Supabase SQL Editor:

```sql
-- Check if realtime is enabled
SELECT 
    tablename,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND pg_publication_tables.tablename = t.tablename
        ) THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as realtime_status
FROM (
    SELECT 'conversations' as tablename
    UNION ALL
    SELECT 'messages' as tablename
) t;
```

**Expected Output:**
```
tablename     | realtime_status
--------------+----------------
conversations | ✅ Enabled
messages      | ✅ Enabled
```

### Detailed Verification

Run the comprehensive verification script:

1. Open `scripts/verify-realtime-setup.sql` in Supabase SQL Editor
2. Execute the entire script
3. Review all check results

### Via Dashboard

1. Go to Supabase Dashboard → Database → Replication
2. You should see:
   - ✅ `conversations` table listed
   - ✅ `messages` table listed

## Step 3: Test the Implementation

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Test Real-time Messaging

1. Open the app in two different browser windows (or use incognito)
2. Log in as two different users (guest and host)
3. Open the messaging panel in both windows
4. Send a message from one user
5. **Verify:** The message should appear instantly in the other window without refresh

### 3. Check Browser Console

Open browser DevTools → Console and look for:
- `✅ Successfully subscribed to messages`
- `✅ Successfully subscribed to conversations`
- `New message received:` (when a message arrives)

## Troubleshooting

### Issue: Messages not appearing in real-time

**Check 1: Realtime Status**
```sql
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**Check 2: Network Tab**
- Open DevTools → Network
- Look for WebSocket connections to `wss://your-project.supabase.co`
- Should see connection status: `101 Switching Protocols`

**Check 3: Console Errors**
- Check for subscription errors in browser console
- Look for `CHANNEL_ERROR` or connection failures

### Issue: Migration fails with "table does not exist"

**Solution:** Ensure the messaging system migration is applied first:
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('conversations', 'messages');
```

### Issue: "Realtime already enabled" warning

This is **normal and safe**. The migration checks if realtime is already enabled before adding it. If you see this message, it means:
- ✅ Messages table already had realtime enabled (from earlier migration)
- ✅ The migration safely skipped adding it again
- ✅ Everything is working correctly

## Architecture

### How It Works

1. **Client-side hooks** (`useRealtimeMessages`, `useRealtimeConversations`) subscribe to Supabase Realtime
2. **Supabase Realtime** listens to PostgreSQL changes via logical replication
3. **When a message is inserted/updated**, Supabase broadcasts the change via WebSocket
4. **All connected clients** receive the update instantly
5. **UI updates automatically** without manual refresh

### Components

- **`hooks/useRealtimeMessages.ts`**: Subscribes to message changes for a specific conversation
- **`hooks/useRealtimeConversations.ts`**: Subscribes to conversation list updates
- **`components/MessagingPanel.tsx`**: Uses the hooks to display real-time messages

### Database Triggers

The messaging system uses database triggers to:
- Update `conversations.last_message_at` when a new message is created
- Update unread counts when messages are sent/received
- These triggers work seamlessly with Realtime subscriptions

## Migration History

- **20251010000001**: Created messaging system (conversations, messages tables)
- **20250731234405**: Enabled realtime for messages table (legacy)
- **20251015000000**: Enabled realtime for conversations table + verified messages

## Next Steps

After setup is complete:

1. ✅ Test with multiple users
2. ✅ Monitor WebSocket connections in production
3. ✅ Consider adding typing indicators (future enhancement)
4. ✅ Consider adding read receipts (future enhancement)

## Support

If you encounter issues:

1. Check the verification script output
2. Review browser console for errors
3. Check Supabase Dashboard → Database → Replication
4. Verify environment variables are set correctly

---

**Status:** ✅ Ready for production use

