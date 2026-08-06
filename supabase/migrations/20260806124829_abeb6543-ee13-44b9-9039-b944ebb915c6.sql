-- =====================================================================
-- Audit Trail
-- =====================================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  actor_id uuid references auth.users(id),
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_table_idx on public.audit_logs (table_name);
create index if not exists audit_record_idx on public.audit_logs (record_id);
create index if not exists audit_actor_idx on public.audit_logs (actor_id);
create index if not exists audit_created_idx on public.audit_logs (created_at desc);

grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

drop policy if exists "Auth read audit logs" on public.audit_logs;
create policy "Auth read audit logs" on public.audit_logs
  for select to authenticated using (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'auditor') or
    public.has_role(auth.uid(),'owner')
  );

drop policy if exists "Service insert audit logs" on public.audit_logs;
create policy "Service insert audit logs" on public.audit_logs
  for insert to authenticated with check (true);

-- Generic audit trigger function
create or replace function public.log_audit_event()
returns trigger language plpgsql as $$
declare
  actor uuid;
  old_record jsonb;
  new_record jsonb;
  action text;
begin
  actor := coalesce(current_setting('request.jwt.claim.sub', true)::uuid, auth.uid());
  if TG_OP = 'DELETE' then
    action := 'DELETE';
    old_record := to_jsonb(old);
    new_record := null;
    insert into public.audit_logs (table_name, record_id, action, actor_id, old_data, new_data)
    values (TG_TABLE_NAME, old.id, action, actor, old_record, new_record);
    return old;
  elsif TG_OP = 'UPDATE' then
    action := 'UPDATE';
    old_record := to_jsonb(old);
    new_record := to_jsonb(new);
    insert into public.audit_logs (table_name, record_id, action, actor_id, old_data, new_data)
    values (TG_TABLE_NAME, new.id, action, actor, old_record, new_record);
    return new;
  else
    action := 'INSERT';
    old_record := null;
    new_record := to_jsonb(new);
    insert into public.audit_logs (table_name, record_id, action, actor_id, old_data, new_data)
    values (TG_TABLE_NAME, new.id, action, actor, old_record, new_record);
    return new;
  end if;
end $$;

-- Apply audit triggers to key tables
-- (Only create if table exists to avoid errors)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='branches') then
    execute 'drop trigger if exists audit_branches on public.branches; create trigger audit_branches after insert or update or delete on public.branches for each row execute function public.log_audit_event();';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='currencies') then
    execute 'drop trigger if exists audit_currencies on public.currencies; create trigger audit_currencies after insert or update or delete on public.currencies for each row execute function public.log_audit_event();';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='customers') then
    execute 'drop trigger if exists audit_customers on public.customers; create trigger audit_customers after insert or update or delete on public.customers for each row execute function public.log_audit_event();';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='transactions') then
    execute 'drop trigger if exists audit_transactions on public.transactions; create trigger audit_transactions after insert or update or delete on public.transactions for each row execute function public.log_audit_event();';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='cash_movements') then
    execute 'drop trigger if exists audit_cash_movements on public.cash_movements; create trigger audit_cash_movements after insert or update or delete on public.cash_movements for each row execute function public.log_audit_event();';
  end if;
end $$;
