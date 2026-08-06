-- =====================================================================
-- Schema alignment: add columns expected by the frontend
-- =====================================================================

-- app_settings shift columns
alter table public.app_settings
  add column if not exists shift_pagi_start text default '08:00',
  add column if not exists shift_pagi_end text default '15:00',
  add column if not exists shift_siang_start text default '15:00',
  add column if not exists shift_siang_end text default '22:00';

-- transactions is_suspicious flag
alter table public.transactions
  add column if not exists is_suspicious boolean not null default false;

-- cash_movements reference_no for display/tracking
alter table public.cash_movements
  add column if not exists reference_no text;

-- Make balance_after nullable because manual inserts don't know it yet
alter table public.cash_movements
  alter column balance_after drop not null;

-- Update existing rows
update public.app_settings set
  shift_pagi_start = coalesce(shift_pagi_start, '08:00'),
  shift_pagi_end = coalesce(shift_pagi_end, '15:00'),
  shift_siang_start = coalesce(shift_siang_start, '15:00'),
  shift_siang_end = coalesce(shift_siang_end, '22:00')
where id = true;
