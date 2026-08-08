DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE event_object_table = 'branch_transfers' AND trigger_name = 'tr_notify_on_transfer'
    ) THEN
        CREATE TRIGGER tr_notify_on_transfer
        AFTER INSERT ON public.branch_transfers
        FOR EACH ROW
        EXECUTE FUNCTION public.notify_head_office_on_transfer();
    END IF;
END $$;