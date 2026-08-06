-- =====================================================================
-- Approval workflow untuk transaksi/override
-- =====================================================================

do $$ begin
  create type public.approval_action as enum ('void_transaction','rate_override','threshold_override','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_status as enum ('pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text unique not null,
  action public.approval_action not null,
  title text not null,
  reason text not null,
  status public.approval_status not null default 'pending',
  requester_id uuid not null references auth.users(id),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  reference_table text,
  reference_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists approval_status_idx on public.approval_requests (status);
create index if not exists approval_requester_idx on public.approval_requests (requester_id);
create index if not exists approval_reviewer_idx on public.approval_requests (reviewer_id);

grant select, insert, update, delete on public.approval_requests to authenticated;
grant all on public.approval_requests to service_role;
alter table public.approval_requests enable row level security;

drop policy if exists "Auth read approvals" on public.approval_requests;
create policy "Auth read approvals" on public.approval_requests
  for select to authenticated using (true);

drop policy if exists "Teller+ create approvals" on public.approval_requests;
create policy "Teller+ create approvals" on public.approval_requests
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
    public.has_role(auth.uid(),'owner')
  );

drop trigger if exists approvals_set_updated_at on public.approval_requests;
create trigger approvals_set_updated_at
  before update on public.approval_requests for each row execute function public.set_updated_at();

-- Nomor approval otomatis: APP-YYYYMMDD-XXXX
create or replace function public.generate_approval_no()
returns trigger language plpgsql as $$
declare
  next_seq int;
  prefix text := 'APP-' || to_char(now(),'YYYYMMDD') || '-';
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
