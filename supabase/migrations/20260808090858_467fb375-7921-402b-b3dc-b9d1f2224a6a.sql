DO $$
DECLARE
    v_branch_id uuid;
    v_ho_branch_id uuid;
    v_currency_id uuid;
    v_transfer_id uuid;
    v_count int;
BEGIN
    -- Setup Data
    SELECT id INTO v_ho_branch_id FROM public.branches WHERE is_head_office = true LIMIT 1;
    SELECT id INTO v_branch_id FROM public.branches WHERE id != v_ho_branch_id LIMIT 1;
    SELECT id INTO v_currency_id FROM public.currencies LIMIT 1;

    -- Execute Trigger
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

    -- Verify Result
    SELECT count(*) INTO v_count FROM public.notifications 
    WHERE reference_id = v_transfer_id AND reference_table = 'branch_transfers';

    IF v_count = 0 THEN
        RAISE EXCEPTION 'Diagnostic Failed: No notification created for branch transfer.';
    END IF;

    RAISE NOTICE 'Diagnostic Success: Notification created for branch transfer.';
    
    -- Cleanup
    DELETE FROM public.notifications WHERE reference_id = v_transfer_id;
    DELETE FROM public.branch_transfers WHERE id = v_transfer_id;
END $$;