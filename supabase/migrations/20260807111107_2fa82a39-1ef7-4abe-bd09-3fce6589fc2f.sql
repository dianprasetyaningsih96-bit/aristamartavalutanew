-- Improve branch_transfers table structure to be more robust
ALTER TABLE public.branch_transfers ADD COLUMN IF NOT EXISTS target_branch_id uuid REFERENCES public.branches(id);

-- Update the transfer logic to allow ANY role at the HQ to approve,
-- as long as their assigned branch is the Head Office.

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

    -- SECURITY CHECK: 
    -- 1. Get explicit Head Office
    SELECT id INTO v_head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
    
    -- 2. If no explicit HQ, fallback to Jimbaran if it exists
    IF v_head_office_id IS NULL THEN
        SELECT id INTO v_head_office_id FROM public.branches WHERE name ILIKE '%Jimbaran%' LIMIT 1;
    END IF;

    -- 3. If still no HQ, the logic cannot proceed safely
    IF v_head_office_id IS NULL THEN
        RAISE EXCEPTION 'Konfigurasi Kantor Pusat tidak ditemukan. Tandai satu cabang sebagai Kantor Pusat.';
    END IF;

    -- Allow ANY role at HQ to approve
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

    -- If accepted, move the money
    IF p_status = 'accepted' THEN
        -- Add to Head Office balance
        INSERT INTO public.cash_balances (branch_id, currency_id, balance)
        VALUES (v_head_office_id, v_transfer.currency_id, v_transfer.amount)
        ON CONFLICT (branch_id, currency_id)
        DO UPDATE SET balance = cash_balances.balance + EXCLUDED.balance;

        -- Record movement for Head Office (IN)
        INSERT INTO public.cash_movements (
            branch_id, user_id, currency_id, amount, type, category, 
            reference_table, reference_id, notes
        ) VALUES (
            v_head_office_id, v_operator_id, v_transfer.currency_id, v_transfer.amount, 'in', 'transfer',
            'branch_transfers', transfer_id, 
            'Terima transfer dari ' || (SELECT name FROM branches WHERE id = v_transfer.branch_id)
        );

        -- Deduct from Source Branch balance
        INSERT INTO public.cash_balances (branch_id, currency_id, balance)
        VALUES (v_transfer.branch_id, v_transfer.currency_id, -v_transfer.amount)
        ON CONFLICT (branch_id, currency_id)
        DO UPDATE SET balance = cash_balances.balance + EXCLUDED.balance;

        -- Record movement for Source Branch (OUT)
        INSERT INTO public.cash_movements (
            branch_id, user_id, currency_id, amount, type, category, 
            reference_table, reference_id, notes
        ) VALUES (
            v_transfer.branch_id, v_transfer.user_id, v_transfer.currency_id, v_transfer.amount, 'out', 'transfer',
            'branch_transfers', transfer_id, 
            'Kirim transfer ke Kantor Pusat (Diterima)'
        );
    END IF;

    -- Notify the original sender
    INSERT INTO public.notifications (
        user_id, category, severity, title, message, link, reference_table, reference_id
    ) VALUES (
        v_transfer.user_id, 'approval_decision', 
        CASE WHEN p_status = 'accepted' THEN 'info' ELSE 'critical' END,
        'Transfer ' || CASE WHEN p_status = 'accepted' THEN 'Diterima' ELSE 'Ditolak' END,
        'Transfer ' || (SELECT code FROM currencies WHERE id = v_transfer.currency_id) || ' ' || 
        v_transfer.amount || ' telah ' || CASE WHEN p_status = 'accepted' THEN 'diterima' ELSE 'ditolak' END || '.',
        '/shifts', 'branch_transfers', transfer_id
    );
END;
$$;

-- Ensure all HQ staff get notifications
CREATE OR REPLACE FUNCTION public.notify_head_office_on_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hq_id uuid;
BEGIN
    SELECT id INTO v_hq_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
    
    INSERT INTO public.notifications (
        category, severity, title, message, link, reference_table, reference_id, target_roles
    )
    VALUES (
        'approval_request', 'warning',
        'Transfer Masuk dari Cabang',
        'Cabang ' || (SELECT name FROM branches WHERE id = NEW.branch_id) || 
        ' mengirimkan ' || (SELECT code FROM currencies WHERE id = NEW.currency_id) || ' ' || NEW.amount,
        '/approvals', 'branch_transfers', NEW.id,
        ARRAY['super_admin', 'owner', 'branch_manager', 'teller']::text[]
    );
    RETURN NEW;
END;
$$;

-- Re-attach trigger
DROP TRIGGER IF EXISTS tr_notify_head_office_on_transfer ON public.branch_transfers;
CREATE TRIGGER tr_notify_head_office_on_transfer
AFTER INSERT ON public.branch_transfers
FOR EACH ROW EXECUTE FUNCTION public.notify_head_office_on_transfer();

-- Ensure Jimbaran is HQ if exists
UPDATE public.branches SET is_head_office = TRUE WHERE name ILIKE '%Jimbaran%' AND is_head_office = FALSE;
