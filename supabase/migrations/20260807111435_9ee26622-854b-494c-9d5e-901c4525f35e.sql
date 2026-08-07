-- Re-sync Head Office
UPDATE public.branches SET is_head_office = TRUE WHERE name ILIKE '%Jimbaran%';

-- Extend movement types if not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'cash_movement_type' AND e.enumlabel = 'transfer_in') THEN
        ALTER TYPE public.cash_movement_type ADD VALUE 'transfer_in';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'cash_movement_type' AND e.enumlabel = 'transfer_out') THEN
        ALTER TYPE public.cash_movement_type ADD VALUE 'transfer_out';
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Fix and Overhaul process_branch_transfer to handle actual schema
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
    v_operator_branch_id uuid;
    v_branch_name text;
    v_curr_code text;
BEGIN
    v_operator_id := auth.uid();
    
    -- Get operator's branch
    SELECT branch_id INTO v_operator_branch_id FROM public.profiles WHERE id = v_operator_id;

    -- Fetch transfer details
    SELECT * INTO v_transfer FROM public.branch_transfers WHERE id = transfer_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer tidak ditemukan (ID: %)', transfer_id;
    END IF;

    IF v_transfer.status != 'pending' THEN
        RAISE EXCEPTION 'Transfer sudah diproses (Status: %)', v_transfer.status;
    END IF;

    -- Get explicit Head Office
    SELECT id INTO v_head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
    
    IF v_head_office_id IS NULL THEN
        SELECT id INTO v_head_office_id FROM public.branches WHERE name ILIKE '%Jimbaran%' LIMIT 1;
    END IF;

    IF v_head_office_id IS NULL THEN
        RAISE EXCEPTION 'Konfigurasi Kantor Pusat tidak ditemukan.';
    END IF;

    -- Check if operator is Super Admin OR is at the Head Office branch
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = v_operator_id AND role = 'super_admin'
    ) AND (v_operator_branch_id IS NULL OR v_operator_branch_id != v_head_office_id) THEN
        RAISE EXCEPTION 'Hanya petugas di Kantor Pusat yang dapat menyetujui transfer ini.';
    END IF;

    -- Update status
    UPDATE public.branch_transfers
    SET status = p_status,
        processed_at = now(),
        processed_by = v_operator_id,
        target_branch_id = v_head_office_id,
        notes = p_notes
    WHERE id = transfer_id;

    SELECT name INTO v_branch_name FROM public.branches WHERE id = v_transfer.branch_id;
    SELECT code INTO v_curr_code FROM public.currencies WHERE id = v_transfer.currency_id;

    -- If accepted, move the money
    IF p_status = 'accepted' THEN
        -- Add to Head Office balance
        INSERT INTO public.cash_balances (branch_id, currency_id, balance)
        VALUES (v_head_office_id, v_transfer.currency_id, v_transfer.amount)
        ON CONFLICT (branch_id, currency_id)
        DO UPDATE SET balance = cash_balances.balance + EXCLUDED.balance;

        -- Record movement for Head Office (IN)
        INSERT INTO public.cash_movements (
            branch_id, created_by, currency_id, amount, movement_type, 
            reference_table, reference_id, notes, reference_no
        ) VALUES (
            v_head_office_id, v_operator_id, v_transfer.currency_id, v_transfer.amount, 'transfer_in',
            'branch_transfers', transfer_id, 
            'Terima transfer dari ' || v_branch_name,
            transfer_id::text
        );

        -- Deduct from Source Branch balance
        INSERT INTO public.cash_balances (branch_id, currency_id, balance)
        VALUES (v_transfer.branch_id, v_transfer.currency_id, -v_transfer.amount)
        ON CONFLICT (branch_id, currency_id)
        DO UPDATE SET balance = cash_balances.balance + EXCLUDED.balance;

        -- Record movement for Source Branch (OUT)
        INSERT INTO public.cash_movements (
            branch_id, created_by, currency_id, amount, movement_type, 
            reference_table, reference_id, notes, reference_no
        ) VALUES (
            v_transfer.branch_id, v_transfer.user_id, v_transfer.currency_id, -v_transfer.amount, 'transfer_out',
            'branch_transfers', transfer_id, 
            'Kirim transfer ke Kantor Pusat (Diterima)',
            transfer_id::text
        );
    END IF;

    -- Notify the original sender
    INSERT INTO public.notifications (
        user_id, title, message, type, branch_id
    ) VALUES (
        v_transfer.user_id,
        'Transfer ' || CASE WHEN p_status = 'accepted' THEN 'Diterima' ELSE 'Ditolak' END,
        'Transfer ' || v_curr_code || ' ' || v_transfer.amount || ' telah ' || 
        CASE WHEN p_status = 'accepted' THEN 'diterima' ELSE 'ditolak' END || '.',
        CASE WHEN p_status = 'accepted' THEN 'info' ELSE 'warning' END,
        v_transfer.branch_id
    );
END;
$$;