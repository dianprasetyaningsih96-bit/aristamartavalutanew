-- Check if foreign key exists and add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'transactions' 
          AND kcu.column_name = 'teller_id'
    ) THEN
        ALTER TABLE public.transactions 
        ADD CONSTRAINT transactions_teller_id_fkey 
        FOREIGN KEY (teller_id) REFERENCES public.profiles(id);
        
        -- Explicitly grant select so PostgREST can see the relationship
        GRANT SELECT ON public.profiles TO authenticated;
        GRANT SELECT ON public.transactions TO authenticated;
    END IF;
END $$;