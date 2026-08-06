-- =====================================================================
-- Approval requests schema alignment with frontend
-- =====================================================================

alter table public.approval_requests
  add column if not exists entity_table text,
  add column if not exists entity_id uuid,
  add column if not exists payload jsonb,
  add column if not exists branch_id uuid references public.branches(id) on delete set null,
  add column if not exists requested_by uuid references auth.users(id),
  add column if not exists requested_at timestamptz;

-- Backfill from existing columns
update public.approval_requests
set
  entity_table = reference_table,
  entity_id = reference_id,
  requested_by = requester_id,
  requested_at = created_at
where requested_by is null;

-- Expand approval_action enum to include frontend actions
-- (PostgreSQL enums can't be altered easily; use text check instead)
-- Drop the enum constraint and use text
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='approval_requests' and column_name='action'
      and data_type='USER-DEFINED'
  ) then
    alter table public.approval_requests alter column action type text;
  end if;
end $$;
