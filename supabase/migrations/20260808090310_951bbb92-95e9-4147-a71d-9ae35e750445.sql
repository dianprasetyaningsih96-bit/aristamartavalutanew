DO $$
DECLARE
    v_branch_id uuid;
    v_ho_branch_id uuid;
    v_currency_id uuid;
    v_transfer_id uuid;
    v_count int;
BEGIN
    -- 1. Setup Data
    SELECT id INTO v_ho_branch_id FROM public.branches WHERE is_head_office = true LIMIT 1;
    IF v_ho_branch_id IS NULL THEN
        INSERT INTO public.branches (name, code, is_head_office) 
        VALUES ('HQ Jimbaran', 'HQ01', true) RETURNING id INTO v_ho_branch_id;
    END IF;

    SELECT id INTO v_branch_id FROM public.branches WHERE id != v_ho_branch_id LIMIT 1;
    IF v_branch_id IS NULL THEN
        INSERT INTO public.branches (name, code, is_head_office) 
        VALUES ('Test Branch', 'TB01', false) RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_currency_id FROM public.currencies LIMIT 1;
    IF v_currency_id IS NULL THEN
        INSERT INTO public.currencies (code, name, symbol) 
        VALUES ('USD', 'US Dollar', '$') RETURNING id INTO v_currency_id;
    END IF;

    -- 2. Execute Trigger
    INSERT INTO public.branch_transfers (
        branch_id, 
        target_branch_id, 
        currency_id, 
        amount, 
        status
    ) VALUES (
        v_branch_id,
        v_ho_branch_id,
        v_currency_id,
        1000,
        'pending'
    ) RETURNING id INTO v_transfer_id;

    -- 3. Verify Result
    SELECT count(*) INTO v_count FROM public.notifications 
    WHERE reference_id = v_transfer_id AND reference_table = 'branch_transfers';

    IF v_count = 0 THEN
        RAISE EXCEPTION 'Diagnostic Failed: No notification created.';
    END IF;

    SELECT count(*) INTO v_count FROM public.notifications 
    WHERE reference_id = v_transfer_id 
    AND (title IS NULL OR message IS NULL OR category IS NULL OR severity IS NULL);
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'Diagnostic Failed: Required notification fields are NULL.';
    END IF;
    
    RAISE NOTICE 'Diagnostic Success: Notification trigger is functional.';
    
    -- 4. Cleanup
    DELETE FROM public.notifications WHERE reference_id = v_transfer_id;
    DELETE FROM public.branch_transfers WHERE id = v_transfer_id;
END $$;