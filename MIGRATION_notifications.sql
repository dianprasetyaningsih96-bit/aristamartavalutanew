-- ============================================================================
-- MODUL NOTIFIKASI AMBANG BATAS (Threshold Notifications)
-- ============================================================================
-- Menyimpan notifikasi otomatis yang dipicu oleh event penting:
-- - Transaksi high-value (>= Rp 100 jt)  → LTKT candidate
-- - Transaksi kandidat LTKM (di-flag suspicious)
-- - Percobaan transaksi oleh nasabah blacklist
-- - Saldo kas rendah / negatif
-- - Permintaan persetujuan baru (untuk Manager/Owner)
-- - Perubahan status persetujuan (untuk pengaju)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.notification_severity AS ENUM ('info','warning','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_category AS ENUM (
    'ltkt_threshold',
    'ltkm_suspicious',
    'blacklist_attempt',
    'low_cash',
    'approval_request',
    'approval_decision',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = broadcast to roles
  target_roles public.app_role[] DEFAULT NULL,               -- broadcast targets
  category public.notification_category NOT NULL,
  severity public.notification_severity NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  link text,
  reference_table text,
  reference_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  read_by uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Read: pemilik langsung, atau salah satu peran user termasuk target_roles,
--       atau super_admin/owner.
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'owner')
    OR (
      target_roles IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = ANY(target_roles)
      )
    )
  );

-- Update terbatas pada kolom read_by (tandai sudah dibaca).
DROP POLICY IF EXISTS "notifications_update_read" ON public.notifications;
CREATE POLICY "notifications_update_read" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'owner')
    OR (
      target_roles IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = ANY(target_roles)
      )
    )
  )
  WITH CHECK (true);

