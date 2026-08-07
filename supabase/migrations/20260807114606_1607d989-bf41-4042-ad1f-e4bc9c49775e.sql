CREATE OR REPLACE FUNCTION public.process_branch_transfer(transfer_id uuid, p_status text, p_notes text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_transfer RECORD;
    v_head_office_id uuid;
    v_operator_id uuid;
    v_operator_branch_id uuid;
    v_is_super_admin boolean;
BEGIN
    v_operator_id := auth.uid();

    -- 1. Check if operator is super_admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = v_operator_id AND role = 'super_admin'
    ) INTO v_is_super_admin;

    -- 2. Get operator's branch
    SELECT branch_id INTO v_operator_branch_id FROM public.profiles WHERE id = v_operator_id;

    -- 3. Get transfer details
    SELECT * INTO v_transfer FROM public.branch_transfers WHERE id = transfer_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer tidak ditemukan (ID: %)', transfer_id;
    END IF;

    IF v_transfer.status != 'pending' THEN
        RAISE EXCEPTION 'Transfer sudah diproses (Status: %)', v_transfer.status;
    END IF;

    -- 4. Get Head Office ID from the transfer record itself (target_branch_id)
    v_head_office_id := v_transfer.target_branch_id;

    -- Fallback if target_branch_id is null (older records)
    IF v_head_office_id IS NULL THEN
        SELECT id INTO v_head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
        IF v_head_office_id IS NULL THEN
            SELECT id INTO v_head_office_id FROM public.branches WHERE name ILIKE '%Jimbaran%' LIMIT 1;
        END IF;
    END IF;

    IF v_head_office_id IS NULL THEN
        RAISE EXCEPTION 'Konfigurasi Kantor Pusat tidak ditemukan.';
    END IF;

    -- 5. Authority Validation
    IF NOT v_is_super_admin THEN
        -- Non-super admins must be assigned to the TARGET branch (Head Office) to approve/reject
        IF v_operator_branch_id IS NULL OR v_operator_branch_id != v_head_office_id THEN
            RAISE EXCEPTION 'Anda hanya dapat memproses transfer yang ditujukan ke cabang Anda (Kantor Pusat).';
        END IF;
    END IF;

    -- 6. Update Status
    UPDATE public.branch_transfers SET 
        status = p_status, 
        notes = p_notes, 
        processed_at = now(), 
        processed_by = v_operator_id 
    WHERE id = transfer_id;

    -- 7. If Accepted, Move Cash
    IF p_status = 'accepted' THEN
        -- a. Reduce from source branch (Branch)
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, type, description, reference_id)
        VALUES (v_transfer.branch_id, v_transfer.currency_id, -v_transfer.amount, 'transfer_out', 'Transfer ke Kantor Pusat (Disetujui)', v_transfer.id);

        -- b. Add to target branch (Head Office)
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, type, description, reference_id)
        VALUES (v_head_office_id, v_transfer.currency_id, v_transfer.amount, 'transfer_in', 'Terima Transfer dari Cabang', v_transfer.id);
    END IF;

END;
$function$;