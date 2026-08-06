-- =====================================================================
-- Fix notify_low_cash trigger to use currency_id
-- =====================================================================

create or replace function public.notify_low_cash()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  branch_name text;
  currency_code text;
begin
  select name into branch_name from public.branches where id = new.branch_id;
  select code into currency_code from public.currencies where id = new.currency_id;

  if new.balance <= 0 then
    insert into public.notifications (
      category, severity, title, message, link, reference_table, reference_id
    ) values (
      'low_cash',
      'critical',
      'Kas ' || coalesce(currency_code,'-') || ' Habis di ' || coalesce(branch_name,'-'),
      'Saldo ' || coalesce(currency_code,'-') || ' di cabang ' || coalesce(branch_name,'-') || ' mencapai nol.',
      '/cash',
      'cash_balances',
      new.id
    );
  end if;

  return new;
end $$;

drop trigger if exists low_cash_notify on public.cash_balances;
create trigger low_cash_notify
  after update on public.cash_balances
  for each row when (new.balance <= 0)
  execute function public.notify_low_cash();
