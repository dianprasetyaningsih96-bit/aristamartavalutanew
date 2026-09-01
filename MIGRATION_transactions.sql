-- =====================================================================
-- Transaksi Beli/Jual Valas untuk KUPVA BB
-- Jalankan di Supabase SQL Editor: project vbmdlqwplfomtzrhafrc
-- https://supabase.com/dashboard/project/vbmdlqwplfomtzrhafrc/sql/new
-- =====================================================================

do $$ begin
  create type public.transaction_type as enum ('buy','sell');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_status as enum ('draft','completed','voided');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash','transfer','other');
exception when duplicate_object then null; end $$;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_no text unique not null,
  transaction_type public.transaction_type not null,
  transaction_date timestamptz not null default now(),
  customer_id uuid references public.customers(id) on delete restrict,
  currency_id uuid not null references public.currencies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  rate numeric(18,4) not null check (rate > 0),
  foreign_amount numeric(18,2) not null check (foreign_amount > 0),
  idr_amount numeric(18,2) not null check (idr_amount > 0),
  payment_method public.payment_method not null default 'cash',
  status public.transaction_status not null default 'completed',
  notes text,
  teller_id uuid references auth.users(id),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trx_date_idx on public.transactions (transaction_date desc);
create index if not exists trx_type_idx on public.transactions (transaction_type);
create index if not exists trx_customer_idx on public.transactions (customer_id);
create index if not exists trx_currency_idx on public.transactions (currency_id);
create index if not exists trx_branch_idx on public.transactions (branch_id);
create index if not exists trx_status_idx on public.transactions (status);

grant select, insert, update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;

drop policy if exists "Auth read transactions" on public.transactions;
create policy "Auth read transactions" on public.transactions
  for select to authenticated using (true);

drop policy if exists "Teller+ insert transactions" on public.transactions;
create policy "Teller+ insert transactions" on public.transactions
  for insert to authenticated with check (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'teller') or
    public.has_role(auth.uid(),'owner')
  );

drop policy if exists "Manager+ update transactions" on public.transactions;
create policy "Manager+ update transactions" on public.transactions
  for update to authenticated using (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'owner')
  );

drop policy if exists "Admin delete transactions" on public.transactions;
create policy "Admin delete transactions" on public.transactions
  for delete to authenticated using (
    public.has_role(auth.uid(),'super_admin') or public.has_role(auth.uid(),'owner')
  );

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions for each row execute function public.set_updated_at();

-- Nomor transaksi otomatis sesuai Cabang & Jenis Transaksi:
-- Kantor Pusat:  Beli = AMVJ1-YYYYMMDD-001 | Jual = AMVJ2-YYYYMMDD-001
-- Cabang Canggu: Beli = AMVC1-YYYYMMDD-001 | Jual = AMVC2-YYYYMMDD-001
-- Cabang Legian: Beli = AMVL1-YYYYMMDD-001 | Jual = AMVL2-YYYYMMDD-001
create or replace function public.generate_transaction_no()
returns trigger language plpgsql as $$
declare
  v_branch_name text := '';
  v_branch_code text := '';
  v_branch_letter text := 'J';
  v_type_num text := '1';
  v_date_str text;
  v_prefix text;
  next_seq int;
begin
  if new.transaction_no is null or new.transaction_no = '' or new.transaction_no like 'TRX-%' then
    if new.transaction_type = 'sell' then
      v_type_num := '2';
    else
      v_type_num := '1';
    end if;

    if new.branch_id is not null then
      select name, code into v_branch_name, v_branch_code
      from public.branches
      where id = new.branch_id;

      if v_branch_name ilike '%canggu%' or v_branch_code ilike '%canggu%' then
        v_branch_letter := 'C';
      elsif v_branch_name ilike '%legian%' or v_branch_code ilike '%legian%' then
        v_branch_letter := 'L';
      elsif v_branch_name ilike '%pusat%' or v_branch_name ilike '%jimbaran%' or v_branch_code ilike '%HQ%' then
        v_branch_letter := 'J';
      else
        v_branch_letter := coalesce(nullif(upper(substring(v_branch_name from 1 for 1)), ''), 'J');
      end if;
    else
      v_branch_letter := 'J';
    end if;

    v_date_str := to_char(coalesce(new.transaction_date, timezone('Asia/Makassar', now())), 'YYYYMMDD');
    v_prefix := 'AMV' || v_branch_letter || v_type_num || '-' || v_date_str || '-';

    select coalesce(max(substring(transaction_no from '\d+$')::int), 0) + 1
      into next_seq
      from public.transactions
      where transaction_no like v_prefix || '%';

    new.transaction_no := v_prefix || lpad(next_seq::text, 3, '0');
  end if;
  return new;
end $$;

drop trigger if exists transactions_gen_no on public.transactions;
create trigger transactions_gen_no
  before insert on public.transactions for each row execute function public.generate_transaction_no();