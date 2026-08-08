CREATE OR REPLACE FUNCTION public.notify_head_office_on_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hq_id uuid;
    v_branch_name text;
    v_currency_code text;
BEGIN
    -- Get Head Office ID
    SELECT id INTO v_hq_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
    
    -- Get names for the message
    SELECT name INTO v_branch_name FROM public.branches WHERE id = NEW.branch_id;
    SELECT code INTO v_currency_code FROM public.currencies WHERE id = NEW.currency_id;

    -- Ensure category is NOT NULL and cast target_roles to app_role[]
    -- Note: The error was likely due to category casting or missing fields in older schema
    INSERT INTO public.notifications (
        category, 
        severity, 
        title, 
        message, 
        link, 
        reference_table, 
        reference_id, 
        target_roles,
        branch_id
    )
    VALUES (
        'approval_request'::notification_category, 
        'warning'::notification_severity,
        'Transfer Masuk dari Cabang',
        'Cabang ' || COALESCE(v_branch_name, 'Unknown') || 
        ' mengirimkan ' || COALESCE(v_currency_code, '???') || ' ' || NEW.amount,
        '/approvals', 
        'branch_transfers', 
        NEW.id,
        ARRAY['super_admin', 'owner', 'branch_manager', 'teller']::public.app_role[],
        v_hq_id
    );

    RETURN NEW;
END;
$$;

-- Re-grant on notifications table just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
