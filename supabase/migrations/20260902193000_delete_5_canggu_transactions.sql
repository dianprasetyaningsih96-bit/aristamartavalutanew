-- ==============================================================================
-- SQL: Hapus 5 Transaksi & Mutasi di Cabang Canggu (HQ-02)
-- 1. Transaksi Beli IDR -7.785.000 [AMVC1-20260902-002]
-- 2. Transaksi Beli USD +450,00 [AMVC1-20260902-002]
-- 3. Transaksi Beli USD +350,00 [AMVC1-20260902-001]
-- 4. Transaksi Beli IDR -6.125.000 [AMVC1-20260902-001]
-- 5. Setoran Kas IDR +62.490.000 [SHIFT-45bad5c5] Modal awal shif pagi
-- ==============================================================================

DO $$
DECLARE
  v_canggu_id UUID;
  v_idr_id UUID;
  v_usd_id UUID;
  v_tx_id1 UUID;
  v_tx_id2 UUID;
BEGIN
  -- 1. Dapatkan ID Cabang Canggu (HQ-02)
  SELECT id INTO v_canggu_id 
  FROM public.branches 
  WHERE code = 'HQ-02' OR name ILIKE '%canggu%' 
  LIMIT 1;

  -- 2. Dapatkan ID Mata Uang IDR dan USD
  SELECT id INTO v_idr_id FROM public.currencies WHERE code = 'IDR' LIMIT 1;
  SELECT id INTO v_usd_id FROM public.currencies WHERE code = 'USD' LIMIT 1;

  IF v_canggu_id IS NULL THEN
    RAISE EXCEPTION 'Cabang Canggu (HQ-02) tidak ditemukan';
  END IF;

  -- 3. Cari ID Transaksi AMVC1-20260902-001 dan AMVC1-20260902-002
  SELECT id INTO v_tx_id1 
  FROM public.transactions 
  WHERE branch_id = v_canggu_id AND (transaction_no = 'AMVC1-20260902-001' OR transaction_no ILIKE '%20260902-001%')
  LIMIT 1;

  SELECT id INTO v_tx_id2 
  FROM public.transactions 
  WHERE branch_id = v_canggu_id AND (transaction_no = 'AMVC1-20260902-002' OR transaction_no ILIKE '%20260902-002%')
  LIMIT 1;

  -- 4. Hapus mutasi kas terkait transaksi AMVC1-20260902-001 & AMVC1-20260902-002
  DELETE FROM public.cash_movements
  WHERE branch_id = v_canggu_id
    AND (
      (v_tx_id1 IS NOT NULL AND reference_id = v_tx_id1)
      OR (v_tx_id2 IS NOT NULL AND reference_id = v_tx_id2)
      OR reference_no IN ('AMVC1-20260902-001', 'AMVC1-20260902-002')
      OR notes ILIKE '%AMVC1-20260902-001%'
      OR notes ILIKE '%AMVC1-20260902-002%'
    );

  -- 5. Hapus data transaksi dari tabel transactions
  IF v_tx_id1 IS NOT NULL THEN
    DELETE FROM public.transactions WHERE id = v_tx_id1;
  END IF;
  IF v_tx_id2 IS NOT NULL THEN
    DELETE FROM public.transactions WHERE id = v_tx_id2;
  END IF;
  DELETE FROM public.transactions 
  WHERE branch_id = v_canggu_id 
    AND (transaction_no ILIKE '%20260902-001%' OR transaction_no ILIKE '%20260902-002%');

  -- 6. Hapus mutasi kas dobel Setoran Kas [SHIFT-45bad5c5] Modal awal shif pagi (+62.490.000)
  DELETE FROM public.cash_movements
  WHERE branch_id = v_canggu_id
    AND (
      notes ILIKE '%45bad5c5%'
      OR (notes ILIKE '%Modal awal shif pagi%' AND amount = 62490000 AND created_at::text LIKE '2026-09-02%')
    );

  -- 7. Reset dan Sinkronkan Saldo Kas di cash_balances untuk Cabang Canggu
  -- IDR = Rp 62.490.000 (Hanya dari Transfer Masuk Kantor Pusat)
  INSERT INTO public.cash_balances (branch_id, currency_id, balance, updated_at)
  VALUES (v_canggu_id, v_idr_id, 62490000, now())
  ON CONFLICT (branch_id, currency_id)
  DO UPDATE SET balance = 62490000, updated_at = now();

  -- USD = 0 (Karena transaksi beli 350 & 450 USD dihapus)
  IF v_usd_id IS NOT NULL THEN
    INSERT INTO public.cash_balances (branch_id, currency_id, balance, updated_at)
    VALUES (v_canggu_id, v_usd_id, 0, now())
    ON CONFLICT (branch_id, currency_id)
    DO UPDATE SET balance = 0, updated_at = now();
  END IF;

  -- 8. Update saldo_setelah (balance_after) pada mutasi Transfer Masuk terakhir di Canggu
  UPDATE public.cash_movements
  SET balance_after = 62490000
  WHERE branch_id = v_canggu_id 
    AND currency_id = v_idr_id
    AND (movement_type = 'transfer_in' OR notes ILIKE '%Terima modal dari Kantor Pusat%');

  RAISE NOTICE 'Selesai: 5 data transaksi & mutasi di Canggu telah dihapus. Saldo IDR Canggu kini Rp 62.490.000 dan USD 0.';
END $$;
