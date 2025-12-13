-- Enable Supabase Realtime for conversations and messages tables
-- This allows WebSocket subscriptions for real-time messaging
-- 
-- Note: Messages table may already have realtime enabled from migration 20250731234405
-- This migration safely handles that case

-- Enable realtime for conversations table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
        RAISE NOTICE 'Realtime enabled for conversations table';
    ELSE
        RAISE NOTICE 'Realtime already enabled for conversations table';
    END IF;
END $$;

-- Enable realtime for messages table (if not already enabled)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
        RAISE NOTICE 'Realtime enabled for messages table';
    ELSE
        RAISE NOTICE 'Realtime already enabled for messages table';
    END IF;
END $$;

-- Verify the setup
DO $$
DECLARE
    conv_enabled BOOLEAN;
    msg_enabled BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'conversations'
    ) INTO conv_enabled;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) INTO msg_enabled;
    
    IF conv_enabled AND msg_enabled THEN
        RAISE NOTICE '✅ Realtime messaging is fully configured!';
        RAISE NOTICE '   - conversations: enabled';
        RAISE NOTICE '   - messages: enabled';
    ELSE
        RAISE WARNING '⚠️  Realtime configuration incomplete:';
        IF NOT conv_enabled THEN
            RAISE WARNING '   - conversations: disabled';
        END IF;
        IF NOT msg_enabled THEN
            RAISE WARNING '   - messages: disabled';
        END IF;
    END IF;
END $$;
