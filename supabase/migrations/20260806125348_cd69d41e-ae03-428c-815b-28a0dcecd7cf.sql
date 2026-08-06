-- =====================================================================
-- DTTOT schema alignment with frontend (idempotent fixes)
-- =====================================================================

-- Add missing columns if not exist
alter table public.dttot_list
  add column if not exists reference_code text,
  add column if not exists entity_type text default 'individual',
  add column if not exists identity_number text,
  add column if not exists date_of_birth text,
  add column if not exists listed_at timestamptz;

-- Rename columns to match frontend (idempotent using DO blocks)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='dttot_list' and column_name='name') then
    alter table public.dttot_list rename column name to full_name;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='dttot_list' and column_name='alias') then
    alter table public.dttot_list rename column alias to aliases;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='dttot_list' and column_name='description') then
    alter table public.dttot_list rename column description to notes;
  end if;
end $$;

-- Ensure entity_type has valid values
update public.dttot_list set entity_type = 'individual' where entity_type is null or entity_type = '';
