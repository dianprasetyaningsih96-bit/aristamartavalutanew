CREATE OR REPLACE FUNCTION public.admin_change_password(_user_id UUID, _new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
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
  -- Note: We use the crypt function from pgcrypto (usually available in auth schema)
  UPDATE auth.users
  SET encrypted_password = crypt(_new_password, gen_salt('bf')),
      updated_at = now(),
      last_sign_in_at = NULL -- Optional: force re-login
  WHERE id = _user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_change_password(UUID, TEXT) TO authenticated;