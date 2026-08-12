-- Force reload schema cache by creating and dropping a dummy relationship or checking current one
-- PostgREST often needs a kick to see new Foreign Keys
SELECT 1;

-- Ensure the relationship is clearly defined and indexed
DO $$
BEGIN
    -- Drop if exists to ensure a clean state
    ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_teller_id_fkey;
    
    -- Add the foreign key again
    ALTER TABLE public.transactions 
    ADD CONSTRAINT transactions_teller_id_fkey 
    FOREIGN KEY (teller_id) REFERENCES public.profiles(id);

    -- Ensure explicit grants on both tables
    GRANT SELECT ON public.profiles TO authenticated;
    GRANT SELECT ON public.transactions TO authenticated;
    GRANT SELECT ON public.profiles TO anon;
    GRANT SELECT ON public.transactions TO anon;
END $$;