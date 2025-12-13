-- Script to make a user admin
-- Replace 'your-email@example.com' with your actual email address

-- First, find your user ID
SELECT 
  au.id as user_id,
  au.email,
  p.role as current_role,
  p.is_host
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE au.email = 'your-email@example.com';

-- Update your role to admin (replace the email with your actual email)
UPDATE public.profiles 
SET 
  role = 'admin',
  is_host = true,
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- Also update the auth.users metadata
UPDATE auth.users 
SET user_metadata = user_metadata || '{"role": "admin", "is_host": true}'::jsonb
WHERE email = 'your-email@example.com';

-- Verify the update
SELECT 
  au.id as user_id,
  au.email,
  au.user_metadata,
  p.role as profile_role,
  p.is_host
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE au.email = 'your-email@example.com';
