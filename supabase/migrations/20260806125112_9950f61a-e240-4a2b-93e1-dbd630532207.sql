-- =====================================================================
-- Branch lock for shift operations
-- =====================================================================

drop policy if exists "Shift branch lock" on public.shifts;
create policy "Shift branch lock" on public.shifts
  for all to authenticated
  using (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'owner') or
    (
      branch_id in (
        select branch_id from public.profiles where id = auth.uid()
      )
    )
  )
  with check (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'owner') or
    (
      branch_id in (
        select branch_id from public.profiles where id = auth.uid()
      )
    )
  );
