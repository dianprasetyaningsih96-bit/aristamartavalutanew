-- ==============================================================================
-- SQL: Pencegahan Simpan Nasabah DTTOT & Pembersihan Data Uji Coba "COBA"
-- 1. Hapus nasabah uji coba "COBA" dengan no identitas 070275Q007873
-- 2. Sinkronkan identity_number KEVIN JORDAN AXEL GUIAVARCH (ILQ-214)
-- 3. Pasang TRIGGER Database BEFORE INSERT/UPDATE agar nasabah DTTOT tidak bisa disimpan
-- ==============================================================================

-- 1. Hapus nasabah uji coba "COBA" yang sempat tersimpan
DELETE FROM public.customers
WHERE id_number ILIKE '%070275Q007873%' 
   OR (full_name ILIKE 'COBA' AND customer_code ILIKE 'CUS-202609-%');

-- 2. Pastikan entri DTTOT KEVIN JORDAN AXEL GUIAVARCH memiliki nomor identitas 070275Q007873
UPDATE public.dttot_list
SET identity_number = '070275Q007873',
    updated_at = now()
WHERE full_name ILIKE '%GUIAVARCH%' 
   OR reference_code = 'ILQ-214' 
   OR notes ILIKE '%070275Q007873%';

-- 3. Buat trigger database sebelum simpan nasabah (Hard Prevention di level Database)
CREATE OR REPLACE FUNCTION public.check_customer_dttot_before_save()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_dttot RECORD;
  v_clean_id TEXT;
  v_clean_name TEXT;
BEGIN
  -- Bersihkan nomor identitas (hanya karakter alfanumerik huruf kecil)
  v_clean_id := regexp_replace(lower(COALESCE(NEW.id_number, '')), '[^0-9a-z]', '', 'g');
  v_clean_name := lower(trim(COALESCE(NEW.full_name, '')));

  -- 1. Cek kecocokan Nomor Identitas (di kolom identity_number maupun catatan notes DTTOT)
  IF length(v_clean_id) >= 5 THEN
    SELECT reference_code, full_name, identity_number INTO v_dttot
    FROM public.dttot_list
    WHERE is_active = true
      AND (
        regexp_replace(lower(COALESCE(identity_number, '')), '[^0-9a-z]', '', 'g') LIKE '%' || v_clean_id || '%'
        OR regexp_replace(lower(COALESCE(notes, '')), '[^0-9a-z]', '', 'g') LIKE '%' || v_clean_id || '%'
      )
    LIMIT 1;

    IF v_dttot.full_name IS NOT NULL THEN
      RAISE EXCEPTION 'PENDAFTARAN DITOLAK: Nomor identitas nasabah (%) teridentifikasi dalam DTTOT Bank Indonesia (Kode: %, Nama: %). Sesuai regulasi BI, pendaftaran nasabah DTTOT dilarang!', 
        NEW.id_number, COALESCE(v_dttot.reference_code, '-'), v_dttot.full_name;
    END IF;
  END IF;

  -- 2. Cek kecocokan Nama Lengkap / Alias DTTOT
  IF length(v_clean_name) >= 4 THEN
    SELECT reference_code, full_name INTO v_dttot
    FROM public.dttot_list
    WHERE is_active = true
      AND (
        lower(trim(full_name)) = v_clean_name
        OR (length(v_clean_name) >= 5 AND lower(full_name) LIKE '%' || v_clean_name || '%')
        OR (length(v_clean_name) >= 5 AND lower(COALESCE(aliases, '')) LIKE '%' || v_clean_name || '%')
      )
    LIMIT 1;

    IF v_dttot.full_name IS NOT NULL THEN
      RAISE EXCEPTION 'PENDAFTARAN DITOLAK: Nama nasabah (%) teridentifikasi dalam DTTOT Bank Indonesia (Kode: %, Nama: %). Sesuai regulasi BI, pendaftaran nasabah DTTOT dilarang!', 
        NEW.full_name, COALESCE(v_dttot.reference_code, '-'), v_dttot.full_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_customer_dttot_before_save ON public.customers;
CREATE TRIGGER trg_check_customer_dttot_before_save
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.check_customer_dttot_before_save();
