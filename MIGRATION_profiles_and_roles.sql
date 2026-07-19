-- =====================================================================
-- Profiles + RBAC for KUPVA BB
-- Run this in Supabase SQL Editor: project vbmdlqwplfomtzrhafrc
-- https://supabase.com/dashboard/project/vbmdlqwplfomtzrhafrc/sql/new
-- =====================================================================

-- 1. App role enum
do $$ begin
  create type public.app_role as enum (
    'super_admin','branch_manager','teller','auditor','owner'
  );
exception when duplicate_object then null; end $$;

-- 2. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  branch_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- 3. Roles (SEPARATE table — never store roles on profiles)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- 4. Security-definer role helpers (avoid RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create or replace function public.get_user_roles(_user_id uuid)
returns setof public.app_role language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id=_user_id
$$;

-- 5. RLS on user_roles
drop policy if exists "Users read own roles" on public.user_roles;
create policy "Users read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Super admins read all roles" on public.user_roles;
create policy "Super admins read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(),'super_admin'));
drop policy if exists "Super admins manage roles" on public.user_roles;
create policy "Super admins manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(),'super_admin'))
  with check (public.has_role(auth.uid(),'super_admin'));

-- 6. Auto profile + default 'teller' role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,email,full_name)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)))
  on conflict(id) do nothing;
  insert into public.user_roles(user_id,role) values(new.id,'teller')
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- 7. updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles for each row execute function public.set_updated_at();

-- =====================================================================
-- AFTER RUNNING: promote yourself to super_admin.
-- Find your user id at Auth → Users, then:
--   insert into public.user_roles(user_id,role)
--   values ('<your-user-id>','super_admin');
-- =====================================================================