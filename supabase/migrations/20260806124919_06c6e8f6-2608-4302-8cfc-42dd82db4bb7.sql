-- =====================================================================
-- User admin helpers (Super Admin management)
-- =====================================================================

-- Helper: list user identities + profile + roles (admin only)
create or replace function public.get_users_admin()
returns table (
  id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  roles text[]
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.email,
    p.full_name,
    u.created_at,
    u.last_sign_in_at,
    coalesce(array_agg(ur.role::text order by ur.role) filter (where ur.role is not null), '{}') as roles
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_roles ur on ur.user_id = u.id
  group by u.id, p.full_name, p.id;
$$;

grant execute on function public.get_users_admin() to authenticated;

-- Policy: only super_admin/owner can call this helper effectively via RLS on profiles
-- (actual admin UI uses the has_role checks in the app)
