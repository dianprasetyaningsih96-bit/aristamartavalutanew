
-- Drop old function first
DROP FUNCTION IF EXISTS public.process_branch_transfer(uuid, text, text);

-- Ensure table structure is correct
DO $$ 
BEGIN
    -- Rename if accidentally misnamed (unlikely but safe check)
    -- Add target_branch_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='branch_transfers' AND column_name='target_branch_id') THEN
        ALTER TABLE public.branch_transfers ADD COLUMN target_branch_id uuid REFERENCES public.branches(id);
    END IF;
END $$;

-- Re-create the function with robustness
CREATE OR REPLACE FUNCTION public.process_branch_transfer(transfer_id uuid, p_status text, p_notes text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
 AS $function$
 DECLARE
     v_transfer RECORD;
     v_head_office_id uuid;
     v_operator_id uuid;
     v_operator_branch_id uuid;
     v_branch_name text;
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
 
     -- 4. Find Head Office explicitly
     SELECT id INTO v_head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
 
     -- Fallbacks for Head Office
     IF v_head_office_id IS NULL THEN
         SELECT id INTO v_head_office_id FROM public.branches WHERE name ILIKE '%Jimbaran%' LIMIT 1;
     END IF;
     IF v_head_office_id IS NULL THEN
         SELECT id INTO v_head_office_id FROM public.branches ORDER BY created_at ASC LIMIT 1;
     END IF;
 
     IF v_head_office_id IS NULL THEN
         RAISE EXCEPTION 'Konfigurasi Kantor Pusat tidak ditemukan. Pastikan minimal ada satu cabang terdaftar.';
     END IF;
 
     -- 5. Authority Validation
     IF NOT v_is_super_admin THEN
         -- Non-super admins must be assigned to the Head Office branch to approve
         IF v_operator_branch_id IS NULL OR v_operator_branch_id != v_head_office_id THEN
             RAISE EXCEPTION 'Hanya petugas di Kantor Pusat yang dapat menyetujui transfer ini.';
         END IF;
     END IF;
 
     -- 6. Update the transfer record
     -- We use dynamic SQL just to bypass any potential cached plan issues with column names
     EXECUTE 'UPDATE public.branch_transfers SET status = $1, processed_at = now(), processed_by = $2, target_branch_id = $3, notes = $4 WHERE id = $5'
     USING p_status, v_operator_id, v_head_office_id, p_notes, transfer_id;
 
     -- 7. Handle successful acceptance
     IF p_status = 'accepted' THEN
         SELECT name INTO v_branch_name FROM public.branches WHERE id = v_transfer.branch_id;
         
         -- 7.1. Increase Head Office balance
         INSERT INTO public.cash_balances (branch_id, currency_id, balance)
         VALUES (v_head_office_id, v_transfer.currency_id, v_transfer.amount)
         ON CONFLICT (branch_id, currency_id)
         DO UPDATE SET balance = cash_balances.balance + EXCLUDED.balance;
 
         -- 7.2. Record incoming movement at Head Office
         INSERT INTO public.cash_movements (
             branch_id, created_by, currency_id, amount, movement_type,
             reference_table, reference_id, notes, reference_no
         ) VALUES (
             v_head_office_id, v_operator_id, v_transfer.currency_id, v_transfer.amount, 'transfer_in',
             'branch_transfers', transfer_id,
             'Terima transfer dari ' || COALESCE(v_branch_name, 'Cabang'),
             transfer_id::text
         );
         
         -- 7.3. Record outgoing movement at source branch (if not already done during initiation)
         -- Note: Initiation usually deducts balance, so we just record the movement if needed.
         -- But initiation already creates a 'transfer_out' movement in some flows.
         -- Let's check if it exists to avoid duplication.
         IF NOT EXISTS (
             SELECT 1 FROM public.cash_movements 
             WHERE reference_table = 'branch_transfers' AND reference_id = transfer_id AND movement_type = 'transfer_out'
         ) THEN
             INSERT INTO public.cash_movements (
                 branch_id, created_by, currency_id, amount, movement_type,
                 reference_table, reference_id, notes, reference_no
             ) VALUES (
                 v_transfer.branch_id, v_operator_id, v_transfer.currency_id, v_transfer.amount, 'transfer_out',
                 'branch_transfers', transfer_id,
                 'Kirim transfer ke Kantor Pusat',
                 transfer_id::text
             );
         END IF;
     END IF;
 
 END;
 $function$;

-- Ensure RLS is updated to support target_branch_id if we want to use it in policies later
-- For now, the existing policies are fine as they rely on branch_id (source).
