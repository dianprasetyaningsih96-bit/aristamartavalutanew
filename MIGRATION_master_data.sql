-- =========================================================
-- Master Data: branches, currencies, exchange_rates
-- Run in Supabase SQL Editor (project vbmdlqwplfomtzrhafrc)
-- =========================================================

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
  branch_id uuid references public.branches(id) on delete cascade, -- null = default HQ
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