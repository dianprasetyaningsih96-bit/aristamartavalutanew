-- =====================================================================
-- Kas & Inventaris (Cash Vault) for KUPVA BB
-- Run in Supabase SQL Editor: project vbmdlqwplfomtzrhafrc
-- =====================================================================

-- Pastikan IDR ada di master currencies (base currency)
insert into public.currencies (code, name, symbol, decimals, country)
values ('IDR', 'Rupiah Indonesia', 'Rp', 0, 'Indonesia')
on conflict (code) do nothing;

do $$ begin
  create type public.cash_movement_type as enum (
    'opening','deposit','withdrawal','adjustment',
    'buy','sell','transfer_in','transfer_out'
  );
exception when duplicate_object then null; end $$;

-- Saldo kas per cabang per mata uang
create table if not exists public.cash_balances (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  currency_id uuid not null references public.currencies(id) on delete restrict,
  balance numeric(20,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (branch_id, currency_id)
);
create index if not exists cash_balances_branch_idx on public.cash_balances (branch_id);

grant select, insert, update, delete on public.cash_balances to authenticated;
grant all on public.cash_balances to service_role;
alter table public.cash_balances enable row level security;

drop policy if exists "Auth read cash balances" on public.cash_balances;
create policy "Auth read cash balances" on public.cash_balances
  for select to authenticated using (true);

drop policy if exists "Manager+ write cash balances" on public.cash_balances;
create policy "Manager+ write cash balances" on public.cash_balances
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

drop trigger if exists cash_balances_set_updated_at on public.cash_balances;
create trigger cash_balances_set_updated_at
  before update on public.cash_balances for each row execute function public.set_updated_at();

-- Riwayat pergerakan kas
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  currency_id uuid not null references public.currencies(id) on delete restrict,
  movement_type public.cash_movement_type not null,
  amount numeric(20,2) not null,  -- positif = kas masuk, negatif = kas keluar
  balance_after numeric(20,2),
  reference_id uuid,               -- opsional: id transaksi terkait
  reference_no text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists cash_movements_branch_idx on public.cash_movements (branch_id, created_at desc);
create index if not exists cash_movements_currency_idx on public.cash_movements (currency_id);
create index if not exists cash_movements_type_idx on public.cash_movements (movement_type);

grant select, insert on public.cash_movements to authenticated;
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

-- Trigger: setiap kali cash_movements di-insert, update cash_balances dan simpan balance_after
create or replace function public.apply_cash_movement()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  new_balance numeric(20,2);
begin
  insert into public.cash_balances (branch_id, currency_id, balance)
    values (new.branch_id, new.currency_id, new.amount)
  on conflict (branch_id, currency_id)
    do update set balance = public.cash_balances.balance + excluded.balance,
                  updated_at = now()
  returning balance into new_balance;

  new.balance_after := new_balance;
  return new;
end $$;

drop trigger if exists cash_movements_apply on public.cash_movements;
create trigger cash_movements_apply
  before insert on public.cash_movements
  for each row execute function public.apply_cash_movement();
