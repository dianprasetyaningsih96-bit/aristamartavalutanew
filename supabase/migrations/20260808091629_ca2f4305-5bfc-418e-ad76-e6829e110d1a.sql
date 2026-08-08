-- Ensure notification_category and notification_severity enums are up to date and can be used in the trigger
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('super_admin', 'owner', 'manager', 'teller', 'auditor');
    END IF;
END $$;

-- Drop redundant triggers if they exist to avoid duplicate notifications
DROP TRIGGER IF EXISTS tr_notify_head_office_on_transfer ON public.branch_transfers;
DROP TRIGGER IF EXISTS tr_notify_on_transfer ON public.branch_transfers;
DROP TRIGGER IF EXISTS trigger_notify_head_office_transfer ON public.branch_transfers;

-- Update the notification function to be more robust
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
    
    -- If no explicit HQ is set, we might have an issue, but we'll proceed if we can find one
    IF v_hq_id IS NULL THEN
        -- Fallback to the branch that JIMBARAN belongs to if marked by name (last resort)
        SELECT id INTO v_hq_id FROM public.branches WHERE name ILIKE '%JIMBARAN%' LIMIT 1;
    END IF;

    -- Get names for the message
    SELECT name INTO v_branch_name FROM public.branches WHERE id = NEW.branch_id;
    SELECT code INTO v_currency_code FROM public.currencies WHERE id = NEW.currency_id;

    -- Insert notification for HQ staff
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
        ARRAY['super_admin', 'owner', 'manager', 'teller']::public.app_role[],
        v_hq_id,
        'incoming_transfer'
    );

    RETURN NEW;
END;
$function$;

-- Re-attach the trigger cleanly
CREATE TRIGGER tr_notify_on_branch_transfer
AFTER INSERT ON public.branch_transfers
FOR EACH ROW
EXECUTE FUNCTION public.notify_head_office_on_transfer();

-- Ensure RLS allows Super Admin and HQ staff to see these notifications
-- First, drop if existing to redefine
DROP POLICY IF EXISTS "Users can view relevant notifications" ON public.notifications;

CREATE POLICY "Users can view relevant notifications" 
ON public.notifications 
FOR SELECT 
TO authenticated 
USING (
    -- User's specific notifications
    user_id = auth.uid() 
    OR 
    -- Role-based notifications (Super Admin sees all)
    public.has_role(auth.uid(), 'super_admin')
    OR
    (
        -- Roles overlap AND (it's global OR it matches the user's branch)
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

-- Ensure profiles table has branch_id correctly set
-- Ensure branch jimbaran is indeed HQ
UPDATE public.branches SET is_head_office = TRUE WHERE name ILIKE '%Jimbaran%' AND is_head_office = FALSE;
