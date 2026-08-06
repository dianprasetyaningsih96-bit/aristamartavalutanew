-- =====================================================================
-- Link transactions -> cash_movements + cash_balances
-- =====================================================================

create or replace function public.record_transaction_cash_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement_type public.cash_movement_type;
  v_amount numeric(18,2);
  v_balance numeric(18,2);
  v_balance_idr numeric(18,2);
begin
  if new.status <> 'completed' then
    return new;
  end if;

  -- For buy: we receive foreign currency (deposit to vault)
  -- For sell: we give foreign currency (withdrawal from vault)
  if new.transaction_type = 'buy' then
    v_movement_type := 'buy';
    v_amount := new.foreign_amount;
  else
    v_movement_type := 'sell';
    v_amount := -new.foreign_amount;
  end if;

  -- Update or insert cash balance
  insert into public.cash_balances (branch_id, currency_id, balance)
  values (new.branch_id, new.currency_id, v_amount)
  on conflict (branch_id, currency_id)
  do update set balance = public.cash_balances.balance + v_amount
  returning balance into v_balance;

  -- Record movement
  insert into public.cash_movements (
    branch_id, currency_id, movement_type, amount, balance_after,
    reference_table, reference_id, notes, created_by
  ) values (
    new.branch_id, new.currency_id, v_movement_type, v_amount, v_balance,
    'transactions', new.id,
    'Auto-generated from transaction ' || new.transaction_no,
    new.teller_id
  );

  return new;
end $$;

drop trigger if exists trx_cash_movement on public.transactions;
create trigger trx_cash_movement
  after insert on public.transactions
  for each row execute function public.record_transaction_cash_movement();

-- Trigger: update cash balance on manual movement insert/update
create or replace function public.update_cash_balance_from_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(18,2);
begin
  insert into public.cash_balances (branch_id, currency_id, balance)
  values (new.branch_id, new.currency_id, new.amount)
  on conflict (branch_id, currency_id)
  do update set balance = public.cash_balances.balance + new.amount
  returning balance into v_balance;

  new.balance_after := v_balance;
  return new;
end $$;

drop trigger if exists movement_update_balance on public.cash_movements;
create trigger movement_update_balance
  before insert on public.cash_movements
  for each row execute function public.update_cash_balance_from_movement();
