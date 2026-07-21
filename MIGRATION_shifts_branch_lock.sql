-- =====================================================================
-- Kunci pembukaan shif ke cabang penugasan user.
-- Teller wajib buka shif di profiles.branch_id miliknya; super_admin /
-- branch_manager / owner tetap bebas memilih cabang.
-- =====================================================================

drop policy if exists "Teller open own shift" on public.shifts;
create policy "Teller open own shift" on public.shifts
  for insert to authenticated
  with check (
    (
      user_id = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.branch_id is not null
          and p.branch_id = shifts.branch_id
      )
    )
    or public.has_role(auth.uid(),'super_admin')
    or public.has_role(auth.uid(),'branch_manager')
    or public.has_role(auth.uid(),'owner')
  );