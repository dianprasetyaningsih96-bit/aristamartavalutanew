-- =====================================================================
-- DTTOT + mid_rates schema alignment with frontend
-- =====================================================================

alter table public.dttot_list
  add column if not exists place_of_birth text;

alter table public.mid_rates
  add column if not exists note text;
