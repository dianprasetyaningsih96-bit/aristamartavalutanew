-- =====================================================================
-- Migration: Drop shifts_apply_opening_capital trigger to prevent double cash balance
-- =====================================================================
DROP TRIGGER IF EXISTS shifts_apply_opening_capital ON public.shifts;
DROP FUNCTION IF EXISTS public.apply_shift_opening_capital();
