-- 1. Ensure columns exist (Idempotent)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='branches' AND column_name='is_head_office') THEN
        ALTER TABLE public.branches ADD COLUMN is_head_office BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Set Jimbaran as Head Office
UPDATE public.branches 
SET is_head_office = TRUE 
WHERE name ILIKE '%Jimbaran%';

-- 2. Create branch_transfers table (Idempotent)
CREATE TABLE IF NOT EXISTS public.branch_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) NOT NULL,
    currency_id UUID REFERENCES public.currencies(id) NOT NULL,
    amount DECIMAL(24, 8) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    shift_id UUID REFERENCES public.shifts(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    notes TEXT
);

-- RLS for branch_transfers
ALTER TABLE public.branch_transfers ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.branch_transfers TO authenticated;
GRANT ALL ON public.branch_transfers TO service_role;

-- Policies (Drop first to avoid duplication errors)
DROP POLICY IF EXISTS "Users can view transfers from their branch or if they are admin/owner" ON public.branch_transfers;
CREATE POLICY "Users can view transfers from their branch or if they are admin/owner" 
ON public.branch_transfers FOR SELECT TO authenticated
USING (
    branch_id IN (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
    OR public.has_role(auth.uid(), 'branch_manager'::public.app_role)
);

DROP POLICY IF EXISTS "Tellers can create transfers for their branch" ON public.branch_transfers;
CREATE POLICY "Tellers can create transfers for their branch"
ON public.branch_transfers FOR INSERT TO authenticated
WITH CHECK (
    branch_id IN (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins/Owners/Managers can process transfers" ON public.branch_transfers;
CREATE POLICY "Admins/Owners/Managers can process transfers"
ON public.branch_transfers FOR UPDATE TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
    OR (
        public.has_role(auth.uid(), 'branch_manager'::public.app_role) 
        AND (SELECT is_head_office FROM public.branches WHERE id = (SELECT p.branch_id FROM public.profiles p WHERE p.id = auth.uid()))
    )
);

-- 3. Trigger for notifications
CREATE OR REPLACE FUNCTION public.notify_head_office_on_transfer()
RETURNS TRIGGER AS $$
DECLARE
    head_office_id UUID;
    branch_name TEXT;
    curr_code TEXT;
BEGIN
    SELECT id INTO head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
    SELECT name INTO branch_name FROM public.branches WHERE id = NEW.branch_id;
    SELECT code INTO curr_code FROM public.currencies WHERE id = NEW.currency_id;

    IF head_office_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, branch_id)
        SELECT 
            p.id, 
            'Transfer Valas Masuk', 
            'Cabang ' || branch_name || ' mengirim ' || NEW.amount || ' ' || curr_code,
            'info',
            head_office_id
        FROM public.profiles p
        JOIN public.user_roles ur ON p.id = ur.user_id
        WHERE p.branch_id = head_office_id
          AND ur.role IN ('super_admin', 'owner', 'branch_manager');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_head_office_transfer ON public.branch_transfers;
CREATE TRIGGER trigger_notify_head_office_transfer
AFTER INSERT ON public.branch_transfers
FOR EACH ROW EXECUTE FUNCTION public.notify_head_office_on_transfer();

-- 4. RPC for processing transfers
CREATE OR REPLACE FUNCTION public.process_branch_transfer(transfer_id UUID, p_status TEXT, p_notes TEXT)
RETURNS VOID AS $$
DECLARE
    t_row public.branch_transfers%ROWTYPE;
    head_office_id UUID;
BEGIN
    SELECT * INTO t_row FROM public.branch_transfers WHERE id = transfer_id;
    IF t_row.id IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
    IF t_row.status != 'pending' THEN RAISE EXCEPTION 'Transfer already processed'; END IF;
    
    SELECT id INTO head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;

    IF p_status = 'accepted' THEN
        -- Movement: Transfer Out from Branch
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, movement_type, reference_no, notes)
        VALUES (t_row.branch_id, t_row.currency_id, -t_row.amount, 'transfer_out', t_row.id::text, 'Transfer ke Kantor Pusat diterima');

        -- Movement: Transfer In to Head Office
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, movement_type, reference_no, notes)
        VALUES (head_office_id, t_row.currency_id, t_row.amount, 'transfer_in', t_row.id::text, 'Terima transfer dari cabang');

    ELSIF p_status = 'rejected' THEN
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

    UPDATE public.branch_transfers 
    SET status = p_status, 
        processed_at = now(), 
        processed_by = auth.uid(),
        notes = p_notes
    WHERE id = transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
