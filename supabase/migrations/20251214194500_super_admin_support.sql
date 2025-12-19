DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE OR REPLACE FUNCTION public.sync_profile_from_auth_metadata()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_role VARCHAR(20);
  old_role VARCHAR(20);
  profile_exists BOOLEAN;
BEGIN
  new_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');

  IF new_role NOT IN ('user', 'host', 'admin', 'super_admin') THEN
    new_role := 'user';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = NEW.id) INTO profile_exists;

  IF profile_exists THEN
    SELECT role INTO old_role FROM public.profiles WHERE user_id = NEW.id;

    IF old_role IS DISTINCT FROM new_role THEN
      UPDATE public.profiles
      SET
        role = new_role,
        is_host = new_role IN ('host', 'admin', 'super_admin'),
        updated_at = NOW()
      WHERE user_id = NEW.id;

      INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, metadata)
      VALUES (
        NEW.id,
        'role_sync_from_metadata',
        'user',
        NEW.id,
        jsonb_build_object(
          'old_role', old_role,
          'new_role', new_role,
          'source', 'auth_metadata'
        )
      );
    END IF;
  ELSE
    INSERT INTO public.profiles (
      user_id,
      first_name,
      last_name,
      role,
      is_host,
      is_verified,
      avatar_url
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
      new_role,
      new_role IN ('host', 'admin', 'super_admin'),
      NEW.email_confirmed_at IS NOT NULL,
      COALESCE(
        NEW.raw_user_meta_data ->> 'avatar_url',
        NEW.raw_user_meta_data ->> 'picture',
        NEW.raw_user_meta_data ->> 'avatar'
      )
    );
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;
