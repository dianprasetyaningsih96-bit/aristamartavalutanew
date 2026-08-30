-- Add logo_url to app_settings & setup company_assets storage bucket
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS logo_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company_assets',
  'company_assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "company_assets_public_read" ON storage.objects;
CREATE POLICY "company_assets_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'company_assets');

DROP POLICY IF EXISTS "company_assets_auth_insert" ON storage.objects;
CREATE POLICY "company_assets_auth_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company_assets');

DROP POLICY IF EXISTS "company_assets_auth_update" ON storage.objects;
CREATE POLICY "company_assets_auth_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company_assets')
WITH CHECK (bucket_id = 'company_assets');

DROP POLICY IF EXISTS "company_assets_auth_delete" ON storage.objects;
CREATE POLICY "company_assets_auth_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company_assets');
