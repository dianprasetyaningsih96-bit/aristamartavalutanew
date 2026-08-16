-- Create exchange_rate_logs table
CREATE TABLE public.exchange_rate_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_id UUID,
    currency_code TEXT,
    branch_name TEXT,
    old_buy_rate NUMERIC,
    new_buy_rate NUMERIC,
    old_sell_rate NUMERIC,
    new_sell_rate NUMERIC,
    changed_by UUID REFERENCES public.profiles(id),
    changed_at TIMESTAMPTZ DEFAULT now(),
    action_type TEXT NOT NULL
);

-- Grant permissions
GRANT SELECT ON public.exchange_rate_logs TO authenticated;
GRANT ALL ON public.exchange_rate_logs TO service_role;

-- Enable RLS
ALTER TABLE public.exchange_rate_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated to select exchange_rate_logs"
ON public.exchange_rate_logs FOR SELECT
TO authenticated
USING (true);

-- Trigger function to log exchange rate changes
CREATE OR REPLACE FUNCTION public.log_exchange_rate_change()
RETURNS TRIGGER AS $$
DECLARE
    v_currency_code TEXT;
    v_branch_name TEXT;
    v_changed_by UUID;
BEGIN
    -- Get currency code
    SELECT code INTO v_currency_code FROM public.currencies WHERE id = COALESCE(NEW.currency_id, OLD.currency_id);
    
    -- Get branch name
    IF COALESCE(NEW.branch_id, OLD.branch_id) IS NULL THEN
        v_branch_name := 'HQ / Default';
    ELSE
        SELECT name INTO v_branch_name FROM public.branches WHERE id = COALESCE(NEW.branch_id, OLD.branch_id);
    END IF;

    -- Get current user ID from Supabase auth
    v_changed_by := auth.uid();

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.exchange_rate_logs (
            rate_id, currency_code, branch_name, 
            old_buy_rate, new_buy_rate, 
            old_sell_rate, new_sell_rate, 
            changed_by, action_type
        ) VALUES (
            NEW.id, v_currency_code, v_branch_name,
            NULL, NEW.buy_rate,
            NULL, NEW.sell_rate,
            v_changed_by, 'INSERT'
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only log if rates actually changed
        IF (OLD.buy_rate IS DISTINCT FROM NEW.buy_rate OR OLD.sell_rate IS DISTINCT FROM NEW.sell_rate OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
            INSERT INTO public.exchange_rate_logs (
                rate_id, currency_code, branch_name, 
                old_buy_rate, new_buy_rate, 
                old_sell_rate, new_sell_rate, 
                changed_by, action_type
            ) VALUES (
                NEW.id, v_currency_code, v_branch_name,
                OLD.buy_rate, NEW.buy_rate,
                OLD.sell_rate, NEW.sell_rate,
                v_changed_by, 'UPDATE'
            );
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.exchange_rate_logs (
            rate_id, currency_code, branch_name, 
            old_buy_rate, new_buy_rate, 
            old_sell_rate, new_sell_rate, 
            changed_by, action_type
        ) VALUES (
            OLD.id, v_currency_code, v_branch_name,
            OLD.buy_rate, NULL,
            OLD.sell_rate, NULL,
            v_changed_by, 'DELETE'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trg_log_exchange_rate_change ON public.exchange_rates;
CREATE TRIGGER trg_log_exchange_rate_change
AFTER INSERT OR UPDATE OR DELETE ON public.exchange_rates
FOR EACH ROW EXECUTE FUNCTION public.log_exchange_rate_change();
