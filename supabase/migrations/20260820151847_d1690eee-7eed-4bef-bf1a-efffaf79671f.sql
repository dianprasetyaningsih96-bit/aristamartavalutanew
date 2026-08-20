-- Transaction Threshold Settings and Accumulation
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS transaction_threshold_usd NUMERIC DEFAULT 10000;

-- Function to check monthly transaction threshold for a customer
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

  -- 2. Get current USD Mid Rate to convert IDR total to USD
  -- We use the latest mid rate for USD
  SELECT rate INTO v_usd_rate
  FROM public.mid_rates mr
  JOIN public.currencies c ON c.id = mr.currency_id
  WHERE c.code = 'USD'
  ORDER BY mr.effective_date DESC
  LIMIT 1;

  -- Default to 16000 if no rate found (fallback)
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
