-- =====================================================================
-- Storage bucket 'kyc-docs' + RLS policies (private bucket)
-- Run in Supabase SQL Editor: project vbmdlqwplfomtzrhafrc
-- https://supabase.com/dashboard/project/vbmdlqwplfomtzrhafrc/sql/new
-- =====================================================================

-- 1) Create private bucket (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-docs',
  'kyc-docs',
  false,
  10485760, -- 10 MB
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) RLS policies on storage.objects for this bucket
-- Read: any authenticated user (teller and above can view KYC docs)
drop policy if exists "kyc_docs_read_auth" on storage.objects;
create policy "kyc_docs_read_auth"
on storage.objects for select to authenticated
using (bucket_id = 'kyc-docs');

-- Insert: teller / branch_manager / super_admin / owner
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

-- Update: manager and above
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

-- Delete: manager and above
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