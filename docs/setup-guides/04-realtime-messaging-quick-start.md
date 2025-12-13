# 🚀 Realtime Messaging - Quick Setup Checklist

## ✅ Pre-Flight Checks

- [x] Migration file created: `supabase/migrations/20251015000000_enable_realtime_messaging.sql`
- [x] Hooks created: `hooks/useRealtimeMessages.ts` and `hooks/useRealtimeConversations.ts`
- [x] MessagingPanel updated to use realtime hooks
- [x] Verification scripts created

## 📋 Setup Steps

### 1. Apply Migration in Supabase Dashboard

**Step-by-step:**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **"New query"**
5. Open the file: `supabase/migrations/20251015000000_enable_realtime_messaging.sql`
6. **Copy the entire contents** of the migration file
7. **Paste** into the SQL Editor
8. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)
9. Check the output - you should see:
   ```
   ✅ Realtime messaging is fully configured!
      - conversations: enabled
      - messages: enabled
   ```

**Alternative: Via Supabase CLI**
```bash
supabase db push
```

### 2. Verify Setup

**Option A: Check in Dashboard**
1. Go to **Database** → **Replication** (left sidebar)
2. You should see:
   - ✅ `conversations` table listed
   - ✅ `messages` table listed

**Option B: Run SQL Verification**
1. Open `scripts/verify-realtime-setup.sql` in Supabase SQL Editor
2. Execute the entire script
3. All checks should show ✅

**Option C: Quick SQL Check**
Run this in SQL Editor:
```sql
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('conversations', 'messages');
```

**Expected:** Both `conversations` and `messages` should be listed

### 3. Test

1. Start your dev server: `npm run dev`
2. Open app in **two different browser windows** (or use incognito)
3. Log in as **two different users** (guest and host)
4. Open the **messaging panel** in both windows
5. Send a message from one user
6. **Verify:** Message appears **instantly** in the other window without refresh

## 🔍 Verification Queries

### Check Realtime Status
```sql
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('conversations', 'messages');
```

**Expected:** Both `conversations` and `messages` should be listed

### Check Tables Exist
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('conversations', 'messages');
```

**Expected:** Both tables should exist

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Migration fails | Ensure `20251010000001_create_messaging_system.sql` is applied first |
| "Already enabled" warning | This is normal - messages table was enabled earlier |
| Messages not real-time | Check WebSocket connection in browser DevTools → Network |
| Subscription errors | Check browser console for `CHANNEL_ERROR` messages |

## 📚 Documentation

Full setup guide: `docs/setup-guides/realtime-messaging-setup.md`

## ✨ Features Enabled

- ✅ Real-time message delivery (WebSocket)
- ✅ Automatic conversation updates
- ✅ No polling required
- ✅ Instant UI updates
- ✅ Proper cleanup on unmount

---

**Ready to use!** 🎉

