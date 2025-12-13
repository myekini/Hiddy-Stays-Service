-- Verification script for Realtime Messaging setup
-- Run this in Supabase SQL Editor to verify everything is configured correctly

-- 1. Check if tables exist
SELECT 
    'Tables Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') 
        THEN '✅ conversations table exists'
        ELSE '❌ conversations table missing'
    END as conversations_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') 
        THEN '✅ messages table exists'
        ELSE '❌ messages table missing'
    END as messages_status;

-- 2. Check Realtime publication status
SELECT 
    'Realtime Status' as check_type,
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
) t
ORDER BY tablename;

-- 3. Check table schemas
SELECT 
    'Schema Check' as check_type,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('conversations', 'messages')
AND column_name IN (
    'id', 'conversation_id', 'sender_id', 'recipient_id', 
    'content', 'created_at', 'guest_id', 'host_id'
)
ORDER BY table_name, ordinal_position;

-- 4. Check RLS policies
SELECT 
    'RLS Check' as check_type,
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN permissive = 'PERMISSIVE' THEN '✅'
        ELSE '⚠️'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages')
ORDER BY tablename, policyname;

-- 5. Summary
SELECT 
    'Summary' as check_type,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('conversations', 'messages')) as tables_count,
    (SELECT COUNT(*) FROM pg_publication_tables 
     WHERE pubname = 'supabase_realtime' 
     AND tablename IN ('conversations', 'messages')) as realtime_tables_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_publication_tables 
              WHERE pubname = 'supabase_realtime' 
              AND tablename IN ('conversations', 'messages')) = 2
        THEN '✅ All tables have realtime enabled'
        ELSE '⚠️  Some tables missing realtime'
    END as overall_status;

