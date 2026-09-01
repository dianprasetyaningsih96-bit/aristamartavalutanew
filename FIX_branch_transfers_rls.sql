-- ==============================================================================
-- Perbaikan RLS Policy pada tabel branch_transfers
-- Mengizinkan teller cabang membuat permohonan modal dan setoran akhir shif
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
