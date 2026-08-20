-- Fix for error: record "new" has no field "currency_code"
-- This error occurs in notify_low_cash and notify_transaction_event because they might be referencing non-existent columns.

-- 1. Fix notify_low_cash (on cash_balances table)
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
  -- Lookup currency code since it's not a column in cash_balances
  SELECT code INTO v_currency_code FROM public.currencies WHERE id = NEW.currency_id;

  -- Default threshold: IDR 50M, others 1,000 units
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
      'Saldo Kas Negatif: ' || COALESCE(v_currency_code, '?'),
      COALESCE(v_branch_name,'Cabang') || ' — saldo ' || COALESCE(v_currency_code, '?') || ' turun ke ' || NEW.balance::text,
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
      'Saldo Kas Menipis: ' || COALESCE(v_currency_code, '?'),
      COALESCE(v_branch_name,'Cabang') || ' — saldo ' || COALESCE(v_currency_code, '?') || ' di bawah ambang batas',
      '/cash',
      'cash_balances', NEW.id,
      jsonb_build_object('balance', NEW.balance, 'threshold', v_threshold, 'currency', v_currency_code)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Fix notify_transaction_event (on transactions table)
-- Ensure it doesn't reference NEW.currency_code if it doesn't exist.
-- The transactions table has currency_id, but NOT currency_code.
CREATE OR REPLACE FUNCTION public.notify_transaction_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name text;
  v_is_blacklist boolean := false;
  v_currency_code text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name, is_blacklisted INTO v_customer_name, v_is_blacklist
    FROM public.customers WHERE id = NEW.customer_id;
    
    -- Lookup currency code correctly
    SELECT code INTO v_currency_code FROM public.currencies WHERE id = NEW.currency_id;

    -- High-value transaction ≥ Rp 100 juta
    IF NEW.idr_amount >= 100000000 THEN
      INSERT INTO public.notifications(
        target_roles, category, severity, title, message, link,
        reference_table, reference_id, metadata
      ) VALUES (
        ARRAY['branch_manager','super_admin','owner','auditor']::public.app_role[],
        'ltkt_threshold',
        CASE WHEN NEW.idr_amount >= 500000000 THEN 'critical' ELSE 'warning' END,
        'Transaksi Nilai Besar: ' || NEW.transaction_no,
        COALESCE(v_customer_name,'-') || ' — ' || NEW.transaction_type || ' Rp ' ||
          to_char(NEW.idr_amount, 'FM999G999G999G999'),
        '/transactions',
        'transactions', NEW.id,
        jsonb_build_object('idr_amount', NEW.idr_amount, 'currency', v_currency_code)
      );
    END IF;

    -- Percobaan transaksi customer blacklist
    IF v_is_blacklist THEN
      INSERT INTO public.notifications(
        target_roles, category, severity, title, message, link,
        reference_table, reference_id
      ) VALUES (
        ARRAY['branch_manager','super_admin','owner','auditor']::public.app_role[],
        'blacklist_attempt', 'critical',
        'Transaksi Nasabah Blacklist',
        COALESCE(v_customer_name,'-') || ' melakukan transaksi ' || NEW.transaction_no,
        '/transactions',
        'transactions', NEW.id
      );
    END IF;
  END IF;

  -- LTKM: suspicious flag
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.is_suspicious,false) = false
     AND COALESCE(NEW.is_suspicious,false) = true THEN
    INSERT INTO public.notifications(
      target_roles, category, severity, title, message, link,
      reference_table, reference_id
    ) VALUES (
      ARRAY['branch_manager','super_admin','owner','auditor']::public.app_role[],
      'ltkm_suspicious','critical',
      'LTKM: ' || NEW.transaction_no,
      'Transaksi ditandai mencurigakan. Segera tinjau untuk pelaporan PPATK.',
      '/reports',
      'transactions', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;
