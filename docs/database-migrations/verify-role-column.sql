-- Script to verify role column exists in profiles table
-- Run this in Supabase SQL Editor

-- Check if role column exists
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'role';

-- If column exists, also check constraints
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%role%';

-- Check sample data to see if role values are present
SELECT id, user_id, role, is_host
FROM public.profiles
LIMIT 10;

-- Expected result for column check:
-- column_name | data_type       | column_default | is_nullable
-- ------------|-----------------|----------------|------------
-- role        | character varying(20) | 'user'::character varying | NO

-- If you see NO RESULTS, the role column does not exist and you need to apply the migration!
