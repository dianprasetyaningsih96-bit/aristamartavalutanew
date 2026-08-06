-- =====================================================================
-- DTTOT Compliance List
-- =====================================================================

create table if not exists public.dttot_list (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alias text,
  birth_place text,
  birth_date text,
  nationality text,
  address text,
  description text,
  source text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dttot_name_idx on public.dttot_list using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(alias,'')));

grant select, insert, update, delete on public.dttot_list to authenticated;
grant all on public.dttot_list to service_role;
alter table public.dttot_list enable row level security;

drop policy if exists "Auth read dttot" on public.dttot_list;
create policy "Auth read dttot" on public.dttot_list
  for select to authenticated using (true);
drop policy if exists "Manager+ manage dttot" on public.dttot_list;
create policy "Manager+ manage dttot" on public.dttot_list
  for all to authenticated
  using (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'owner')
  )
  with check (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'owner')
  );

drop trigger if exists dttot_set_updated_at on public.dttot_list;
create trigger dttot_set_updated_at
  before update on public.dttot_list for each row execute function public.set_updated_at();
