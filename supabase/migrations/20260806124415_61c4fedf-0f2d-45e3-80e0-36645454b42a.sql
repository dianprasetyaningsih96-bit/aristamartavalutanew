-- =====================================================================
-- Profiles + RBAC for KUPVA BB
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

-- 4. Security-definer role helpers
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
-- Master Data: branches, currencies, exchange_rates
-- =====================================================================

-- ---------- BRANCHES ----------
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  city text,
  phone text,
  license_no text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.branches to authenticated;
grant all on public.branches to service_role;

alter table public.branches enable row level security;

drop policy if exists "branches_select_authenticated" on public.branches;
create policy "branches_select_authenticated"
  on public.branches for select
  to authenticated using (true);

drop policy if exists "branches_write_admin" on public.branches;
create policy "branches_write_admin"
  on public.branches for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'owner'))
  with check (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'owner'));

-- ---------- CURRENCIES ----------
create table if not exists public.currencies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) = 3),
  name text not null,
  symbol text,
  decimals int not null default 2 check (decimals between 0 and 6),
  country text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.currencies to authenticated;
grant all on public.currencies to service_role;

alter table public.currencies enable row level security;

drop policy if exists "currencies_select_authenticated" on public.currencies;
create policy "currencies_select_authenticated"
  on public.currencies for select
  to authenticated using (true);

drop policy if exists "currencies_write_admin" on public.currencies;
create policy "currencies_write_admin"
  on public.currencies for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'owner'))
  with check (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'owner'));

-- ---------- EXCHANGE RATES ----------
create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  currency_id uuid not null references public.currencies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  buy_rate numeric(18,4) not null check (buy_rate > 0),
  sell_rate numeric(18,4) not null check (sell_rate > 0),
  effective_date date not null default current_date,
  is_active boolean not null default true,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sell_rate >= buy_rate)
);

create index if not exists exchange_rates_currency_idx on public.exchange_rates (currency_id, effective_date desc);
create index if not exists exchange_rates_branch_idx on public.exchange_rates (branch_id);

grant select, insert, update, delete on public.exchange_rates to authenticated;
grant all on public.exchange_rates to service_role;

alter table public.exchange_rates enable row level security;

drop policy if exists "rates_select_authenticated" on public.exchange_rates;
create policy "rates_select_authenticated"
  on public.exchange_rates for select
  to authenticated using (true);

drop policy if exists "rates_write_admin_manager" on public.exchange_rates;
create policy "rates_write_admin_manager"
  on public.exchange_rates for all
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.has_role(auth.uid(), 'owner')
    or public.has_role(auth.uid(), 'branch_manager')
  )
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.has_role(auth.uid(), 'owner')
    or public.has_role(auth.uid(), 'branch_manager')
  );

-- ---------- updated_at trigger ----------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists set_updated_at on public.branches;
create trigger set_updated_at before update on public.branches
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.currencies;
create trigger set_updated_at before update on public.currencies
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.exchange_rates;
create trigger set_updated_at before update on public.exchange_rates
  for each row execute function public.tg_set_updated_at();

-- ---------- Seed common currencies (idempotent) ----------
insert into public.currencies (code, name, symbol, decimals, country) values
  ('USD', 'US Dollar',        '$',  2, 'United States'),
  ('EUR', 'Euro',              '€',  2, 'European Union'),
  ('SGD', 'Singapore Dollar', 'S$',  2, 'Singapore'),
  ('JPY', 'Japanese Yen',      '¥',  0, 'Japan'),
  ('GBP', 'Pound Sterling',    '£',  2, 'United Kingdom'),
  ('AUD', 'Australian Dollar','A$',  2, 'Australia'),
  ('MYR', 'Malaysian Ringgit','RM',  2, 'Malaysia'),
  ('CNY', 'Chinese Yuan',      '¥',  2, 'China'),
  ('HKD', 'Hong Kong Dollar', 'HK$', 2, 'Hong Kong'),
  ('SAR', 'Saudi Riyal',      'ر.س', 2, 'Saudi Arabia')
on conflict (code) do nothing;

-- =====================================================================
-- App settings (nama money changer, dll.) — editable oleh Super Admin/Owner
-- =====================================================================
create table if not exists public.app_settings (
  id boolean primary key default true,
  company_name text not null default 'KUPVA BB',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint app_settings_singleton check (id = true)
);

grant select on public.app_settings to authenticated;
grant all on public.app_settings to service_role;

alter table public.app_settings enable row level security;

insert into public.app_settings(id) values (true) on conflict do nothing;

drop policy if exists "Everyone reads app settings" on public.app_settings;
create policy "Everyone reads app settings" on public.app_settings
  for select to authenticated using (true);

drop policy if exists "Admins update app settings" on public.app_settings;
create policy "Admins update app settings" on public.app_settings
  for update to authenticated
  using (public.has_role(auth.uid(),'super_admin') or public.has_role(auth.uid(),'owner'))
  with check (public.has_role(auth.uid(),'super_admin') or public.has_role(auth.uid(),'owner'));

drop policy if exists "Admins insert app settings" on public.app_settings;
create policy "Admins insert app settings" on public.app_settings
  for insert to authenticated
  with check (public.has_role(auth.uid(),'super_admin') or public.has_role(auth.uid(),'owner'));