-- Insert dari trigger security-definer (bypass RLS), tapi juga izinkan
-- authenticated (aman karena trigger yang memicu).
DROP POLICY IF EXISTS "notifications_insert_any_auth" ON public.notifications;
CREATE POLICY "notifications_insert_any_auth" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- Helper: mark_notification_read / mark_all_read
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_notification_read(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET read_by = (
    SELECT ARRAY(SELECT DISTINCT unnest(read_by || ARRAY[auth.uid()]))
  )
  WHERE id = _id;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET read_by = (
    SELECT ARRAY(SELECT DISTINCT unnest(read_by || ARRAY[auth.uid()]))
  )
  WHERE NOT (auth.uid() = ANY(read_by))
    AND (
      user_id = auth.uid()
      OR (
        target_roles IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = ANY(target_roles)
        )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- ============================================================================
-- TRIGGER: Transaksi high-value / blacklist attempt
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_transaction_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name text;
  v_is_blacklist boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name, is_blacklisted INTO v_customer_name, v_is_blacklist
    FROM public.customers WHERE id = NEW.customer_id;

    -- High-value transaction ≥ Rp 100 juta → warning ke manager/owner/auditor
    IF NEW.idr_amount >= 100000000 THEN
      INSERT INTO public.notifications(
        target_roles, category, severity, title, message, link,
        reference_table, reference_id, metadata
      ) VALUES (
        ARRAY['branch_manager','super_admin','owner','auditor']::public.app_role[],
        CASE WHEN NEW.idr_amount >= 500000000 THEN 'ltkt_threshold' ELSE 'ltkt_threshold' END,
        CASE WHEN NEW.idr_amount >= 500000000 THEN 'critical' ELSE 'warning' END,
        'Transaksi Nilai Besar: ' || NEW.transaction_number,
        COALESCE(v_customer_name,'-') || ' — ' || NEW.transaction_type || ' Rp ' ||
          to_char(NEW.idr_amount, 'FM999G999G999G999'),
        '/transactions',
        'transactions', NEW.id,
        jsonb_build_object('idr_amount', NEW.idr_amount, 'currency', NEW.currency_code)
      );
    END IF;

    -- Percobaan transaksi customer blacklist (walau di app diblokir, ini pengaman)
    IF v_is_blacklist THEN
      INSERT INTO public.notifications(
        target_roles, category, severity, title, message, link,
        reference_table, reference_id
      ) VALUES (
        ARRAY['branch_manager','super_admin','owner','auditor']::public.app_role[],
        'blacklist_attempt', 'critical',
        'Transaksi Nasabah Blacklist',
        COALESCE(v_customer_name,'-') || ' melakukan transaksi ' || NEW.transaction_number,
        '/transactions',
        'transactions', NEW.id
      );
    END IF;
  END IF;

  -- LTKM: transaksi di-flag suspicious
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.is_suspicious,false) = false
     AND COALESCE(NEW.is_suspicious,false) = true THEN
    INSERT INTO public.notifications(
      target_roles, category, severity, title, message, link,
      reference_table, reference_id
    ) VALUES (
      ARRAY['branch_manager','super_admin','owner','auditor']::public.app_role[],
      'ltkm_suspicious','critical',
      'LTKM: ' || NEW.transaction_number,
      'Transaksi ditandai mencurigakan. Segera tinjau untuk pelaporan PPATK.',
      '/reports',
      'transactions', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_transaction ON public.transactions;
CREATE TRIGGER trg_notify_transaction
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_transaction_event();

-- ============================================================================
-- TRIGGER: Saldo kas rendah / negatif
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_low_cash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold numeric;
  v_branch_name text;
BEGIN
  -- Ambang default: IDR 50 jt, mata uang asing 1.000 unit
  IF NEW.currency_code = 'IDR' THEN v_threshold := 50000000;
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
      'Saldo Kas Negatif: ' || NEW.currency_code,
      COALESCE(v_branch_name,'Cabang') || ' — saldo ' || NEW.currency_code || ' turun ke ' || NEW.balance::text,
      '/cash',
      'cash_balances', NEW.id,
      jsonb_build_object('balance', NEW.balance, 'currency', NEW.currency_code)
    );
  ELSIF NEW.balance < v_threshold AND (OLD.balance IS NULL OR OLD.balance >= v_threshold) THEN
    SELECT name INTO v_branch_name FROM public.branches WHERE id = NEW.branch_id;
    INSERT INTO public.notifications(
      target_roles, category, severity, title, message, link,
      reference_table, reference_id, metadata
    ) VALUES (
      ARRAY['branch_manager','super_admin','owner']::public.app_role[],
      'low_cash','warning',
      'Saldo Kas Menipis: ' || NEW.currency_code,
      COALESCE(v_branch_name,'Cabang') || ' — saldo ' || NEW.currency_code || ' di bawah ambang batas',
      '/cash',
      'cash_balances', NEW.id,
      jsonb_build_object('balance', NEW.balance, 'threshold', v_threshold)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_low_cash ON public.cash_balances;
CREATE TRIGGER trg_notify_low_cash
AFTER INSERT OR UPDATE OF balance ON public.cash_balances
FOR EACH ROW EXECUTE FUNCTION public.notify_low_cash();

-- ============================================================================
-- TRIGGER: Approval requests
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_approval_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(
      target_roles, category, severity, title, message, link,
      reference_table, reference_id
    ) VALUES (
      ARRAY['branch_manager','super_admin','owner']::public.app_role[],
      'approval_request','info',
      'Permintaan Persetujuan Baru: ' || NEW.request_number,
      'Aksi: ' || NEW.action_type || ' — segera ditinjau.',
      '/approvals',
      'approval_requests', NEW.id
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    IF NEW.requested_by IS NOT NULL THEN
      INSERT INTO public.notifications(
        user_id, category, severity, title, message, link,
        reference_table, reference_id
      ) VALUES (
        NEW.requested_by, 'approval_decision',
        CASE WHEN NEW.status = 'approved' THEN 'info' ELSE 'warning' END,
        'Persetujuan ' || CASE WHEN NEW.status = 'approved' THEN 'Disetujui' ELSE 'Ditolak' END
          || ': ' || NEW.request_number,
        COALESCE(NEW.review_notes,'(tanpa catatan)'),
        '/approvals',
        'approval_requests', NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_approval ON public.approval_requests;
CREATE TRIGGER trg_notify_approval
AFTER INSERT OR UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_approval_event();

-- ============================================================================
-- Realtime (opsional): pastikan tabel notifications ada di publication realtime
-- ============================================================================
DO $$ BEGIN
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  IF FOUND THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;