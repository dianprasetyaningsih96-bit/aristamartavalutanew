-- =====================================================================
-- Approval Workflow untuk KUPVA BB
-- Jalankan di Supabase SQL Editor: project vbmdlqwplfomtzrhafrc
-- =====================================================================

do $$ begin
  create type public.approval_status as enum ('pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_action as enum (
    'void_transaction',
    'high_value_transaction',
    'kyc_override',
    'rate_override',
    'customer_unblacklist',
    'cash_adjustment',
    'other'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text unique not null,
  action public.approval_action not null,
  title text not null,
  reason text not null,
  entity_table text,
  entity_id uuid,
  payload jsonb,
  status public.approval_status not null default 'pending',
  branch_id uuid references public.branches(id) on delete set null,
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists approvals_status_idx on public.approval_requests (status);
create index if not exists approvals_action_idx on public.approval_requests (action);
create index if not exists approvals_requested_at_idx on public.approval_requests (requested_at desc);
create index if not exists approvals_entity_idx on public.approval_requests (entity_table, entity_id);

grant select, insert, update, delete on public.approval_requests to authenticated;
grant all on public.approval_requests to service_role;
alter table public.approval_requests enable row level security;

drop policy if exists "Auth read approvals" on public.approval_requests;
create policy "Auth read approvals" on public.approval_requests
  for select to authenticated using (true);

drop policy if exists "Auth insert approvals" on public.approval_requests;
create policy "Auth insert approvals" on public.approval_requests
  for insert to authenticated with check (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'teller') or
    public.has_role(auth.uid(),'owner')
  );

drop policy if exists "Manager+ update approvals" on public.approval_requests;
create policy "Manager+ update approvals" on public.approval_requests
  for update to authenticated using (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'owner') or
    (requested_by = auth.uid() and status = 'pending')
  );

drop policy if exists "Admin delete approvals" on public.approval_requests;
create policy "Admin delete approvals" on public.approval_requests
  for delete to authenticated using (
    public.has_role(auth.uid(),'super_admin') or public.has_role(auth.uid(),'owner')
  );

drop trigger if exists approvals_set_updated_at on public.approval_requests;
create trigger approvals_set_updated_at
  before update on public.approval_requests for each row execute function public.set_updated_at();

-- Nomor request otomatis: APR-YYYYMMDD-XXXX
create or replace function public.generate_approval_no()
returns trigger language plpgsql as $$
declare
  next_seq int;
  prefix text := 'APR-' || to_char(now(),'YYYYMMDD') || '-';
begin
  if new.request_no is null or new.request_no = '' then
    select coalesce(max(substring(request_no from '\d+$')::int),0) + 1
      into next_seq
      from public.approval_requests
      where request_no like prefix || '%';
    new.request_no := prefix || lpad(next_seq::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists approvals_gen_no on public.approval_requests;
create trigger approvals_gen_no
  before insert on public.approval_requests for each row execute function public.generate_approval_no();
