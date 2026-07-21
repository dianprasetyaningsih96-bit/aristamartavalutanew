-- =====================================================================
-- Shift management: open/close shift, opening capital (modal) for shift pagi,
-- and end-of-shift reconciliation per currency.
-- =====================================================================

-- Shift type enum
do $$ begin
  create type public.shift_type as enum ('pagi','siang');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.shift_status as enum ('open','closed');
exception when duplicate_object then null; end $$;

-- Extend app_settings dengan jam shif (default WITA)
alter table public.app_settings
  add column if not exists shift_pagi_start  time not null default '08:00',
  add column if not exists shift_pagi_end    time not null default '15:00',
  add column if not exists shift_siang_start time not null default '15:00',
  add column if not exists shift_siang_end   time not null default '22:00';

-- =====================================================================
-- Tabel shifts
-- =====================================================================
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  shift_type public.shift_type not null,
  status public.shift_status not null default 'open',
  opening_capital numeric(20,2) not null default 0,   -- modal IDR (khusus shif pagi biasanya)
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists shifts_branch_idx on public.shifts (branch_id, opened_at desc);
create index if not exists shifts_user_idx on public.shifts (user_id, opened_at desc);
create unique index if not exists shifts_one_open_per_user
  on public.shifts (user_id) where status = 'open';

grant select, insert, update on public.shifts to authenticated;
grant all on public.shifts to service_role;
alter table public.shifts enable row level security;

drop policy if exists "Auth read shifts" on public.shifts;
create policy "Auth read shifts" on public.shifts
  for select to authenticated using (true);

drop policy if exists "Teller open own shift" on public.shifts;
create policy "Teller open own shift" on public.shifts
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.has_role(auth.uid(),'super_admin')
    or public.has_role(auth.uid(),'branch_manager')
    or public.has_role(auth.uid(),'owner')
  );

drop policy if exists "Teller close own shift" on public.shifts;
create policy "Teller close own shift" on public.shifts
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(auth.uid(),'super_admin')
    or public.has_role(auth.uid(),'branch_manager')
    or public.has_role(auth.uid(),'owner')
  )
  with check (
    user_id = auth.uid()
    or public.has_role(auth.uid(),'super_admin')
    or public.has_role(auth.uid(),'branch_manager')
    or public.has_role(auth.uid(),'owner')
  );

-- =====================================================================
-- Rekonsiliasi saldo fisik per currency saat tutup shif
-- =====================================================================
create table if not exists public.shift_reconciliations (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  currency_id uuid not null references public.currencies(id) on delete restrict,
  system_balance numeric(20,2) not null default 0,
  physical_balance numeric(20,2) not null default 0,
  difference numeric(20,2) generated always as (physical_balance - system_balance) stored,
  notes text,
  created_at timestamptz not null default now(),
  unique (shift_id, currency_id)
);
create index if not exists shift_recon_shift_idx on public.shift_reconciliations (shift_id);

grant select, insert on public.shift_reconciliations to authenticated;
grant all on public.shift_reconciliations to service_role;
alter table public.shift_reconciliations enable row level security;

drop policy if exists "Auth read shift recon" on public.shift_reconciliations;
create policy "Auth read shift recon" on public.shift_reconciliations
  for select to authenticated using (true);

drop policy if exists "Auth insert shift recon" on public.shift_reconciliations;
create policy "Auth insert shift recon" on public.shift_reconciliations
  for insert to authenticated with check (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'teller') or
    public.has_role(auth.uid(),'owner')
  );

-- =====================================================================
-- Trigger: saat shif dibuka dengan opening_capital > 0 → catat cash_movement 'deposit' (IDR)
-- =====================================================================
create or replace function public.apply_shift_opening_capital()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  idr_id uuid;
begin
  if new.opening_capital is null or new.opening_capital <= 0 then
    return new;
  end if;
  select id into idr_id from public.currencies where code = 'IDR' limit 1;
  if idr_id is null then
    return new;
  end if;
  insert into public.cash_movements (
    branch_id, currency_id, movement_type, amount,
    reference_id, reference_no, notes, created_by
  ) values (
    new.branch_id, idr_id, 'deposit', new.opening_capital,
    new.id, 'SHIFT-' || substr(new.id::text,1,8),
    'Modal awal shif ' || new.shift_type, new.user_id
  );
  return new;
end $$;

drop trigger if exists shifts_apply_opening_capital on public.shifts;
create trigger shifts_apply_opening_capital
  after insert on public.shifts
  for each row execute function public.apply_shift_opening_capital();