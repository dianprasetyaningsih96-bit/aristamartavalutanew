-- ==============================================================================
-- Perbaikan Kas & Inventaris Cabang Canggu:
-- Hapus Transaksi Beli CNY 1.000 (AMVC1-20260901-004) dan hitung ulang saldo akhir
-- Saldo akhir IDR seharusnya: Rp 59.498.500
-- Saldo akhir CNY seharusnya: 5,00
-- ==============================================================================

DO $$
DECLARE
  v_canggu_id uuid;
  v_cny_id uuid;
  v_idr_id uuid;
  v_tx_id uuid;
  v_tx_no text;
  r RECORD;
  c RECORD;
  v_running_bal numeric(20,2);
BEGIN
  -- 1. Dapatkan ID Cabang Canggu
  SELECT id INTO v_canggu_id FROM public.branches
  WHERE name ILIKE '%canggu%' OR code ILIKE '%HQ-02%'
  LIMIT 1;

  -- 2. Dapatkan ID Currency CNY & IDR
  SELECT id INTO v_cny_id FROM public.currencies WHERE code = 'CNY' LIMIT 1;
  SELECT id INTO v_idr_id FROM public.currencies WHERE code = 'IDR' LIMIT 1;

  -- 3. Cari Transaksi Beli CNY 1000 di Cabang Canggu
  SELECT id, transaction_no INTO v_tx_id, v_tx_no
  FROM public.transactions
  WHERE branch_id = v_canggu_id
    AND currency_id = v_cny_id
    AND foreign_amount = 1000
  ORDER BY created_at DESC
  LIMIT 1;

  -- Jika tidak ditemukan dengan foreign_amount = 1000, cari berdasarkan nomor transaksi 004
  IF v_tx_id IS NULL THEN
    SELECT id, transaction_no INTO v_tx_id, v_tx_no
    FROM public.transactions
    WHERE branch_id = v_canggu_id
      AND transaction_no ILIKE '%004%'
    LIMIT 1;
  END IF;

  -- 4. Hapus mutasi kas terkait transaksi tersebut
  IF v_tx_id IS NOT NULL THEN
    DELETE FROM public.cash_movements
    WHERE reference_id = v_tx_id
       OR (reference_no IS NOT NULL AND reference_no = v_tx_no)
       OR (notes IS NOT NULL AND notes LIKE '%' || v_tx_no || '%');

    -- Hapus transaksi dari tabel transactions
    DELETE FROM public.transactions WHERE id = v_tx_id;
  END IF;

  -- Hapus mutasi manual jika ada yang reference_no mengandung 004 dan CNY 1000 / IDR 200000
  DELETE FROM public.cash_movements
  WHERE branch_id = v_canggu_id
    AND (
      (currency_id = v_cny_id AND amount = 1000 AND (notes ILIKE '%004%' OR reference_no ILIKE '%004%'))
      OR
      (currency_id = v_idr_id AND amount = -200000 AND (notes ILIKE '%004%' OR reference_no ILIKE '%004%'))
    );

  -- 5. Hitung ulang running balance_after untuk setiap mutasi kas di Cabang Canggu
  FOR c IN
    SELECT DISTINCT currency_id FROM public.cash_movements WHERE branch_id = v_canggu_id
  LOOP
    v_running_bal := 0;
    FOR r IN
      SELECT id, amount
      FROM public.cash_movements
      WHERE branch_id = v_canggu_id AND currency_id = c.currency_id
      ORDER BY created_at ASC, id ASC
    LOOP
      v_running_bal := v_running_bal + r.amount;
      UPDATE public.cash_movements
      SET balance_after = v_running_bal
      WHERE id = r.id;
    END LOOP;

    -- Update atau Insert ke cash_balances
    INSERT INTO public.cash_balances (branch_id, currency_id, balance, updated_at)
    VALUES (v_canggu_id, c.currency_id, v_running_bal, now())
    ON CONFLICT (branch_id, currency_id)
    DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();
  END LOOP;

  RAISE NOTICE 'Selesai: Transaksi Beli CNY 1000 berhasil dihapus dan saldo Kas Cabang Canggu telah dihitung ulang.';
END $$;
