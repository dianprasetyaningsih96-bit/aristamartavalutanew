-- 1. Ensure process_branch_transfer is robust even if branches table is empty or misconfigured
CREATE OR REPLACE FUNCTION public.process_branch_transfer(transfer_id UUID, p_status TEXT, p_notes TEXT)
RETURNS VOID AS $$
DECLARE
    t_row public.branch_transfers%ROWTYPE;
    head_office_id UUID;
BEGIN
    -- Fetch the transfer details
    SELECT * INTO t_row FROM public.branch_transfers WHERE id = transfer_id;
    IF t_row.id IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
    IF t_row.status != 'pending' THEN RAISE EXCEPTION 'Transfer already processed'; END IF;
    
    -- Try to find the Head Office
    SELECT id INTO head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
    
    -- If no Head Office marked, fallback to any branch that is NOT the sender branch
    IF head_office_id IS NULL THEN
        SELECT id INTO head_office_id FROM public.branches WHERE id != t_row.branch_id LIMIT 1;
    END IF;

    -- If STILL NULL (e.g. only one branch exists), we cannot proceed with a transfer between branches
    -- But we must not crash the database. We check if it's accepted.
    IF p_status = 'accepted' AND head_office_id IS NULL THEN
        RAISE EXCEPTION 'Kantor Pusat tidak ditemukan. Pastikan ada cabang lain yang ditandai sebagai Kantor Pusat.';
    END IF;

    IF p_status = 'accepted' THEN
        -- Movement: Transfer Out from Branch
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, movement_type, reference_no, notes)
        VALUES (t_row.branch_id, t_row.currency_id, -t_row.amount, 'transfer_out', t_row.id::text, 'Transfer ke Kantor Pusat diterima');

        -- Movement: Transfer In to Head Office
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, movement_type, reference_no, notes)
        VALUES (head_office_id, t_row.currency_id, t_row.amount, 'transfer_in', t_row.id::text, 'Terima transfer dari cabang');

    ELSIF p_status = 'rejected' THEN
        -- Notification for rejection
        INSERT INTO public.notifications (user_id, title, message, type, branch_id)
        SELECT 
            p.id, 
            'Transfer Ditolak', 
            'Transfer ' || t_row.amount || ' ditolak oleh Kantor Pusat: ' || COALESCE(p_notes, ''),
            'warning',
            t_row.branch_id
        FROM public.profiles p
        WHERE p.branch_id = t_row.branch_id;
    END IF;

    -- Final update of status
    UPDATE public.branch_transfers 
    SET status = p_status, 
        processed_at = now(), 
        processed_by = auth.uid(),
        notes = p_notes
    WHERE id = transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add 'is_head_office' check to branches table if not exists (already exists but just in case)
-- 3. Ensure Jimbaran is marked as Head Office if it exists
UPDATE public.branches 
SET is_head_office = TRUE 
WHERE name ILIKE '%Jimbaran%' OR code = 'HQ-JMB';
