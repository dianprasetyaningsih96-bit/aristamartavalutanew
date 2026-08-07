CREATE OR REPLACE FUNCTION public.process_branch_transfer(transfer_id UUID, p_status TEXT, p_notes TEXT)
RETURNS VOID AS $$
DECLARE
    t_row public.branch_transfers%ROWTYPE;
    head_office_id UUID;
BEGIN
    SELECT * INTO t_row FROM public.branch_transfers WHERE id = transfer_id;
    IF t_row.id IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
    IF t_row.status != 'pending' THEN RAISE EXCEPTION 'Transfer already processed'; END IF;
    
    -- Ambil ID Kantor Pusat
    SELECT id INTO head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
    IF head_office_id IS NULL THEN RAISE EXCEPTION 'Head office not found. Please mark a branch as head office first.'; END IF;

    IF p_status = 'accepted' THEN
        -- Movement: Transfer Out dari Cabang Pengirim
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, movement_type, reference_no, notes)
        VALUES (t_row.branch_id, t_row.currency_id, -t_row.amount, 'transfer_out', t_row.id::text, 'Transfer ke Kantor Pusat diterima');

        -- Movement: Transfer In ke Kantor Pusat (menggunakan head_office_id yang valid)
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, movement_type, reference_no, notes)
        VALUES (head_office_id, t_row.currency_id, t_row.amount, 'transfer_in', t_row.id::text, 'Terima transfer dari cabang');

    ELSIF p_status = 'rejected' THEN
        INSERT INTO public.notifications (user_id, title, message, type, branch_id, category, severity)
        SELECT 
            p.id, 
            'Transfer Ditolak', 
            'Transfer ' || t_row.amount || ' ditolak oleh Kantor Pusat: ' || COALESCE(p_notes, ''),
            'warning',
            t_row.branch_id,
            'approval_decision',
            'warning'
        FROM public.profiles p
        WHERE p.branch_id = t_row.branch_id;
    END IF;

    UPDATE public.branch_transfers 
    SET status = p_status, 
        processed_at = now(), 
        processed_by = auth.uid(),
        notes = p_notes
    WHERE id = transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;