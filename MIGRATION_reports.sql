-- =====================================================================
-- Laporan & LTKM (PPATK) untuk KUPVA BB
-- Jalankan di Supabase SQL Editor: project vbmdlqwplfomtzrhafrc
-- =====================================================================

-- Tambah flag & metadata LTKM di transactions
alter table public.transactions
  add column if not exists is_suspicious boolean not null default false,
  add column if not exists suspicious_reason text,
  add column if not exists flagged_by uuid references auth.users(id),
  add column if not exists flagged_at timestamptz,
  add column if not exists ltkm_reported_at timestamptz,
  add column if not exists ltkm_report_no text;

create index if not exists trx_suspicious_idx on public.transactions (is_suspicious) where is_suspicious = true;

-- Ambang batas LTKT (Transaksi Keuangan Tunai) — default Rp 500.000.000
-- View siap pakai untuk laporan
create or replace view public.v_ltkt_candidates as
  select t.*
  from public.transactions t
  where t.status = 'completed'
    and t.payment_method = 'cash'
    and t.idr_amount >= 500000000;

grant select on public.v_ltkt_candidates to authenticated;

create or replace view public.v_ltkm_candidates as
  select t.*
  from public.transactions t
  where t.is_suspicious = true;

grant select on public.v_ltkm_candidates to authenticated;
