-- =====================================================================
-- Kas & Inventaris (Cash Balances + Movements)
-- =====================================================================

do $$ begin
  create type public.cash_movement_type as enum ('opening','buy','sell','deposit','withdrawal','adjustment','closing');
exception when duplicate_object then null; end $$;

create table if not exists public.cash_balances (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  currency_id uuid not null references public.currencies(id) on delete restrict,
  balance numeric(18,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (branch_id, currency_id)
);
create index if not exists cash_balance_branch_idx on public.cash_balances (branch_id);
create index if not exists cash_balance_currency_idx on public.cash_balances (currency_id);

grant select, insert, update, delete on public.cash_balances to authenticated;
grant all on public.cash_balances to service_role;
alter table public.cash_balances enable row level security;

drop policy if exists "Auth read cash balances" on public.cash_balances;
create policy "Auth read cash balances" on public.cash_balances
  for select to authenticated using (true);
drop policy if exists "Teller+ manage cash balances" on public.cash_balances;
create policy "Teller+ manage cash balances" on public.cash_balances
  for all to authenticated
  using (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'teller') or
    public.has_role(auth.uid(),'owner')
  )
  with check (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'teller') or
    public.has_role(auth.uid(),'owner')
  );

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  currency_id uuid not null references public.currencies(id) on delete restrict,
  movement_type public.cash_movement_type not null,
  amount numeric(18,2) not null,
  balance_after numeric(18,2) not null,
  reference_table text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists cash_movement_branch_idx on public.cash_movements (branch_id);
create index if not exists cash_movement_currency_idx on public.cash_movements (currency_id);
create index if not exists cash_movement_created_idx on public.cash_movements (created_at desc);

grant select, insert, update, delete on public.cash_movements to authenticated;
grant all on public.cash_movements to service_role;
alter table public.cash_movements enable row level security;

drop policy if exists "Auth read cash movements" on public.cash_movements;
create policy "Auth read cash movements" on public.cash_movements
  for select to authenticated using (true);
drop policy if exists "Teller+ insert cash movements" on public.cash_movements;
create policy "Teller+ insert cash movements" on public.cash_movements
  for insert to authenticated with check (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'teller') or
    public.has_role(auth.uid(),'owner')
  );

-- Trigger: set_updated_at on cash_balances
drop trigger if exists cash_balances_set_updated_at on public.cash_balances;
create trigger cash_balances_set_updated_at
  before update on public.cash_balances for each row execute function public.set_updated_at();
