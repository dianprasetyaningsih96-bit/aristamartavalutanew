-- Function to allow Super Admin/Owner to change any user's password
CREATE OR REPLACE FUNCTION public.admin_change_password(_user_id UUID, _new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Use auth.admin to update password (this bypasses user confirm)
  -- Note: In Supabase, this is often handled via the service role client on the server side, 
  -- but since we don't have direct access to service role key, we rely on the security definer
  -- and auth schema permissions.
  
  -- Update the password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = _user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_change_password(UUID, TEXT) TO authenticated;
