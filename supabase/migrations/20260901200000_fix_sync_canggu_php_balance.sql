-- ==============================================================================
-- Sinkronisasi Kas Cabang Canggu (PHP & Saldo Sistem Tutup Shif)
-- Sesuaikan saldo PHP agar persis 1.000,00 sesuai transaksi riil
-- ==============================================================================

DO $$
DECLARE
  v_canggu_id uuid;
  v_php_id uuid;
  v_cny_id uuid;
  v_eur_id uuid;
  v_usd_id uuid;
  v_idr_id uuid;
  v_running_bal numeric(20,2);
  r RECORD;
  c RECORD;
BEGIN
  -- 1. Dapatkan ID Cabang Canggu
  SELECT id INTO v_canggu_id FROM public.branches
  WHERE name ILIKE '%canggu%' OR code ILIKE '%HQ-02%'
  LIMIT 1;

  -- 2. Dapatkan ID Valuta
  SELECT id INTO v_php_id FROM public.currencies WHERE code = 'PHP' LIMIT 1;
  SELECT id INTO v_cny_id FROM public.currencies WHERE code = 'CNY' LIMIT 1;
  SELECT id INTO v_eur_id FROM public.currencies WHERE code = 'EUR' LIMIT 1;
  SELECT id INTO v_usd_id FROM public.currencies WHERE code = 'USD' LIMIT 1;
  SELECT id INTO v_idr_id FROM public.currencies WHERE code = 'IDR' LIMIT 1;

  -- 3. Hapus mutasi kas PHP yang tidak memiliki pasangan transaksi aktif
  -- Pertahankan hanya mutasi kas PHP yang terkait dengan transaksi aktif yang ada
  DELETE FROM public.cash_movements
  WHERE branch_id = v_canggu_id
    AND currency_id = v_php_id
    AND reference_table = 'transactions'
    AND reference_id IS NOT NULL
    AND reference_id NOT IN (SELECT id FROM public.transactions WHERE branch_id = v_canggu_id);

  -- Jika masih ada lebih dari 1 mutasi PHP padahal transaksi PHP hanya ada 1 (1.000 PHP):
  -- Hapus mutasi PHP lama, sisakan 1 mutasi PHP sebesar 1.000
  IF (SELECT COUNT(*) FROM public.transactions WHERE branch_id = v_canggu_id AND currency_id = v_php_id) = 1 THEN
    DELETE FROM public.cash_movements
    WHERE branch_id = v_canggu_id
      AND currency_id = v_php_id
      AND id NOT IN (
        SELECT id FROM public.cash_movements
        WHERE branch_id = v_canggu_id AND currency_id = v_php_id
        ORDER BY created_at DESC
        LIMIT 1
      );

    UPDATE public.cash_movements
    SET amount = 1000
    WHERE branch_id = v_canggu_id AND currency_id = v_php_id;
  END IF;

  -- 4. Hitung ulang running balance_after untuk setiap mutasi kas di Cabang Canggu
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

  -- 5. Pastikan saldo PHP di cash_balances adalah tepat 1.000,00
  UPDATE public.cash_balances
  SET balance = 1000, updated_at = now()
  WHERE branch_id = v_canggu_id AND currency_id = v_php_id;

END $$;
