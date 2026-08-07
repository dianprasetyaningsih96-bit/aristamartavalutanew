DO $$
BEGIN
    -- Ensure Jimbaran is Head Office
    IF EXISTS (SELECT 1 FROM public.branches WHERE name ILIKE '%Jimbaran%') THEN
        UPDATE public.branches SET is_head_office = TRUE WHERE name ILIKE '%Jimbaran%';
    ELSE
        -- Fallback: mark first active branch if Jimbaran not found
        UPDATE public.branches SET is_head_office = TRUE 
        WHERE id = (SELECT id FROM public.branches WHERE is_active = TRUE LIMIT 1);
    END IF;
END $$;