drop policy if exists "kyc_docs_read_auth" on storage.objects;
create policy "kyc_docs_read_auth"
on storage.objects for select to authenticated
using (bucket_id = 'kyc-docs');

drop policy if exists "kyc_docs_insert_staff" on storage.objects;
create policy "kyc_docs_insert_staff"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'kyc-docs' and (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'teller') or
    public.has_role(auth.uid(),'owner')
  )
);

drop policy if exists "kyc_docs_update_manager" on storage.objects;
create policy "kyc_docs_update_manager"
on storage.objects for update to authenticated
using (
  bucket_id = 'kyc-docs' and (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'owner')
  )
);

drop policy if exists "kyc_docs_delete_manager" on storage.objects;
create policy "kyc_docs_delete_manager"
on storage.objects for delete to authenticated
using (
  bucket_id = 'kyc-docs' and (
    public.has_role(auth.uid(),'super_admin') or
    public.has_role(auth.uid(),'branch_manager') or
    public.has_role(auth.uid(),'owner')
  )
);
