-- CONSOLIDATED FIX FOR NOTIFICATION ENUM TYPE MISMATCH (V2)
-- Explicitly dropping process_branch_transfer first to handle parameter default change constraints

-- 1. Fix notify_low_cash
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
      'low_cash'::public.notification_category,
      'critical'::public.notification_severity,
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
      'low_cash'::public.notification_category,
      'warning'::public.notification_severity,
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

-- 2. Fix notify_transaction_event
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
    
    SELECT code INTO v_currency_code FROM public.currencies WHERE id = NEW.currency_id;

    IF NEW.idr_amount >= 100000000 THEN
      INSERT INTO public.notifications(
        target_roles, category, severity, title, message, link,
        reference_table, reference_id, metadata
      ) VALUES (
        ARRAY['branch_manager','super_admin','owner','auditor']::public.app_role[],
        'ltkt_threshold'::public.notification_category,
        (CASE WHEN NEW.idr_amount >= 500000000 THEN 'critical' ELSE 'warning' END)::public.notification_severity,
        'Transaksi Nilai Besar: ' || NEW.transaction_no,
        COALESCE(v_customer_name,'-') || ' — ' || NEW.transaction_type || ' Rp ' ||
          to_char(NEW.idr_amount, 'FM999G999G999G999'),
        '/transactions',
        'transactions', NEW.id,
        jsonb_build_object('idr_amount', NEW.idr_amount, 'currency', v_currency_code)
      );
    END IF;

    IF v_is_blacklist THEN
      INSERT INTO public.notifications(
        target_roles, category, severity, title, message, link,
        reference_table, reference_id
      ) VALUES (
        ARRAY['branch_manager','super_admin','owner','auditor']::public.app_role[],
        'dttot_attempt'::public.notification_category, 
        'critical'::public.notification_severity,
        'Transaksi Nasabah DTTOT',
        COALESCE(v_customer_name,'-') || ' melakukan transaksi ' || NEW.transaction_no,
        '/transactions',
        'transactions', NEW.id
      );
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.is_suspicious,false) = false
     AND COALESCE(NEW.is_suspicious,false) = true THEN
    INSERT INTO public.notifications(
      target_roles, category, severity, title, message, link,
      reference_table, reference_id
    ) VALUES (
      ARRAY['branch_manager','super_admin','owner','auditor']::public.app_role[],
      'ltkm_suspicious'::public.notification_category,
      'critical'::public.notification_severity,
      'LTKM: ' || NEW.transaction_no,
      'Transaksi ditandai mencurigakan. Segera tinjau untuk pelaporan PPATK.',
      '/reports',
      'transactions', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Fix process_branch_transfer (Drop and Recreate)
DROP FUNCTION IF EXISTS public.process_branch_transfer(uuid,text,text);

CREATE OR REPLACE FUNCTION public.process_branch_transfer(transfer_id UUID, p_status TEXT, p_notes TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    t_row public.branch_transfers%ROWTYPE;
    head_office_id UUID;
BEGIN
    SELECT * INTO t_row FROM public.branch_transfers WHERE id = transfer_id;
    IF t_row.id IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
    IF t_row.status != 'pending' THEN RAISE EXCEPTION 'Transfer already processed'; END IF;
    
    SELECT id INTO head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;

    IF p_status = 'accepted' THEN
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, movement_type, reference_no, notes)
        VALUES (t_row.branch_id, t_row.currency_id, -t_row.amount, 'transfer_out', t_row.id::text, 'Transfer ke Kantor Pusat diterima');

        INSERT INTO public.cash_movements (branch_id, currency_id, amount, movement_type, reference_no, notes)
        VALUES (head_office_id, t_row.currency_id, t_row.amount, 'transfer_in', t_row.id::text, 'Terima transfer dari cabang');

    ELSIF p_status = 'rejected' THEN
        INSERT INTO public.notifications (user_id, title, message, category, severity, type, branch_id)
        SELECT 
            p.id, 
            'Transfer Ditolak', 
            'Transfer ' || t_row.amount || ' ditolak oleh Kantor Pusat: ' || COALESCE(p_notes, ''),
            'approval_decision'::public.notification_category,
            'warning'::public.notification_severity,
            'transfer_rejected',
            t_row.branch_id
        FROM public.profiles p
        WHERE p.branch_id = t_row.branch_id;
    END IF;

    UPDATE public.branch_transfers 
    SET status = p_status, 
        processed_at = now(), 
        processed_by = auth.uid(),
        notes = p_notes
    WHERE id = transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
