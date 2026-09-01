-- ==============================================================================
-- 1. Buka Izin RLS Policy tabel branch_transfers
-- ==============================================================================
ALTER TABLE public.branch_transfers ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.branch_transfers TO authenticated;
GRANT ALL ON public.branch_transfers TO service_role;

DROP POLICY IF EXISTS "Users can view transfers from their branch or if they are admin/owner" ON public.branch_transfers;
DROP POLICY IF EXISTS "Users can view transfers relevant to them" ON public.branch_transfers;
DROP POLICY IF EXISTS "Tellers can create transfers for their branch" ON public.branch_transfers;
DROP POLICY IF EXISTS "Admins/Owners/Managers can process transfers" ON public.branch_transfers;
DROP POLICY IF EXISTS "Auth read branch_transfers" ON public.branch_transfers;
DROP POLICY IF EXISTS "Auth insert branch_transfers" ON public.branch_transfers;
DROP POLICY IF EXISTS "Auth update branch_transfers" ON public.branch_transfers;

CREATE POLICY "Auth read branch_transfers"
ON public.branch_transfers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Auth insert branch_transfers"
ON public.branch_transfers FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Auth update branch_transfers"
ON public.branch_transfers FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 2. Update fungsi persetujuan transfer 2 arah (Cabang <-> Kantor Pusat)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.process_branch_transfer(transfer_id uuid, p_status text, p_notes text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_transfer RECORD;
    v_head_office_id uuid;
    v_operator_id uuid;
    v_source_name text;
    v_source_code text;
    v_target_name text;
    v_target_code text;
BEGIN
    v_operator_id := auth.uid();

    -- Ambil detail transfer
    SELECT * INTO v_transfer FROM public.branch_transfers WHERE id = transfer_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer tidak ditemukan (ID: %)', transfer_id;
    END IF;

    IF v_transfer.status != 'pending' THEN
        RAISE EXCEPTION 'Transfer sudah diproses (Status: %)', v_transfer.status;
    END IF;

    -- Tentukan Kantor Pusat secara eksplisit
    SELECT id INTO v_head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
    IF v_head_office_id IS NULL THEN
        SELECT id INTO v_head_office_id FROM public.branches WHERE name ILIKE '%Pusat%' OR name ILIKE '%Jimbaran%' LIMIT 1;
    END IF;
    IF v_head_office_id IS NULL THEN
        SELECT id INTO v_head_office_id FROM public.branches ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- Pastikan target_branch_id terisi jika sebelumnya null (default ke Kantor Pusat)
    IF v_transfer.target_branch_id IS NULL THEN
        v_transfer.target_branch_id := v_head_office_id;
    END IF;

    -- Update status transfer
    UPDATE public.branch_transfers
    SET status = p_status,
        processed_at = now(),
        processed_by = v_operator_id,
        target_branch_id = v_transfer.target_branch_id,
        notes = COALESCE(NULLIF(p_notes, ''), notes)
    WHERE id = transfer_id;

    SELECT name, code INTO v_source_name, v_source_code FROM public.branches WHERE id = v_transfer.branch_id;
    SELECT name, code INTO v_target_name, v_target_code FROM public.branches WHERE id = v_transfer.target_branch_id;
    
    -- Jika diterima (accepted), lakukan mutasi kas
    IF p_status = 'accepted' THEN
        -- Kasus A: Setoran kas/valas tutup shif dari cabang ke Pusat
        IF v_transfer.target_branch_id = v_head_office_id AND v_transfer.branch_id != v_head_office_id THEN
            -- Mutasi keluar di cabang pengirim
            INSERT INTO public.cash_movements (
                branch_id, created_by, currency_id, amount, movement_type,
                reference_id, notes, reference_no
            ) VALUES (
                v_transfer.branch_id, v_operator_id, v_transfer.currency_id, -v_transfer.amount, 'transfer_out',
                transfer_id,
                'Transfer sisa kas/valas ke ' || COALESCE(v_target_name, 'Kantor Pusat'),
                'TRF-' || COALESCE(v_target_code, 'HQ')
            );

            -- Mutasi masuk di Kantor Pusat
            INSERT INTO public.cash_movements (
                branch_id, created_by, currency_id, amount, movement_type,
                reference_id, notes, reference_no
            ) VALUES (
                v_head_office_id, v_operator_id, v_transfer.currency_id, v_transfer.amount, 'transfer_in',
                transfer_id,
                'Terima transfer dari ' || COALESCE(v_source_name, 'Cabang'),
                'TRF-' || COALESCE(v_source_code, 'CAB')
            );

        -- Kasus B: Pengiriman / Permintaan modal dari Kantor Pusat ke Cabang
        ELSE
            -- Update opening_capital pada tabel shifts jika transfer ini terkait pembukaan shif
            IF v_transfer.shift_id IS NOT NULL THEN
                UPDATE public.shifts
                SET opening_capital = v_transfer.amount
                WHERE id = v_transfer.shift_id;
            END IF;

            -- Mutasi keluar di Kantor Pusat (asal)
            INSERT INTO public.cash_movements (
                branch_id, created_by, currency_id, amount, movement_type,
                reference_id, notes, reference_no
            ) VALUES (
                v_transfer.branch_id, v_operator_id, v_transfer.currency_id, -v_transfer.amount, 'transfer_out',
                transfer_id,
                'Kirim modal ke ' || COALESCE(v_target_name, 'Cabang'),
                'TRF-' || COALESCE(v_target_code, 'CAB')
            );

            -- Mutasi masuk di Cabang Penerima
            INSERT INTO public.cash_movements (
                branch_id, created_by, currency_id, amount, movement_type,
                reference_id, notes, reference_no
            ) VALUES (
                v_transfer.target_branch_id, v_operator_id, v_transfer.currency_id, v_transfer.amount, 'transfer_in',
                transfer_id,
                'Terima modal dari ' || COALESCE(v_source_name, 'Kantor Pusat'),
                'TRF-' || COALESCE(v_source_code, 'HQ')
            );
        END IF;
    END IF;
END;
$function$;
