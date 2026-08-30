-- ==============================================================================
-- Migration: Enable Public Read Access for Digital Rate Board (Papan Kurs)
-- Run this script in Supabase Dashboard -> SQL Editor (Project: vbmdlqwplfomtzrhafrc)
-- ==============================================================================

-- 1. Grant SELECT permissions to public (anon) and authenticated roles
GRANT SELECT ON public.currencies TO anon, authenticated;
GRANT SELECT ON public.exchange_rates TO anon, authenticated;
GRANT SELECT ON public.branches TO anon, authenticated;
GRANT SELECT ON public.app_settings TO anon, authenticated;

-- 2. CURRENCIES: Allow anyone (including anonymous visitors) to view active currencies
DROP POLICY IF EXISTS "currencies_select_authenticated" ON public.currencies;
DROP POLICY IF EXISTS "currencies_select_public" ON public.currencies;
DROP POLICY IF EXISTS "Public can view active currencies" ON public.currencies;
CREATE POLICY "currencies_select_public"
  ON public.currencies FOR SELECT
  USING (true);

-- 3. EXCHANGE RATES: Allow anyone (including anonymous visitors) to view active exchange rates
DROP POLICY IF EXISTS "rates_select_authenticated" ON public.exchange_rates;
DROP POLICY IF EXISTS "rates_select_public" ON public.exchange_rates;
DROP POLICY IF EXISTS "Public can view active exchange rates" ON public.exchange_rates;
CREATE POLICY "rates_select_public"
  ON public.exchange_rates FOR SELECT
  USING (true);

-- 4. BRANCHES: Allow anyone (including anonymous visitors) to view branch list
DROP POLICY IF EXISTS "branches_select_authenticated" ON public.branches;
DROP POLICY IF EXISTS "branches_select_public" ON public.branches;
DROP POLICY IF EXISTS "Public can view active branches" ON public.branches;
CREATE POLICY "branches_select_public"
  ON public.branches FOR SELECT
  USING (true);

-- 5. APP SETTINGS: Allow anyone (including anonymous visitors) to view company identity & logo
DROP POLICY IF EXISTS "Everyone reads app settings" ON public.app_settings;
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.app_settings;
DROP POLICY IF EXISTS "settings_select_public" ON public.app_settings;
CREATE POLICY "settings_select_public"
  ON public.app_settings FOR SELECT
  USING (true);
