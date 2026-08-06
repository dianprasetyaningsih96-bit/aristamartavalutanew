-- =====================================================================
-- Shift / Buka-Tutup Kasir
-- =====================================================================

do $$ begin
  create type public.shift_period as enum ('pagi','siang');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.shift_status as enum ('open','closed');
exception when duplicate_object then null; end $$;

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  period public.shift_period not null,
  shift_date date not null default now(),
  opened_at timestamptz not null default now(),
  opened_by uuid not null references auth.users(id),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  opening_cash_idr numeric(18,2) not null default 0,
  closing_cash_idr numeric(18,2),
  status public.shift_status not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, period, shift_date)
);
create index if not exists shifts_branch_idx on public.shifts (branch_id);
create index if not exists shifts_date_idx on public.shifts (shift_date desc);
create index if not exists shifts_status_idx on public.shifts (status);

grant select, insert, update, delete on public.shifts to authenticated;
grant all on public.shifts to service_role;
alter table public.shifts enable row level security;

drop policy if exists "Auth read shifts" on public.shifts;
create policy "Auth read shifts" on public.shifts
  for select to authenticated using (true);
drop policy if exists "Teller+ manage shifts" on public.shifts;
create policy "Teller+ manage shifts" on public.shifts
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

drop trigger if exists shifts_set_updated_at on public.shifts;
create trigger shifts_set_updated_at
  before update on public.shifts for each row execute function public.set_updated_at();

-- Shift reconciliations
create table if not exists public.shift_reconciliations (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  currency_id uuid not null references public.currencies(id) on delete restrict,
  expected_amount numeric(18,2) not null default 0,
  actual_amount numeric(18,2) not null default 0,
  difference numeric(18,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.shift_reconciliations to authenticated;
grant all on public.shift_reconciliations to service_role;
alter table public.shift_reconciliations enable row level security;

drop policy if exists "Auth read reconciliations" on public.shift_reconciliations;
create policy "Auth read reconciliations" on public.shift_reconciliations
  for select to authenticated using (true);
