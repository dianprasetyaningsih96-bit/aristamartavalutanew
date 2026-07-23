-- ============================================================================
-- DTTOT (Daftar Terduga Teroris dan Organisasi Teroris)
-- ============================================================================
-- Menyimpan daftar terduga teroris & organisasi teroris yang diterbitkan
-- oleh otoritas (mis. Kepolisian RI / PPATK / DK-PBB). Digunakan untuk
-- screening nasabah pada proses CDD/EDD.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.dttot_entity_type AS ENUM ('individual','organization');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.dttot_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text UNIQUE,          -- kode/nomor referensi resmi (mis. IDN-001)
  entity_type public.dttot_entity_type NOT NULL DEFAULT 'individual',
  full_name text NOT NULL,
  aliases text,                        -- pisahkan dengan koma
  identity_number text,                -- NIK/Paspor/No. registrasi
  place_of_birth text,
  date_of_birth date,
  nationality text,
  address text,
  source text,                         -- sumber daftar (Perpol, PBB, dsb.)
  listed_at date,                      -- tanggal masuk daftar
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dttot_full_name ON public.dttot_list (lower(full_name));
CREATE INDEX IF NOT EXISTS idx_dttot_identity ON public.dttot_list (identity_number);
CREATE INDEX IF NOT EXISTS idx_dttot_active ON public.dttot_list (is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dttot_list TO authenticated;
GRANT ALL ON public.dttot_list TO service_role;

ALTER TABLE public.dttot_list ENABLE ROW LEVEL SECURITY;

-- Semua user terautentikasi bisa membaca (untuk screening nasabah).
DROP POLICY IF EXISTS "dttot_select_auth" ON public.dttot_list;
CREATE POLICY "dttot_select_auth" ON public.dttot_list
  FOR SELECT TO authenticated USING (true);

-- Hanya super_admin / owner / auditor yang boleh mengubah daftar.
DROP POLICY IF EXISTS "dttot_insert_admin" ON public.dttot_list;
CREATE POLICY "dttot_insert_admin" ON public.dttot_list
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR public.has_role(auth.uid(),'auditor')
  );

DROP POLICY IF EXISTS "dttot_update_admin" ON public.dttot_list;
CREATE POLICY "dttot_update_admin" ON public.dttot_list
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR public.has_role(auth.uid(),'auditor')
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "dttot_delete_admin" ON public.dttot_list;
CREATE POLICY "dttot_delete_admin" ON public.dttot_list
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.dttot_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_dttot_updated ON public.dttot_list;
CREATE TRIGGER trg_dttot_updated
BEFORE UPDATE ON public.dttot_list
FOR EACH ROW EXECUTE FUNCTION public.dttot_set_updated_at();

-- ============================================================================
-- Perbarui judul notifikasi: "Blacklist" -> "DTTOT"
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

    IF NEW.idr_amount >= 100000000 THEN
      INSERT INTO public.notifications(
        target_roles, category, severity, title, message, link,
        reference_table, reference_id, metadata
      ) VALUES (
        ARRAY['branch_manager','super_admin','owner','auditor']::public.app_role[],
        'ltkt_threshold',
        CASE WHEN NEW.idr_amount >= 500000000 THEN 'critical' ELSE 'warning' END,
        'Transaksi Nilai Besar: ' || NEW.transaction_number,
        COALESCE(v_customer_name,'-') || ' — ' || NEW.transaction_type || ' Rp ' ||
          to_char(NEW.idr_amount, 'FM999G999G999G999'),
        '/transactions',
        'transactions', NEW.id,
        jsonb_build_object('idr_amount', NEW.idr_amount, 'currency', NEW.currency_code)
      );
    END IF;

    IF v_is_blacklist THEN
      INSERT INTO public.notifications(
        target_roles, category, severity, title, message, link,
        reference_table, reference_id
      ) VALUES (
        ARRAY['branch_manager','super_admin','owner','auditor']::public.app_role[],
        'blacklist_attempt', 'critical',
        'Transaksi Nasabah DTTOT',
        COALESCE(v_customer_name,'-') || ' (masuk DTTOT) melakukan transaksi ' || NEW.transaction_number,
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