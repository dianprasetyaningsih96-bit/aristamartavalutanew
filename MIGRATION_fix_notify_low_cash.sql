-- Fix: cash_balances uses currency_id (uuid), not currency_code.
-- Trigger sebelumnya menyebabkan error "record 'new' has no field 'currency_code'"
-- saat cash_balances di-update (mis. dari pembukaan shif dengan modal awal).

CREATE OR REPLACE FUNCTION public.notify_low_cash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold numeric;
  v_branch_name text;
  v_currency_code text;
BEGIN
  SELECT code INTO v_currency_code FROM public.currencies WHERE id = NEW.currency_id;

  IF v_currency_code = 'IDR' THEN v_threshold := 50000000;
  ELSE v_threshold := 1000;
  END IF;

  IF NEW.balance < 0 THEN
    SELECT name INTO v_branch_name FROM public.branches WHERE id = NEW.branch_id;
    INSERT INTO public.notifications(
      target_roles, category, severity, title, message, link,
      reference_table, reference_id, metadata
    ) VALUES (
      ARRAY['branch_manager','super_admin','owner']::public.app_role[],
      'low_cash','critical',
      'Saldo Kas Negatif: ' || COALESCE(v_currency_code,'?'),
      COALESCE(v_branch_name,'Cabang') || ' — saldo ' || COALESCE(v_currency_code,'?') || ' turun ke ' || NEW.balance::text,
      '/cash',
      'cash_balances', NEW.id,
      jsonb_build_object('balance', NEW.balance, 'currency', v_currency_code)
    );
  ELSIF NEW.balance < v_threshold AND (TG_OP = 'INSERT' OR OLD.balance IS NULL OR OLD.balance >= v_threshold) THEN
    SELECT name INTO v_branch_name FROM public.branches WHERE id = NEW.branch_id;
    INSERT INTO public.notifications(
      target_roles, category, severity, title, message, link,
      reference_table, reference_id, metadata
    ) VALUES (
      ARRAY['branch_manager','super_admin','owner']::public.app_role[],
      'low_cash','warning',
      'Saldo Kas Menipis: ' || COALESCE(v_currency_code,'?'),
      COALESCE(v_branch_name,'Cabang') || ' — saldo ' || COALESCE(v_currency_code,'?') || ' di bawah ambang batas',
      '/cash',
      'cash_balances', NEW.id,
      jsonb_build_object('balance', NEW.balance, 'threshold', v_threshold, 'currency', v_currency_code)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_low_cash ON public.cash_balances;
CREATE TRIGGER trg_notify_low_cash
AFTER INSERT OR UPDATE OF balance ON public.cash_balances
FOR EACH ROW EXECUTE FUNCTION public.notify_low_cash();