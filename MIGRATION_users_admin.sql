-- =====================================================================
-- Manajemen User & Role - Policies tambahan
-- Jalankan di Supabase SQL Editor: project vbmdlqwplfomtzrhafrc
-- =====================================================================

-- Super admin / owner boleh melihat semua profile
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles
  for select to authenticated using (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'owner')
  );

-- Super admin / owner boleh update profile lain (aktifkan/nonaktifkan, dst.)
drop policy if exists "Admins update any profile" on public.profiles;
create policy "Admins update any profile" on public.profiles
  for update to authenticated using (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'owner')
  ) with check (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'owner')
  );

-- Owner juga boleh mengelola role (super_admin sudah punya policy sebelumnya)
drop policy if exists "Owner manage roles" on public.user_roles;
create policy "Owner manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(),'owner'))
  with check (public.has_role(auth.uid(),'owner'));

drop policy if exists "Owner read all roles" on public.user_roles;
create policy "Owner read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(),'owner'));
