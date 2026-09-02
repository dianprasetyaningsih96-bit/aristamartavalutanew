-- ==============================================================================
-- SQL: Koreksi Saldo Legian Menjadi Tepat Rp 0
-- Jalankan script ini di Supabase SQL Editor (Project: vbmdlqwplfomtzrhafrc)
-- ==============================================================================

DO $$
DECLARE
    v_legian_id UUID;
    v_hq_id UUID;
    v_idr_id UUID;
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

    -- 4. Set Saldo Kas Legian TEPAT menjadi 0
    UPDATE public.cash_balances
    SET balance = 0, updated_at = now()
    WHERE branch_id = v_legian_id AND currency_id = v_idr_id;

    -- 5. Update balance_after pada mutasi transfer_out terakhir di Legian agar menjadi 0
    UPDATE public.cash_movements
    SET balance_after = 0
    WHERE id = (
        SELECT id FROM public.cash_movements
        WHERE branch_id = v_legian_id AND currency_id = v_idr_id
        ORDER BY created_at DESC, id DESC
        LIMIT 1
    );

    RAISE NOTICE 'Selesai: Saldo Kas Legian (HQ-03) telah dikoreksi menjadi tepat Rp 0.';
END $$;
