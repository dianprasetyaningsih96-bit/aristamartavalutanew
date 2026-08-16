-- Laporan Kegiatan Usaha Bulanan (LKUB) Enhancements
-- 1. Create a table to track monthly opening balances (Saldo Awal) per branch and currency.

CREATE TABLE IF NOT EXISTS public.monthly_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    currency_id uuid REFERENCES public.currencies(id) ON DELETE CASCADE NOT NULL,
    period_month date NOT NULL, -- First day of the month
    opening_balance_foreign numeric(20, 4) DEFAULT 0 NOT NULL,
    opening_balance_idr numeric(20, 2) DEFAULT 0 NOT NULL, -- Historical cost basis
    created_at timestamptz DEFAULT now(),
    UNIQUE (branch_id, currency_id, period_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_balances TO authenticated;
GRANT ALL ON public.monthly_balances TO service_role;

ALTER TABLE public.monthly_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated to select monthly balances"
ON public.monthly_balances FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins to manage monthly balances"
ON public.monthly_balances FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'owner'));

-- 2. Function to automatically initialize opening balances for a new month based on previous month's transactions
-- This is a helper that can be called by the app or a trigger
CREATE OR REPLACE FUNCTION public.calculate_monthly_opening(p_branch_id uuid, p_target_month date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prev_month date := (p_target_month - interval '1 month')::date;
BEGIN
    -- Logic: Saldo Akhir bulan lalu = Saldo Awal bulan lalu + Beli - Jual
    -- We record the result into public.monthly_balances for the target month
    
    INSERT INTO public.monthly_balances (branch_id, currency_id, period_month, opening_balance_foreign, opening_balance_idr)
    SELECT 
        p_branch_id,
        c.id as currency_id,
        p_target_month,
        COALESCE(prev.opening_balance_foreign, 0) + 
            COALESCE((SELECT SUM(foreign_amount) FROM public.transactions WHERE branch_id = p_branch_id AND currency_id = c.id AND transaction_type = 'buy' AND status = 'completed' AND transaction_date >= prev_month AND transaction_date < p_target_month), 0) -
            COALESCE((SELECT SUM(foreign_amount) FROM public.transactions WHERE branch_id = p_branch_id AND currency_id = c.id AND transaction_type = 'sell' AND status = 'completed' AND transaction_date >= prev_month AND transaction_date < p_target_month), 0),
        COALESCE(prev.opening_balance_idr, 0) +
            COALESCE((SELECT SUM(idr_amount) FROM public.transactions WHERE branch_id = p_branch_id AND currency_id = c.id AND transaction_type = 'buy' AND status = 'completed' AND transaction_date >= prev_month AND transaction_date < p_target_month), 0) -
            COALESCE((SELECT SUM(idr_amount) FROM public.transactions WHERE branch_id = p_branch_id AND currency_id = c.id AND transaction_type = 'sell' AND status = 'completed' AND transaction_date >= prev_month AND transaction_date < p_target_month), 0)
    FROM public.currencies c
    LEFT JOIN public.monthly_balances prev ON prev.branch_id = p_branch_id AND prev.currency_id = c.id AND prev.period_month = prev_month
    ON CONFLICT (branch_id, currency_id, period_month) DO UPDATE 
    SET opening_balance_foreign = EXCLUDED.opening_balance_foreign,
        opening_balance_idr = EXCLUDED.opening_balance_idr;
END;
$$;
