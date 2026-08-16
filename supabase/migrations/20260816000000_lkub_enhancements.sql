-- Fix LKUB (Laporan Kegiatan Usaha Bulanan) calculation logic and fields

-- We need a way to track IDR historical cost basis for foreign currency.
-- We'll add historical_idr_balance to cash_balances to track the "Saldo Awal (Rp)"/cost basis.
ALTER TABLE public.cash_balances ADD COLUMN IF NOT EXISTS historical_idr_balance NUMERIC DEFAULT 0;

-- Function to get LKUB data for a specific branch and month
CREATE OR REPLACE FUNCTION public.get_lkub_data(
  p_branch_id UUID,
  p_period_month DATE
)
RETURNS TABLE (
  currency_id UUID,
  currency_code TEXT,
  saldo_awal_valas NUMERIC,
  saldo_awal_idr NUMERIC,
  volume_beli_valas NUMERIC,
  volume_beli_idr NUMERIC,
  volume_jual_valas NUMERIC,
  volume_jual_idr NUMERIC,
  mid_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH 
  currencies_list AS (
    SELECT id, code FROM public.currencies WHERE is_active = true
  ),
  -- Calculate volumes from transactions in the period
  trx_volumes AS (
    SELECT 
      t.currency_id,
      SUM(CASE WHEN t.transaction_type = 'buy' THEN t.foreign_amount ELSE 0 END) as buy_v,
      SUM(CASE WHEN t.transaction_type = 'buy' THEN t.idr_amount ELSE 0 END) as buy_i,
      SUM(CASE WHEN t.transaction_type = 'sell' THEN t.foreign_amount ELSE 0 END) as sell_v,
      SUM(CASE WHEN t.transaction_type = 'sell' THEN t.idr_amount ELSE 0 END) as sell_i
    FROM public.transactions t
    WHERE t.status = 'completed'
      AND (p_branch_id IS NULL OR t.branch_id = p_branch_id)
      AND t.transaction_date >= p_period_month
      AND t.transaction_date < (p_period_month + INTERVAL '1 month')
    GROUP BY t.currency_id
  ),
  -- Get closing balance of previous month as opening balance
  opening AS (
    SELECT 
      cb.currency_id,
      COALESCE((
        SELECT balance_after 
        FROM public.cash_movements 
        WHERE currency_id = cb.currency_id 
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)
          AND created_at < p_period_month
        ORDER BY created_at DESC 
        LIMIT 1
      ), 0) as start_v,
      cb.historical_idr_balance as start_i
    FROM public.cash_balances cb
    WHERE (p_branch_id IS NULL OR cb.branch_id = p_branch_id)
  ),
  rates AS (
    SELECT mr.currency_id, mr.mid_rate
    FROM public.mid_rates mr
    WHERE mr.period_month = p_period_month
  )
  SELECT 
    cl.id as currency_id,
    cl.code as currency_code,
    COALESCE(o.start_v, 0)::NUMERIC as saldo_awal_valas,
    COALESCE(o.start_i, 0)::NUMERIC as saldo_awal_idr,
    COALESCE(tv.buy_v, 0)::NUMERIC as volume_beli_valas,
    COALESCE(tv.buy_i, 0)::NUMERIC as volume_beli_idr,
    COALESCE(tv.sell_v, 0)::NUMERIC as volume_jual_valas,
    COALESCE(tv.sell_i, 0)::NUMERIC as volume_jual_idr,
    mr.mid_rate::NUMERIC
  FROM currencies_list cl
  LEFT JOIN opening o ON cl.id = o.currency_id
  LEFT JOIN trx_volumes tv ON cl.id = tv.currency_id
  LEFT JOIN rates mr ON cl.id = mr.currency_id;
END;
$$ SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_lkub_data(UUID, DATE) TO authenticated;
