-- ==============================================================================
-- Format Nomor Transaksi KUPVA BB Sesuai Cabang & Tipe Transaksi
-- Kantor Pusat:
--   - Beli Valas: AMVJ1-YYYYMMDD-001
--   - Jual Valas: AMVJ2-YYYYMMDD-001
-- Cabang Canggu:
--   - Beli Valas: AMVC1-YYYYMMDD-001
--   - Jual Valas: AMVC2-YYYYMMDD-001
-- Cabang Legian:
--   - Beli Valas: AMVL1-YYYYMMDD-001
--   - Jual Valas: AMVL2-YYYYMMDD-001
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.generate_transaction_no()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_branch_name text := '';
  v_branch_code text := '';
  v_branch_letter text := 'J'; -- Default Kantor Pusat (Jimbaran)
  v_type_num text := '1';      -- 1 = Beli (Buy), 2 = Jual (Sell)
  v_date_str text;
  v_prefix text;
  next_seq int;
BEGIN
  -- Hanya buat nomor baru jika belum diisi atau masih berformat default lama
  IF NEW.transaction_no IS NULL OR NEW.transaction_no = '' OR NEW.transaction_no LIKE 'TRX-%' THEN
    -- 1. Tentukan nomor jenis transaksi (1 = Beli, 2 = Jual)
    IF NEW.transaction_type = 'sell' THEN
      v_type_num := '2';
    ELSE
      v_type_num := '1';
    END IF;

    -- 2. Tentukan kode cabang (J = Pusat/Jimbaran, C = Canggu, L = Legian)
    IF NEW.branch_id IS NOT NULL THEN
      SELECT name, code INTO v_branch_name, v_branch_code
      FROM public.branches
      WHERE id = NEW.branch_id;

      IF v_branch_name ILIKE '%canggu%' OR v_branch_code ILIKE '%canggu%' THEN
        v_branch_letter := 'C';
      ELSIF v_branch_name ILIKE '%legian%' OR v_branch_code ILIKE '%legian%' THEN
        v_branch_letter := 'L';
      ELSIF v_branch_name ILIKE '%pusat%' OR v_branch_name ILIKE '%jimbaran%' OR v_branch_code ILIKE '%HQ%' THEN
        v_branch_letter := 'J';
      ELSE
        -- Fallback: ambil huruf pertama nama cabang atau 'J'
        v_branch_letter := COALESCE(NULLIF(UPPER(SUBSTRING(v_branch_name FROM 1 FOR 1)), ''), 'J');
      END IF;
    ELSE
      v_branch_letter := 'J';
    END IF;

    -- 3. Format tanggal YYYYMMDD (WITA / UTC+8)
    v_date_str := to_char(COALESCE(NEW.transaction_date, timezone('Asia/Makassar', now())), 'YYYYMMDD');

    -- 4. Gabungkan prefix: AMV[J/C/L][1/2]-YYYYMMDD-
    v_prefix := 'AMV' || v_branch_letter || v_type_num || '-' || v_date_str || '-';

    -- 5. Hitung sequence berikutnya untuk prefix dan tanggal tersebut
    SELECT COALESCE(MAX(SUBSTRING(transaction_no FROM '\d+$')::int), 0) + 1
      INTO next_seq
      FROM public.transactions
      WHERE transaction_no LIKE v_prefix || '%';

    -- 6. Format nomor: AMVJ1-YYYYMMDD-001 (3 digit padding)
    NEW.transaction_no := v_prefix || lpad(next_seq::text, 3, '0');
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS transactions_gen_no ON public.transactions;
CREATE TRIGGER transactions_gen_no
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_transaction_no();

-- Perbarui juga fungsi delete & renumber Super Admin
CREATE OR REPLACE FUNCTION public.admin_delete_transaction(_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx public.transactions%ROWTYPE;
  v_prefix text;
  v_mv RECORD;
  r RECORD;
  i int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Hanya Super Admin yang dapat menghapus transaksi';
  END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = _transaction_id;
  IF v_tx.id IS NULL THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  -- Kembalikan saldo kas & hapus mutasi yang berasal dari transaksi ini.
  FOR v_mv IN
    SELECT * FROM public.cash_movements
    WHERE reference_id = _transaction_id
       OR (reference_id IS NULL AND reference_no = v_tx.transaction_no)
  LOOP
    UPDATE public.cash_balances
      SET balance = balance - v_mv.amount
      WHERE branch_id = v_mv.branch_id AND currency_id = v_mv.currency_id;
    DELETE FROM public.cash_movements WHERE id = v_mv.id;
  END LOOP;

  -- Ambil prefix sebelum 3-digit counter di belakang (mis. AMVJ1-20260901-)
  v_prefix := substring(v_tx.transaction_no from 1 for length(v_tx.transaction_no) - 3);

  DELETE FROM public.transactions WHERE id = _transaction_id;

  -- Penomoran ulang dua tahap agar tidak bentrok
  UPDATE public.transactions
    SET transaction_no = 'TMP-' || id::text
    WHERE transaction_no LIKE v_prefix || '%';

  FOR r IN
    SELECT id FROM public.transactions
    WHERE transaction_no LIKE 'TMP-%'
    ORDER BY transaction_date ASC, created_at ASC
  LOOP
    i := i + 1;
    UPDATE public.transactions
      SET transaction_no = v_prefix || lpad(i::text, 3, '0')
      WHERE id = r.id;
  END LOOP;
END;
$function$;
