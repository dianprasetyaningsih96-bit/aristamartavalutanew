-- Super admin / owner dapat menandai email user sebagai terkonfirmasi
-- tanpa mengirim email verifikasi. Dipanggil setelah signUp dari halaman
-- Manajemen User.

create or replace function public.admin_confirm_user(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not (
    public.has_role(auth.uid(), 'super_admin') or
    public.has_role(auth.uid(), 'owner')
  ) then
    raise exception 'insufficient_privilege: hanya super_admin/owner';
  end if;

  update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now()),
         confirmed_at       = coalesce(confirmed_at, now())
   where id = _user_id;
end;
$$;

revoke all on function public.admin_confirm_user(uuid) from public;
grant execute on function public.admin_confirm_user(uuid) to authenticated;
