DROP POLICY IF EXISTS "Auth read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Auth update read_by" ON public.notifications;
DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view relevant notifications" ON public.notifications;

-- Re-create a clean, robust policy
CREATE POLICY "Users can view relevant notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'super_admin')
  OR (
    target_roles && (SELECT array_agg(role) FROM public.user_roles WHERE user_id = auth.uid())
    AND (
      branch_id IS NULL 
      OR branch_id IN (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Users can update their own read status"
ON public.notifications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);
