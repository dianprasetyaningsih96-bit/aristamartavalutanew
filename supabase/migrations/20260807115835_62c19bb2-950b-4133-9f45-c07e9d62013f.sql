-- MIGRATION: Ensure Branch Transfers table has target_branch_id and Head Office is correctly flagged

-- 1. Ensure columns exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_transfers' AND column_name = 'target_branch_id') THEN
        ALTER TABLE public.branch_transfers ADD COLUMN target_branch_id UUID REFERENCES public.branches(id);
    END IF;
END $$;

-- 2. Identify Head Office (Jimbaran) and update flags if needed
-- We assume the user wants Jimbaran as HQ
UPDATE public.branches SET is_head_office = FALSE;
UPDATE public.branches SET is_head_office = TRUE WHERE name ILIKE '%Jimbaran%';

-- 3. Update existing branch_transfers to set target_branch_id if null
UPDATE public.branch_transfers bt
SET target_branch_id = (SELECT id FROM public.branches WHERE is_head_office = TRUE LIMIT 1)
WHERE target_branch_id IS NULL;

-- 4. Re-create the RPC function with complete robustness
DROP FUNCTION IF EXISTS public.process_branch_transfer(uuid, text, text);

CREATE OR REPLACE FUNCTION public.process_branch_transfer(
    transfer_id uuid, 
    p_status text, 
    p_notes text DEFAULT ''::text
)
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

    -- 4. Determine Target Branch (Kantor Pusat)
    v_head_office_id := v_transfer.target_branch_id;

    -- Fallback: Use the current Head Office if record target is null
    IF v_head_office_id IS NULL THEN
        SELECT id INTO v_head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
        
        -- Extreme fallback if no branch is marked as head office
        IF v_head_office_id IS NULL THEN
            SELECT id INTO v_head_office_id FROM public.branches WHERE name ILIKE '%Jimbaran%' LIMIT 1;
        END IF;

        IF v_head_office_id IS NULL THEN
            RAISE EXCEPTION 'Konfigurasi Kantor Pusat tidak ditemukan. Pastikan ada satu cabang yang ditandai sebagai Kantor Pusat.';
        END IF;
    END IF;

    -- 5. Authority Validation
    -- Rules:
    -- - Super Admin can ALWAYS process.
    -- - Regular users (Teller/Manager) must belong to the TARGET branch (Head Office).
    IF NOT v_is_super_admin THEN
        IF v_operator_branch_id IS NULL OR v_operator_branch_id != v_head_office_id THEN
            RAISE EXCEPTION 'Anda tidak memiliki otoritas untuk memproses transfer ini. Hanya staf Kantor Pusat yang dapat menyetujui transfer masuk.';
        END IF;
    END IF;

    -- 6. Update Status
    UPDATE public.branch_transfers SET 
        status = p_status, 
        notes = p_notes, 
        processed_at = now(), 
        processed_by = v_operator_id,
        target_branch_id = v_head_office_id -- Ensure target is saved
    WHERE id = transfer_id;

    -- 7. If Accepted, Execute Movements
    IF p_status = 'accepted' THEN
        -- a. Reduce from source branch
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, type, description, reference_id)
        VALUES (v_transfer.branch_id, v_transfer.currency_id, -v_transfer.amount, 'transfer_out', 'Transfer ke Kantor Pusat (Disetujui)', v_transfer.id);

        -- b. Add to target branch (Head Office)
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, type, description, reference_id)
        VALUES (v_head_office_id, v_transfer.currency_id, v_transfer.amount, 'transfer_in', 'Terima Transfer dari Cabang', v_transfer.id);
    END IF;

END;
$function$;
