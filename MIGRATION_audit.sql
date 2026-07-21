-- =====================================================================
-- Audit Trail untuk KUPVA BB
-- Jalankan di Supabase SQL Editor: project vbmdlqwplfomtzrhafrc
-- =====================================================================

do $$ begin
  create type public.audit_action as enum ('insert','update','delete');
exception when duplicate_object then null; end $$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action public.audit_action not null,
  actor_id uuid references auth.users(id),
  actor_email text,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists audit_table_idx on public.audit_logs (table_name);
create index if not exists audit_record_idx on public.audit_logs (record_id);
create index if not exists audit_actor_idx on public.audit_logs (actor_id);
create index if not exists audit_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_action_idx on public.audit_logs (action);

grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

-- Hanya Super Admin, Auditor, Owner yang boleh membaca log.
drop policy if exists "Audit read privileged" on public.audit_logs;
create policy "Audit read privileged" on public.audit_logs
  for select to authenticated using (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'auditor') or
    public.has_role(auth.uid(),'owner')
  );

-- Insert diperbolehkan agar trigger security definer / manual log tetap jalan;
-- log immutable: no update / delete.
drop policy if exists "Audit insert any auth" on public.audit_logs;
create policy "Audit insert any auth" on public.audit_logs
  for insert to authenticated with check (true);

-- Trigger generik pencatat audit
create or replace function public.log_audit_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_old jsonb;
  v_new jsonb;
  v_id uuid;
  v_changed text[];
  v_key text;
begin
  begin
    select email into v_email from auth.users where id = v_actor;
  exception when others then v_email := null; end;

  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_new := null;
    v_id := (v_old->>'id')::uuid;
  elsif tg_op = 'INSERT' then
    v_old := null;
    v_new := to_jsonb(new);
    v_id := (v_new->>'id')::uuid;
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_id := (v_new->>'id')::uuid;
    v_changed := array(
      select key from jsonb_each(v_new)
      where v_new->key is distinct from v_old->key
        and key not in ('updated_at')
    );
    -- Skip update jika tidak ada perubahan berarti
    if v_changed is null or array_length(v_changed,1) is null then
      return coalesce(new, old);
    end if;
  end if;

  insert into public.audit_logs(
    table_name, record_id, action, actor_id, actor_email,
    old_data, new_data, changed_fields
  ) values (
    tg_table_name, v_id, lower(tg_op)::public.audit_action,
    v_actor, v_email, v_old, v_new, v_changed
  );

  return coalesce(new, old);
end $$;

-- Pasang trigger pada tabel inti
do $$
declare
  t text;
  tables text[] := array[
    'customers','transactions','exchange_rates','currencies',
    'branches','user_roles','cash_movements','approval_requests'
  ];
begin
  foreach t in array tables loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('drop trigger if exists %I_audit on public.%I', t, t);
      execute format(
        'create trigger %I_audit after insert or update or delete on public.%I
         for each row execute function public.log_audit_event()',
         t, t
      );
    end if;
  end loop;
end $$;
