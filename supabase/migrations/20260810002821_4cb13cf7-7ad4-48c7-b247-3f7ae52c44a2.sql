-- Add prevent_oversell setting to app_settings
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS prevent_oversell BOOLEAN DEFAULT FALSE;

-- Update existing row
UPDATE public.app_settings SET prevent_oversell = FALSE WHERE id = true AND prevent_oversell IS NULL;
