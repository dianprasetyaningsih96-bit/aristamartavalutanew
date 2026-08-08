-- Initial Sync
INSERT INTO public.dttot_list (
  full_name,
  identity_number,
  address,
  nationality,
  date_of_birth,
  place_of_birth,
  source,
  notes,
  is_active
)
SELECT 
  full_name,
  id_number,
  address,
  nationality,
  date_of_birth::date,
  place_of_birth,
  'Initial Sync',
  COALESCE(blacklist_reason, 'Previously blacklisted'),
  true
FROM public.customers
WHERE is_blacklisted = true
AND NOT EXISTS (
  SELECT 1 FROM public.dttot_list d 
  WHERE lower(d.full_name) = lower(customers.full_name) 
  AND (d.identity_number = customers.id_number OR d.identity_number IS NULL OR customers.id_number IS NULL)
);

-- Trigger definition
CREATE OR REPLACE FUNCTION public.sync_customer_to_dttot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (NEW.is_blacklisted = true AND (TG_OP = 'INSERT' OR OLD.is_blacklisted = false OR OLD.is_blacklisted IS NULL)) THEN
    INSERT INTO public.dttot_list (
      full_name,
      identity_number,
      address,
      nationality,
      date_of_birth,
      place_of_birth,
      source,
      notes,
      is_active
    )
    SELECT 
      NEW.full_name,
      NEW.id_number,
      NEW.address,
      NEW.nationality,
      NEW.date_of_birth::date,
      NEW.place_of_birth,
      'System Sync (Customer)',
      COALESCE(NEW.blacklist_reason, 'Manual blacklist from customer profile'),
      true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.dttot_list 
      WHERE lower(full_name) = lower(NEW.full_name) 
      AND (identity_number = NEW.id_number OR identity_number IS NULL OR NEW.id_number IS NULL)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_to_dttot ON public.customers;
CREATE TRIGGER trg_sync_customer_to_dttot
AFTER INSERT OR UPDATE OF is_blacklisted ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_to_dttot();

CREATE OR REPLACE FUNCTION public.sync_dttot_to_customer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (NEW.is_active = true) THEN
    UPDATE public.customers
    SET 
      is_blacklisted = true,
      blacklist_reason = COALESCE(NEW.source, 'System') || ': ' || COALESCE(NEW.notes, 'Added to DTTOT')
    WHERE lower(full_name) = lower(NEW.full_name)
    AND (id_number = NEW.identity_number OR id_number IS NULL OR NEW.identity_number IS NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_dttot_to_customer ON public.dttot_list;
CREATE TRIGGER trg_sync_dttot_to_customer
AFTER INSERT ON public.dttot_list
FOR EACH ROW EXECUTE FUNCTION public.sync_dttot_to_customer();
