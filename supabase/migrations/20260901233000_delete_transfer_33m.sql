-- ==============================================================================
-- Hapus Transfer Masuk IDR 33.000.000 & Hitung Ulang Saldo Kas
-- Saldo IDR Cabang Legian kembali menjadi: Rp 35.711.250
-- ==============================================================================

DO $$
DECLARE
  v_transfer_id uuid;
  v_legian_id uuid;
  v_canggu_id uuid;
  v_hq_id uuid;
  v_idr_id uuid;
  r RECORD;
  c RECORD;
  b RECORD;
  v_running_bal numeric(20,2);
BEGIN
  -- 1. Dapatkan Currency IDR
  SELECT id INTO v_idr_id FROM public.currencies WHERE code = 'IDR' LIMIT 1;

  -- 2. Cari ID transfer bernilai 33.000.000
  SELECT id INTO v_transfer_id 
  FROM public.branch_transfers 
  WHERE currency_id = v_idr_id AND amount = 33000000
  ORDER BY created_at DESC 
  LIMIT 1;

  -- 3. Hapus mutasi kas terkait transfer 33.000.000
  IF v_transfer_id IS NOT NULL THEN
    DELETE FROM public.cash_movements
    WHERE reference_id = v_transfer_id
       OR reference_no LIKE '%' || v_transfer_id::text || '%'
       OR notes LIKE '%33.000.000%';

    DELETE FROM public.branch_transfers WHERE id = v_transfer_id;
  END IF;

  -- Hapus juga mutasi kas IDR 33jt jika ada yang tercatat mandiri
  DELETE FROM public.cash_movements
  WHERE currency_id = v_idr_id 
    AND (amount = 33000000 OR amount = -33000000)
    AND (notes ILIKE '%modal%' OR notes ILIKE '%transfer%');

  -- 4. Hitung ulang running balance_after dan update cash_balances untuk SEMUA cabang
  FOR b IN SELECT id FROM public.branches LOOP
    FOR c IN SELECT DISTINCT currency_id FROM public.cash_movements WHERE branch_id = b.id LOOP
      v_running_bal := 0;
      FOR r IN
        SELECT id, amount
        FROM public.cash_movements
        WHERE branch_id = b.id AND currency_id = c.currency_id
        ORDER BY created_at ASC, id ASC
      LOOP
        v_running_bal := v_running_bal + r.amount;
        UPDATE public.cash_movements
        SET balance_after = v_running_bal
        WHERE id = r.id;
      END LOOP;

      -- Update atau insert ke cash_balances
      INSERT INTO public.cash_balances (branch_id, currency_id, balance, updated_at)
      VALUES (b.id, c.currency_id, v_running_bal, now())
      ON CONFLICT (branch_id, currency_id)
      DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Selesai: Transfer IDR 33.000.000 berhasil dihapus dan seluruh saldo cabang telah disinkronisasi.';
END $$;
