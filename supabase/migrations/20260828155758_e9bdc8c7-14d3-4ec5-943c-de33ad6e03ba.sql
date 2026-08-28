ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS company_phone text,
  ADD COLUMN IF NOT EXISTS license_pva text,
  ADD COLUMN IF NOT EXISTS npwp_number text;