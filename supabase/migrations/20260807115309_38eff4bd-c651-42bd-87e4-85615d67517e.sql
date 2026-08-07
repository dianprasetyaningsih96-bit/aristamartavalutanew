
BEGIN;
DROP POLICY IF EXISTS "Users can view transfers from their branch or if they are admin" ON branch_transfers;
CREATE POLICY "Users can view transfers relevant to them" ON branch_transfers
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'owner') OR 
    branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()) OR
    target_branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()) OR
    (
      has_role(auth.uid(), 'teller') AND 
      EXISTS (SELECT 1 FROM branches WHERE id = (SELECT branch_id FROM profiles WHERE id = auth.uid()) AND is_head_office = true)
    )
  );
COMMIT;
