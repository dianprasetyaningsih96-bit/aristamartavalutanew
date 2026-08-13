-- Fix admin_change_password by explicitly referencing the extensions schema for pgcrypto functions
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_change_password(_user_id UUID, _new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Check if caller is super_admin or owner
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admin or Owner can change passwords';
  END IF;

  -- Update the password in auth.users
  -- Explicitly use extensions.crypt and extensions.gen_salt
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = _user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_change_password(UUID, TEXT) TO authenticated;
