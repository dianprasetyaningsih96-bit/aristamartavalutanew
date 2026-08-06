-- =====================================================================
-- Admin confirm user (bypass email confirmation)
-- =====================================================================

create or replace function public.admin_confirm_user(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'Only super_admin can confirm users';
  end if;

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now()),
      confirmation_sent_at = coalesce(confirmation_sent_at, now())
  where id = _user_id;
end $$;

grant execute on function public.admin_confirm_user(uuid) to authenticated;
