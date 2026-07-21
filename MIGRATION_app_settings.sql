-- =====================================================================
-- App settings (nama money changer, dll.) — editable oleh Super Admin/Owner
-- =====================================================================
create table if not exists public.app_settings (
  id boolean primary key default true,
  company_name text not null default 'KUPVA BB',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint app_settings_singleton check (id = true)
);

grant select on public.app_settings to authenticated;
grant all on public.app_settings to service_role;

alter table public.app_settings enable row level security;

insert into public.app_settings(id) values (true) on conflict do nothing;

drop policy if exists "Everyone reads app settings" on public.app_settings;
create policy "Everyone reads app settings" on public.app_settings
  for select to authenticated using (true);

drop policy if exists "Admins update app settings" on public.app_settings;
create policy "Admins update app settings" on public.app_settings
  for update to authenticated
  using (public.has_role(auth.uid(),'super_admin') or public.has_role(auth.uid(),'owner'))
  with check (public.has_role(auth.uid(),'super_admin') or public.has_role(auth.uid(),'owner'));

drop policy if exists "Admins insert app settings" on public.app_settings;
create policy "Admins insert app settings" on public.app_settings
  for insert to authenticated
  with check (public.has_role(auth.uid(),'super_admin') or public.has_role(auth.uid(),'owner'));