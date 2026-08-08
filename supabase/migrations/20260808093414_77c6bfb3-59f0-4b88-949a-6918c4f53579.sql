CREATE OR REPLACE FUNCTION public.notify_head_office_on_transfer()
RETURNS trigger
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
    
    -- Fallback if no HQ marked (Jimbaran)
    IF v_hq_id IS NULL THEN
        SELECT id INTO v_hq_id FROM public.branches WHERE name ILIKE '%JIMBARAN%' LIMIT 1;
    END IF;

    -- Get names for the message
    SELECT name INTO v_branch_name FROM public.branches WHERE id = NEW.branch_id;
    SELECT code INTO v_currency_code FROM public.currencies WHERE id = NEW.currency_id;

    -- 1. NOTIFICATION FOR HQ STAFF (Teller, Manager, Owner)
    -- This is filtered by v_hq_id
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
        ARRAY['owner', 'branch_manager', 'teller']::public.app_role[],
        v_hq_id,
        'incoming_transfer'
    );

    -- 2. NOTIFICATION FOR SUPER ADMINS (Global)
    -- No branch_id specified so they see it regardless of their profile assignment
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
        'Transfer Masuk (Super Admin)',
        'Ada pengiriman valas baru: ' || COALESCE(v_branch_name, 'Unknown') || 
        ' mengirim ke Pusat (' || COALESCE(v_currency_code, '???') || ' ' || TRIM(TO_CHAR(NEW.amount, '999,999,999,999')) || ')',
        '/approvals',
        'branch_transfers',
        NEW.id,
        ARRAY['super_admin']::public.app_role[],
        NULL, 
        'incoming_transfer'
    );

    RETURN NEW;
END;
$$;
