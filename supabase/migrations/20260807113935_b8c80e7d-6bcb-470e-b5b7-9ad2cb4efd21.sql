
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='branch_transfers' AND column_name='target_branch_id') THEN
        ALTER TABLE public.branch_transfers ADD COLUMN target_branch_id uuid REFERENCES public.branches(id);
    END IF;
END $$;
