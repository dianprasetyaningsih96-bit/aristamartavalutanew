-- ==============================================================================
-- Set Saldo IDR Cabang Canggu Menjadi Tepat Rp 59.498.500
-- ==============================================================================

DO $$
DECLARE
  v_canggu_id uuid;
  v_idr_id uuid;
  v_latest_mv_id uuid;
BEGIN
  -- 1. Dapatkan ID Cabang Canggu & IDR
  SELECT id INTO v_canggu_id FROM public.branches
  WHERE name ILIKE '%canggu%' OR code ILIKE '%HQ-02%'
  LIMIT 1;

  SELECT id INTO v_idr_id FROM public.currencies WHERE code = 'IDR' LIMIT 1;

  -- 2. Update saldo kas di cash_balances menjadi tepat Rp 59.498.500
  UPDATE public.cash_balances
  SET balance = 59498500, updated_at = now()
  WHERE branch_id = v_canggu_id AND currency_id = v_idr_id;

  -- 3. Update balance_after pada mutasi kas IDR terakhir di Canggu agar sinkron
  SELECT id INTO v_latest_mv_id
  FROM public.cash_movements
  WHERE branch_id = v_canggu_id AND currency_id = v_idr_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF v_latest_mv_id IS NOT NULL THEN
    UPDATE public.cash_movements
    SET balance_after = 59498500
    WHERE id = v_latest_mv_id;
  END IF;

  RAISE NOTICE 'Selesai: Saldo Rupiah Cabang Canggu telah di-set menjadi Rp 59.498.500.';
END $$;
