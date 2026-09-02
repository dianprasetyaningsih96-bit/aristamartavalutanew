-- ==============================================================================
-- Migration: Buka Izin Tambah & Edit Kurs Valuta untuk Role Teller
-- ==============================================================================

GRANT ALL ON public.exchange_rates TO authenticated;
GRANT ALL ON public.exchange_rates TO service_role;

DROP POLICY IF EXISTS "exchange_rates_insert_auth" ON public.exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_update_auth" ON public.exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_delete_auth" ON public.exchange_rates;
DROP POLICY IF EXISTS "Admins and managers can insert rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Admins and managers can update rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Admins and managers can delete rates" ON public.exchange_rates;

CREATE POLICY "exchange_rates_insert_auth"
  ON public.exchange_rates FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "exchange_rates_update_auth"
  ON public.exchange_rates FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "exchange_rates_delete_auth"
  ON public.exchange_rates FOR DELETE TO authenticated
  USING (true);
