-- =====================================================================
-- Auto-post cash movements dari transaksi beli/jual valas
-- Jalankan di Supabase SQL Editor: project vbmdlqwplfomtzrhafrc
-- =====================================================================

create or replace function public.post_transaction_cash_movements()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  idr_id uuid;
  v_foreign numeric(20,2);
  v_idr numeric(20,2);
begin
  -- Hanya proses jika ada cabang dan status completed
  if new.branch_id is null then return new; end if;
  if new.status <> 'completed' then return new; end if;

  select id into idr_id from public.currencies where code = 'IDR' limit 1;
  if idr_id is null then return new; end if;

  if new.transaction_type = 'buy' then
    -- Money changer BELI valas dari nasabah: valas masuk (+), IDR keluar (-)
    v_foreign := new.foreign_amount;
    v_idr := -new.idr_amount;
  else
    -- JUAL valas ke nasabah: valas keluar (-), IDR masuk (+)
    v_foreign := -new.foreign_amount;
    v_idr := new.idr_amount;
  end if;

  insert into public.cash_movements (branch_id, currency_id, movement_type, amount, reference_id, reference_no, notes, created_by)
  values (new.branch_id, new.currency_id, new.transaction_type::public.cash_movement_type, v_foreign, new.id, new.transaction_no, 'Auto dari transaksi', new.teller_id);

  insert into public.cash_movements (branch_id, currency_id, movement_type, amount, reference_id, reference_no, notes, created_by)
  values (new.branch_id, idr_id, new.transaction_type::public.cash_movement_type, v_idr, new.id, new.transaction_no, 'Auto dari transaksi (IDR)', new.teller_id);

  return new;
end $$;

drop trigger if exists transactions_post_cash on public.transactions;
create trigger transactions_post_cash
  after insert on public.transactions
  for each row execute function public.post_transaction_cash_movements();

-- Trigger void: saat status berubah completed -> voided, balikkan mutasi
create or replace function public.reverse_transaction_cash_movements()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  idr_id uuid;
  v_foreign numeric(20,2);
  v_idr numeric(20,2);
begin
  if new.branch_id is null then return new; end if;
  if old.status = 'completed' and new.status = 'voided' then
    select id into idr_id from public.currencies where code = 'IDR' limit 1;
    if idr_id is null then return new; end if;

    if new.transaction_type = 'buy' then
      v_foreign := -new.foreign_amount;
      v_idr := new.idr_amount;
    else
      v_foreign := new.foreign_amount;
      v_idr := -new.idr_amount;
    end if;

    insert into public.cash_movements (branch_id, currency_id, movement_type, amount, reference_id, reference_no, notes, created_by)
    values (new.branch_id, new.currency_id, 'adjustment', v_foreign, new.id, new.transaction_no, 'Void transaksi', new.voided_by);

    insert into public.cash_movements (branch_id, currency_id, movement_type, amount, reference_id, reference_no, notes, created_by)
    values (new.branch_id, idr_id, 'adjustment', v_idr, new.id, new.transaction_no, 'Void transaksi (IDR)', new.voided_by);
  end if;
  return new;
end $$;

drop trigger if exists transactions_reverse_cash on public.transactions;
create trigger transactions_reverse_cash
  after update on public.transactions
  for each row execute function public.reverse_transaction_cash_movements();

-- =====================================================================
-- BACKFILL: buat cash_movements untuk transaksi lama yang belum tercatat
-- =====================================================================
do $$
declare
  idr_id uuid;
  t record;
  v_foreign numeric(20,2);
  v_idr numeric(20,2);
begin
  select id into idr_id from public.currencies where code = 'IDR' limit 1;
  if idr_id is null then return; end if;

  for t in
    select tr.* from public.transactions tr
    where tr.status = 'completed'
      and tr.branch_id is not null
      and not exists (
        select 1 from public.cash_movements cm
        where cm.reference_id = tr.id
      )
  loop
    if t.transaction_type = 'buy' then
      v_foreign := t.foreign_amount; v_idr := -t.idr_amount;
    else
      v_foreign := -t.foreign_amount; v_idr := t.idr_amount;
    end if;

    insert into public.cash_movements (branch_id, currency_id, movement_type, amount, reference_id, reference_no, notes, created_by, created_at)
    values (t.branch_id, t.currency_id, t.transaction_type::public.cash_movement_type, v_foreign, t.id, t.transaction_no, 'Backfill dari transaksi', t.teller_id, t.transaction_date);

    insert into public.cash_movements (branch_id, currency_id, movement_type, amount, reference_id, reference_no, notes, created_by, created_at)
    values (t.branch_id, idr_id, t.transaction_type::public.cash_movement_type, v_idr, t.id, t.transaction_no, 'Backfill dari transaksi (IDR)', t.teller_id, t.transaction_date);
  end loop;
end $$;
