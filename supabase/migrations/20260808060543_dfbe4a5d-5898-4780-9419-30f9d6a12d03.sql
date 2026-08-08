DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'branch_id') THEN
        ALTER TABLE public.notifications ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
    END IF;
END $$;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;