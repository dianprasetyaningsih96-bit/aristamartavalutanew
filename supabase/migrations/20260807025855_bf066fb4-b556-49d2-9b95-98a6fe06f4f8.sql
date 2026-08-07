DO $$
DECLARE
    _user_id UUID;
    _email TEXT := 'superadmin@amv.com';
    _password_hash TEXT := crypt('Arieswayan_085', gen_salt('bf'));
BEGIN
    -- 1. Create the user in auth.users if they don't exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            _email,
            _password_hash,
            current_timestamp,
            current_timestamp,
            current_timestamp,
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Super Admin"}',
            current_timestamp,
            current_timestamp,
            '',
            '',
            '',
            ''
        )
        RETURNING id INTO _user_id;
        
        -- The trigger on_auth_user_created will automatically create the profile and 'teller' role.
        -- We want to upgrade them to super_admin.
        
        -- 2. Ensure they have the super_admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (_user_id, 'super_admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- 3. Update the profile with more details if needed
        UPDATE public.profiles 
        SET full_name = 'Super Admin', 
            is_active = true
        WHERE id = _user_id;
    ELSE
        SELECT id INTO _user_id FROM auth.users WHERE email = _email;
        
        -- Ensure role is present even if user already existed
        INSERT INTO public.user_roles (user_id, role)
        VALUES (_user_id, 'super_admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
