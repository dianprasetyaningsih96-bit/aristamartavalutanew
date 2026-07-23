-- =====================================================================
-- Kurs Tengah (Mid Rate) untuk Laporan Kegiatan Usaha Bulanan (LKUB)
-- Jalankan di Supabase SQL Editor: project vbmdlqwplfomtzrhafrc
-- =====================================================================

create table if not exists public.mid_rates (
  id uuid primary key default gen_random_uuid(),
  currency_id uuid not null references public.currencies(id) on delete restrict,
  period_month date not null,  -- selalu tanggal 1 bulan berjalan
  mid_rate numeric(18,4) not null check (mid_rate > 0),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (currency_id, period_month)
);

create index if not exists mid_rates_period_idx on public.mid_rates (period_month desc);
create index if not exists mid_rates_currency_idx on public.mid_rates (currency_id);

grant select, insert, update, delete on public.mid_rates to authenticated;
grant all on public.mid_rates to service_role;

alter table public.mid_rates enable row level security;

drop policy if exists "Auth read mid rates" on public.mid_rates;
create policy "Auth read mid rates" on public.mid_rates
  for select to authenticated using (true);

drop policy if exists "Manager+ write mid rates" on public.mid_rates;
create policy "Manager+ write mid rates" on public.mid_rates
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

drop trigger if exists mid_rates_set_updated_at on public.mid_rates;
create trigger mid_rates_set_updated_at
  before update on public.mid_rates
  for each row execute function public.set_updated_at();

-- Normalisasi period_month ke tanggal 1 bulan
create or replace function public.normalize_mid_rate_period()
returns trigger language plpgsql as $$
begin
  new.period_month := date_trunc('month', new.period_month)::date;
  return new;
end $$;

drop trigger if exists mid_rates_normalize_period on public.mid_rates;
create trigger mid_rates_normalize_period
  before insert or update on public.mid_rates
  for each row execute function public.normalize_mid_rate_period();