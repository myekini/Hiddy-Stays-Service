# Apply Realtime Messaging Migration

## Quick Steps to Apply from Supabase Dashboard

### 1. Open Supabase Dashboard
- Go to: https://app.supabase.com
- Select your project

### 2. Navigate to SQL Editor
- Click **SQL Editor** in the left sidebar
- Click **"New query"** button

### 3. Copy Migration SQL
Open this file in your project:
```
supabase/migrations/20251015000000_enable_realtime_messaging.sql
```

**Copy the entire contents** (all 69 lines)

### 4. Paste and Run
- Paste into the SQL Editor
- Click **"Run"** button (or press `Ctrl+Enter`)

### 5. Verify Success
You should see output like:
```
NOTICE: Realtime enabled for conversations table
NOTICE: Realtime already enabled for messages table
NOTICE: ✅ Realtime messaging is fully configured!
NOTICE:    - conversations: enabled
NOTICE:    - messages: enabled
```

### 6. Double-Check in Dashboard
- Go to **Database** → **Replication**
- Verify both `conversations` and `messages` are listed

## That's It! ✅

Your realtime messaging is now configured. Test it by:
1. Opening the app in two browser windows
2. Logging in as two different users
3. Sending messages - they should appear instantly!

---

**Need help?** See full guide: `docs/setup-guides/realtime-messaging-setup.md`

