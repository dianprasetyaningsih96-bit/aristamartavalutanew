-- =====================================================================
-- Laporan / LTKM / LKUB metadata tables
-- =====================================================================

create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete set null,
  report_month text not null, -- YYYY-MM
  report_type text not null default 'lkub',
  status text not null default 'draft',
  generated_at timestamptz,
  generated_by uuid references auth.users(id),
  file_url text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, report_month, report_type)
);

grant select, insert, update, delete on public.monthly_reports to authenticated;
grant all on public.monthly_reports to service_role;
alter table public.monthly_reports enable row level security;

drop policy if exists "Auth read monthly reports" on public.monthly_reports;
create policy "Auth read monthly reports" on public.monthly_reports
  for select to authenticated using (true);
drop policy if exists "Manager+ manage monthly reports" on public.monthly_reports;
create policy "Manager+ manage monthly reports" on public.monthly_reports
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

drop trigger if exists monthly_reports_set_updated_at on public.monthly_reports;
create trigger monthly_reports_set_updated_at
  before update on public.monthly_reports for each row execute function public.set_updated_at();

-- View: transaksi >= Rp 500 juta untuk LTKM
-- (dibuat setelah tabel transactions tersedia)
create or replace view public.v_ltkm_threshold_transactions as
select
  t.*,
  c.full_name as customer_name,
  b.name as branch_name,
  cur.code as currency_code
from public.transactions t
join public.customers c on c.id = t.customer_id
left join public.branches b on b.id = t.branch_id
join public.currencies cur on cur.id = t.currency_id
where t.idr_amount >= 500000000
  and t.status = 'completed';

grant select on public.v_ltkm_threshold_transactions to authenticated;
grant all on public.v_ltkm_threshold_transactions to service_role;
