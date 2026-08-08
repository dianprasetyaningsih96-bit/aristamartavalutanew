-- Fix invalid enum value error by updating the trigger to use the correct enum labels
CREATE OR REPLACE FUNCTION public.notify_head_office_on_transfer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_hq_id uuid;
    v_branch_name text;
    v_currency_code text;
BEGIN
    -- Get Head Office ID
    SELECT id INTO v_hq_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
    
    -- Fallback if no HQ marked
    IF v_hq_id IS NULL THEN
        SELECT id INTO v_hq_id FROM public.branches WHERE name ILIKE '%JIMBARAN%' LIMIT 1;
    END IF;

    -- Get names for the message
    SELECT name INTO v_branch_name FROM public.branches WHERE id = NEW.branch_id;
    SELECT code INTO v_currency_code FROM public.currencies WHERE id = NEW.currency_id;

    -- Insert notification for HQ staff
    -- Standardizing on 'branch_manager' instead of 'manager'
    INSERT INTO public.notifications (
        category, 
        severity, 
        title, 
        message, 
        link, 
        reference_table, 
        reference_id, 
        target_roles,
        branch_id,
        type
    )
    VALUES (
        'approval_request'::notification_category, 
        'warning'::notification_severity,
        'Transfer Masuk dari Cabang',
        'Cabang ' || COALESCE(v_branch_name, 'Unknown') || 
        ' mengirimkan ' || COALESCE(v_currency_code, '???') || ' ' || TRIM(TO_CHAR(NEW.amount, '999,999,999,999')),
        '/approvals', 
        'branch_transfers', 
        NEW.id,
        ARRAY['super_admin', 'owner', 'branch_manager', 'teller']::public.app_role[],
        v_hq_id,
        'incoming_transfer'
    );

    RETURN NEW;
END;
$function$;

-- Ensure RLS policy is updated to use correct role checks
DROP POLICY IF EXISTS "Users can view relevant notifications" ON public.notifications;
CREATE POLICY "Users can view relevant notifications" 
ON public.notifications 
FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR 
    public.has_role(auth.uid(), 'super_admin')
    OR
    (
        target_roles && (
            SELECT ARRAY_AGG(role)::public.app_role[] 
            FROM public.user_roles 
            WHERE user_id = auth.uid()
        )
        AND 
        (
            branch_id IS NULL 
            OR 
            branch_id IN (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
        )
    )
);
