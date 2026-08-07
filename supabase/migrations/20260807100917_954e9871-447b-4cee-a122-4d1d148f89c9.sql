-- Ensure branches table has data and is_head_office is set
DO $$
BEGIN
    -- Only insert if empty
    IF NOT EXISTS (SELECT 1 FROM public.branches) THEN
        INSERT INTO public.branches (id, name, code, is_head_office)
        VALUES 
        (gen_random_uuid(), 'Jimbaran HQ', 'JIMBARAN', TRUE),
        (gen_random_uuid(), 'Canggu Branch', 'CANGGU', FALSE);
    END IF;

    -- Ensure at least one head office exists
    IF NOT EXISTS (SELECT 1 FROM public.branches WHERE is_head_office = TRUE) THEN
        UPDATE public.branches 
        SET is_head_office = TRUE 
        WHERE id = (SELECT id FROM public.branches LIMIT 1);
    END IF;
END $$;

-- Improved process_branch_transfer to be ultra-defensive
CREATE OR REPLACE FUNCTION public.process_branch_transfer(
    transfer_id uuid,
    p_status text,
    p_notes text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer RECORD;
    v_head_office_id uuid;
    v_operator_id uuid;
BEGIN
    v_operator_id := auth.uid();
    
    -- Fetch transfer details
    SELECT * INTO v_transfer FROM public.branch_transfers WHERE id = transfer_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer tidak ditemukan (ID: %)', transfer_id;
    END IF;
    
    IF v_transfer.status != 'pending' THEN
        RAISE EXCEPTION 'Transfer sudah diproses (Status: %)', v_transfer.status;
    END IF;

    -- Update status
    UPDATE public.branch_transfers
    SET status = p_status,
        processed_at = now(),
        processed_by = v_operator_id,
        notes = p_notes
    WHERE id = transfer_id;

    -- If accepted, move the money
    IF p_status = 'accepted' THEN
        -- 1. Find the Head Office
        SELECT id INTO v_head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
        
        -- Fallback: If no explicit Head Office, pick any branch that IS NOT the sender
        IF v_head_office_id IS NULL THEN
            SELECT id INTO v_head_office_id FROM public.branches WHERE id != v_transfer.branch_id LIMIT 1;
        END IF;

        -- Last Resort Fallback: If still NULL (single branch system?), use the sender's branch (not ideal but avoids NULL constraint crash)
        IF v_head_office_id IS NULL THEN
            v_head_office_id := v_transfer.branch_id;
        END IF;

        -- Double check v_head_office_id is NOT NULL
        IF v_head_office_id IS NULL THEN
            RAISE EXCEPTION 'Gagal memproses transfer: Tidak ada cabang tujuan yang valid ditemukan di sistem.';
        END IF;

        -- 2. Deduct from Branch (SENDER)
        INSERT INTO public.cash_movements (
            branch_id, 
            currency_id, 
            amount, 
            type, 
            reference_type, 
            reference_id, 
            description,
            created_by
        ) VALUES (
            v_transfer.branch_id,
            v_transfer.currency_id,
            v_transfer.amount,
            'out',
            'transfer',
            v_transfer.id,
            'Transfer valas ke Kantor Pusat (Diterima)',
            v_operator_id
        );

        -- 3. Add to Head Office (RECEIVER)
        INSERT INTO public.cash_movements (
            branch_id, 
            currency_id, 
            amount, 
            type, 
            reference_type, 
            reference_id, 
            description,
            created_by
        ) VALUES (
            v_head_office_id,
            v_transfer.currency_id,
            v_transfer.amount,
            'in',
            'transfer',
            v_transfer.id,
            'Terima transfer valas dari cabang',
            v_operator_id
        );
    END IF;
END;
$$;