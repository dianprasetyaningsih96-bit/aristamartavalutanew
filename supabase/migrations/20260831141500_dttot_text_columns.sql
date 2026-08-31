-- ==============================================================================
-- Migration: Change DTTOT columns to TEXT to accommodate raw Bank Indonesia CSV
-- Run in Supabase SQL Editor (Project: vbmdlqwplfomtzrhafrc)
-- ==============================================================================

ALTER TABLE public.dttot_list ALTER COLUMN date_of_birth TYPE text USING date_of_birth::text;
ALTER TABLE public.dttot_list ALTER COLUMN listed_at TYPE text USING listed_at::text;
ALTER TABLE public.dttot_list ALTER COLUMN entity_type TYPE text USING entity_type::text;
