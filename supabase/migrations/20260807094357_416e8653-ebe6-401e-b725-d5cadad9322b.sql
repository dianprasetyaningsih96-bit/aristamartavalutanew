CREATE OR REPLACE FUNCTION public.notify_head_office_on_transfer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    head_office_id UUID;
    branch_name TEXT;
    curr_code TEXT;
BEGIN
    SELECT id INTO head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
    SELECT name INTO branch_name FROM public.branches WHERE id = NEW.branch_id;
    SELECT code INTO curr_code FROM public.currencies WHERE id = NEW.currency_id;

    IF head_office_id IS NOT NULL THEN
        -- Insert a general notification for the HQ users
        INSERT INTO public.notifications (
            title, 
            message, 
            severity, 
            category,
            target_roles,
            link
        )
        VALUES (
            'Transfer Valas Masuk', 
            'Cabang ' || branch_name || ' mengirim ' || NEW.amount || ' ' || curr_code,
            'info',
            'approval_request',
            ARRAY['super_admin', 'owner', 'branch_manager'],
            '/approvals'
        );
    END IF;
    
    RETURN NEW;
END;
$function$;