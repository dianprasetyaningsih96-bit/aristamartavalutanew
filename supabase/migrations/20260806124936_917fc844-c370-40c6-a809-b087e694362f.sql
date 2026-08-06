-- =====================================================================
-- Notifikasi (threshold, low cash, approval, DTTOT)
-- =====================================================================

do $$ begin
  create type public.notification_severity as enum ('info','warning','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_category as enum (
    'ltkt_threshold',
    'ltkm_suspicious',
    'dttot_attempt',
    'low_cash',
    'approval_request',
    'approval_decision',
    'system'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  target_roles public.app_role[] null,
  category public.notification_category not null,
  severity public.notification_severity not null default 'info',
  title text not null,
  message text not null,
  link text,
  reference_table text,
  reference_id uuid,
  metadata jsonb,
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists notifications_created_idx on public.notifications (created_at desc);
create index if not exists notifications_user_idx on public.notifications (user_id);

grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

drop policy if exists "Auth read notifications" on public.notifications;
create policy "Auth read notifications" on public.notifications
  for select to authenticated using (true);
drop policy if exists "System insert notifications" on public.notifications;
create policy "System insert notifications" on public.notifications
  for insert to authenticated with check (true);
drop policy if exists "Auth update read_by" on public.notifications;
create policy "Auth update read_by" on public.notifications
  for update to authenticated using (true) with check (true);

-- Helper: mark a notification as read by current user
create or replace function public.mark_notification_read(_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set read_by = array_append(read_by, auth.uid())
  where id = _id
    and not (auth.uid() = any(read_by));
end $$;

grant execute on function public.mark_notification_read(uuid) to authenticated;

-- Helper: mark all unread notifications as read by current user
create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set read_by = array_append(read_by, auth.uid())
  where not (auth.uid() = any(read_by));
end $$;

grant execute on function public.mark_all_notifications_read() to authenticated;

-- Trigger: notify on high-value transaction (>= Rp 100 juta) or DTTOT customer
-- (depends on transactions and customers tables)
create or replace function public.notify_transaction_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cust public.customers%rowtype;
  branch_name text;
  severity public.notification_severity;
  category public.notification_category;
  title text;
  msg text;
begin
  select * into cust from public.customers where id = new.customer_id;
  select name into branch_name from public.branches where id = new.branch_id;

  if cust.is_blacklisted then
    severity := 'critical';
    category := 'dttot_attempt';
    title := 'Transaksi DTTOT Terdeteksi';
    msg := 'Nasabah ' || cust.full_name || ' masuk DTTOT. Transaksi ' || new.transaction_no || ' di ' || coalesce(branch_name,'-');
  elsif new.idr_amount >= 100000000 then
    severity := 'warning';
    category := 'ltkt_threshold';
    title := 'Transaksi >= Rp 100 Juta';
    msg := 'Transaksi ' || new.transaction_no || ' senilai Rp ' || to_char(new.idr_amount,'FM999G999G999G999') || ' memerlukan perhatian.';
  else
    return new;
  end if;

  insert into public.notifications (category, severity, title, message, link, reference_table, reference_id)
  values (category, severity, title, msg, '/transactions', 'transactions', new.id);

  return new;
end $$;

drop trigger if exists trx_notify on public.transactions;
create trigger trx_notify
  after insert on public.transactions
  for each row execute function public.notify_transaction_event();

-- Trigger: low cash notification
-- (depends on cash_balances table; fixed in separate migration to use currency_id)
