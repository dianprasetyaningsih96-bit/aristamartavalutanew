-- Fix check_transaction_threshold RPC
-- Column was 'mid_rate', not 'rate' in mid_rates table
CREATE OR REPLACE FUNCTION public.check_transaction_threshold(
  p_customer_id UUID,
  p_new_amount_idr NUMERIC,
  p_threshold_usd NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly_total_idr NUMERIC;
  v_usd_rate NUMERIC;
  v_total_usd NUMERIC;
BEGIN
  -- 1. Get current month's total IDR for this customer (completed transactions)
  SELECT COALESCE(SUM(idr_amount), 0)
  INTO v_monthly_total_idr
  FROM public.transactions
  WHERE customer_id = p_customer_id
    AND status = 'completed'
    AND transaction_date >= date_trunc('month', current_date)
    AND transaction_date < date_trunc('month', current_date) + interval '1 month';

  -- 2. Get current USD Mid Rate for the current month
  -- We use the latest mid_rate for USD for current month/period
  SELECT mid_rate INTO v_usd_rate
  FROM public.mid_rates mr
  JOIN public.currencies c ON c.id = mr.currency_id
  WHERE c.code = 'USD'
    AND mr.period_month = date_trunc('month', current_date)::date
  LIMIT 1;

  -- Fallback to latest available rate if not found for current month
  IF v_usd_rate IS NULL THEN
    SELECT mid_rate INTO v_usd_rate
    FROM public.mid_rates mr
    JOIN public.currencies c ON c.id = mr.currency_id
    WHERE c.code = 'USD'
    ORDER BY mr.period_month DESC
    LIMIT 1;
  END IF;

  -- Default to 16000 if no rate found (extreme fallback)
  IF v_usd_rate IS NULL OR v_usd_rate = 0 THEN
    v_usd_rate := 16000;
  END IF;

  -- 3. Calculate total USD including the new transaction
  v_total_usd := (v_monthly_total_idr + p_new_amount_idr) / v_usd_rate;

  -- 4. Return TRUE if within threshold, FALSE if exceeded
  RETURN v_total_usd <= p_threshold_usd;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_transaction_threshold(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT ALL ON FUNCTION public.check_transaction_threshold(UUID, NUMERIC, NUMERIC) TO service_role;
