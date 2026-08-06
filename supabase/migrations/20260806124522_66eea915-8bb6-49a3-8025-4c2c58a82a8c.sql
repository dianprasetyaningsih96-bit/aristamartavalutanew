-- =====================================================================
-- Customers + KYC/CDD for KUPVA BB
-- =====================================================================

-- Enums
do $$ begin
  create type public.customer_type as enum ('individual','corporate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.id_document_type as enum ('ktp','passport','kitas','sim','npwp','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.risk_rating as enum ('low','medium','high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.kyc_status as enum ('pending','verified','rejected','expired');
exception when duplicate_object then null; end $$;

-- Customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique not null,
  customer_type public.customer_type not null default 'individual',
  full_name text not null,
  id_type public.id_document_type not null default 'ktp',
  id_number text not null,
  id_expiry_date date,
  date_of_birth date,
  place_of_birth text,
  nationality text default 'ID',
  gender text,
  address text,
  city text,
  province text,
  postal_code text,
  phone text,
  email text,
  occupation text,
  employer text,
  source_of_funds text,
  purpose_of_transaction text,
  monthly_income_range text,
  company_name text,
  npwp_number text,
  business_type text,
  is_pep boolean not null default false,
  pep_notes text,
  risk_rating public.risk_rating not null default 'low',
  kyc_status public.kyc_status not null default 'pending',
  kyc_verified_at timestamptz,
  kyc_verified_by uuid references auth.users(id),
  kyc_notes text,
  is_blacklisted boolean not null default false,
  blacklist_reason text,
  branch_id uuid references public.branches(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id_type, id_number)
);
create index if not exists customers_full_name_idx on public.customers using gin (to_tsvector('simple', full_name));
create index if not exists customers_id_number_idx on public.customers (id_number);
create index if not exists customers_branch_idx on public.customers (branch_id);
create index if not exists customers_risk_idx on public.customers (risk_rating);
create index if not exists customers_kyc_status_idx on public.customers (kyc_status);

grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;

alter table public.customers enable row level security;

drop policy if exists "Auth can read customers" on public.customers;
create policy "Auth can read customers" on public.customers
  for select to authenticated using (true);

drop policy if exists "Teller+ can insert customers" on public.customers;
create policy "Teller+ can insert customers" on public.customers
  for insert to authenticated with check (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'teller') or
    public.has_role(auth.uid(),'owner')
  );

drop policy if exists "Manager+ can update customers" on public.customers;
create policy "Manager+ can update customers" on public.customers
  for update to authenticated using (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'teller') or
    public.has_role(auth.uid(),'owner')
  );

drop policy if exists "Admin can delete customers" on public.customers;
create policy "Admin can delete customers" on public.customers
  for delete to authenticated using (
    public.has_role(auth.uid(),'super_admin') or public.has_role(auth.uid(),'owner')
  );

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers for each row execute function public.set_updated_at();

-- Customer documents (metadata; files stored in Supabase Storage bucket 'kyc-docs')
create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  doc_type text not null,
  file_path text not null,
  file_name text,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  notes text
);
create index if not exists customer_documents_customer_idx on public.customer_documents (customer_id);

grant select, insert, update, delete on public.customer_documents to authenticated;
grant all on public.customer_documents to service_role;
alter table public.customer_documents enable row level security;

drop policy if exists "Auth read customer docs" on public.customer_documents;
create policy "Auth read customer docs" on public.customer_documents
  for select to authenticated using (true);
drop policy if exists "Auth manage customer docs" on public.customer_documents;
create policy "Auth manage customer docs" on public.customer_documents
  for all to authenticated
  using (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'teller') or
    public.has_role(auth.uid(),'owner')
  )
  with check (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'teller') or
    public.has_role(auth.uid(),'owner')
  );

-- Auto customer_code generator: CUS-YYYYMM-XXXX
create or replace function public.generate_customer_code()
returns trigger language plpgsql as $$
declare
  next_seq int;
  prefix text := 'CUS-' || to_char(now(),'YYYYMM') || '-';
begin
  if new.customer_code is null or new.customer_code = '' then
    select coalesce(max(substring(customer_code from '\d+$')::int),0) + 1
      into next_seq
      from public.customers
      where customer_code like prefix || '%';
    new.customer_code := prefix || lpad(next_seq::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists customers_generate_code on public.customers;
create trigger customers_generate_code
  before insert on public.customers for each row execute function public.generate_customer_code();
