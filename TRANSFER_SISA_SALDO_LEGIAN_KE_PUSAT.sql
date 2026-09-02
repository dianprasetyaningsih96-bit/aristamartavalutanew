-- ==============================================================================
-- SQL: Pemindahan Sisa Saldo Kas Kemarin (01/09/2026) dari Legian ke Kantor Pusat
-- Jalankan script ini di Supabase SQL Editor (Project: vbmdlqwplfomtzrhafrc)
-- ==============================================================================

DO $$
DECLARE
    v_legian_id UUID;
    v_hq_id UUID;
    v_idr_id UUID;
    v_amount NUMERIC := 35711250;
    v_legian_current_balance NUMERIC;
    v_hq_current_balance NUMERIC;
    v_transfer_id UUID := gen_random_uuid();
BEGIN
    -- 1. Ambil ID Cabang Legian (HQ-03)
    SELECT id INTO v_legian_id 
    FROM public.branches 
    WHERE code = 'HQ-03' OR name ILIKE '%Legian%' 
    LIMIT 1;

    -- 2. Ambil ID Kantor Pusat / Jimbaran (HQ-01)
    SELECT id INTO v_hq_id 
    FROM public.branches 
    WHERE is_head_office = TRUE OR code = 'HQ-01' OR name ILIKE '%Jimbaran%' OR name ILIKE '%Pusat%'
    LIMIT 1;

    -- 3. Ambil ID Mata Uang IDR
    SELECT id INTO v_idr_id 
    FROM public.currencies 
    WHERE code = 'IDR' 
    LIMIT 1;

    IF v_legian_id IS NULL THEN
        RAISE EXCEPTION 'Cabang Legian (HQ-03) tidak ditemukan';
    END IF;

    IF v_hq_id IS NULL THEN
        RAISE EXCEPTION 'Kantor Pusat / Jimbaran (HQ-01) tidak ditemukan';
    END IF;

    IF v_idr_id IS NULL THEN
        RAISE EXCEPTION 'Mata uang IDR tidak ditemukan';
    END IF;

    -- 4. Update Saldo Kas Legian di cash_balances (Kurangi Rp 35.711.250)
    INSERT INTO public.cash_balances (branch_id, currency_id, balance, updated_at)
    VALUES (v_legian_id, v_idr_id, 0, now())
    ON CONFLICT (branch_id, currency_id) 
    DO UPDATE SET 
        balance = GREATEST(0, cash_balances.balance - v_amount),
        updated_at = now()
    RETURNING balance INTO v_legian_current_balance;

    -- 5. Update Saldo Kas Kantor Pusat / Jimbaran di cash_balances (Tambah Rp 35.711.250)
    INSERT INTO public.cash_balances (branch_id, currency_id, balance, updated_at)
    VALUES (v_hq_id, v_idr_id, v_amount, now())
    ON CONFLICT (branch_id, currency_id) 
    DO UPDATE SET 
        balance = cash_balances.balance + v_amount,
        updated_at = now()
    RETURNING balance INTO v_hq_current_balance;

    -- 6. Catat Mutasi Kas Keluar di Cabang Legian (Audit Trail)
    INSERT INTO public.cash_movements (
        id, branch_id, currency_id, amount, movement_type,
        notes, reference_no, reference_id, balance_after, created_at
    ) VALUES (
        gen_random_uuid(),
        v_legian_id,
        v_idr_id,
        -v_amount,
        'transfer_out',
        'Pemindahan sisa saldo kas kemarin (01/09/2026) ke Kantor Pusat/Jimbaran',
        'TRF-HQ-01',
        v_transfer_id,
        v_legian_current_balance,
        now()
    );

    -- 7. Catat Mutasi Kas Masuk di Kantor Pusat / Jimbaran (Audit Trail)
    INSERT INTO public.cash_movements (
        id, branch_id, currency_id, amount, movement_type,
        notes, reference_no, reference_id, balance_after, created_at
    ) VALUES (
        gen_random_uuid(),
        v_hq_id,
        v_idr_id,
        v_amount,
        'transfer_in',
        'Penerimaan sisa saldo kas kemarin (01/09/2026) dari Cabang Legian (HQ-03)',
        'TRF-HQ-03',
        v_transfer_id,
        v_hq_current_balance,
        now()
    );

    -- 8. Catat Riwayat Transfer Antar Cabang
    INSERT INTO public.branch_transfers (
        id, branch_id, target_branch_id, currency_id, amount, status, notes, created_at, processed_at
    ) VALUES (
        v_transfer_id,
        v_legian_id,
        v_hq_id,
        v_idr_id,
        v_amount,
        'accepted',
        'Pemindahan sisa saldo kas kemarin (01/09/2026) ke Kantor Pusat/Jimbaran',
        now(),
        now()
    );

    RAISE NOTICE 'Berhasil memindahkan Rp % dari Legian ke Kantor Pusat. Saldo Akhir Legian: Rp %, Saldo Akhir Pusat: Rp %',
        v_amount, v_legian_current_balance, v_hq_current_balance;
END $$;
