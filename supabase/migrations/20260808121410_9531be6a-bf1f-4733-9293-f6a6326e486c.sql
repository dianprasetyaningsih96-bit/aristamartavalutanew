-- Update Customer to DTTOT sync to handle removal
CREATE OR REPLACE FUNCTION public.sync_customer_to_dttot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Case 1: Added to blacklist
  IF (NEW.is_blacklisted = true AND (TG_OP = 'INSERT' OR OLD.is_blacklisted = false OR OLD.is_blacklisted IS NULL)) THEN
    -- Add or reactivate in DTTOT list
    IF EXISTS (
      SELECT 1 FROM public.dttot_list 
      WHERE lower(full_name) = lower(NEW.full_name) 
      AND (identity_number = NEW.id_number OR (identity_number IS NULL AND NEW.id_number IS NULL))
    ) THEN
      UPDATE public.dttot_list
      SET is_active = true,
          notes = COALESCE(NEW.blacklist_reason, notes, 'Manual blacklist from customer profile')
      WHERE lower(full_name) = lower(NEW.full_name) 
      AND (identity_number = NEW.id_number OR (identity_number IS NULL AND NEW.id_number IS NULL));
    ELSE
      INSERT INTO public.dttot_list (
        full_name, identity_number, address, nationality, 
        date_of_birth, place_of_birth, source, notes, is_active
      ) VALUES (
        NEW.full_name, NEW.id_number, NEW.address, NEW.nationality,
        NEW.date_of_birth::date, NEW.place_of_birth, 'System Sync (Customer)',
        COALESCE(NEW.blacklist_reason, 'Manual blacklist from customer profile'), true
      );
    END IF;
  
  -- Case 2: Removed from blacklist
  ELSIF (NEW.is_blacklisted = false AND (OLD.is_blacklisted = true)) THEN
    -- Deactivate in DTTOT list
    UPDATE public.dttot_list
    SET is_active = false,
        notes = notes || ' (Deactivated via Customer Profile update)'
    WHERE lower(full_name) = lower(NEW.full_name) 
    AND (identity_number = NEW.id_number OR (identity_number IS NULL AND NEW.id_number IS NULL));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update DTTOT to Customer sync to handle updates (activation/deactivation)
CREATE OR REPLACE FUNCTION public.sync_dttot_to_customer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (NEW.is_active = true) THEN
    -- Flag customer as blacklisted
    UPDATE public.customers
    SET is_blacklisted = true,
        blacklist_reason = COALESCE(NEW.source, 'System') || ': ' || COALESCE(NEW.notes, 'Added to DTTOT')
    WHERE lower(full_name) = lower(NEW.full_name)
    AND (id_number = NEW.identity_number OR (id_number IS NULL AND NEW.identity_number IS NULL));
  ELSE
    -- Unflag customer if deactivated in DTTOT
    UPDATE public.customers
    SET is_blacklisted = false
    WHERE lower(full_name) = lower(NEW.full_name)
    AND (id_number = NEW.identity_number OR (id_number IS NULL AND NEW.identity_number IS NULL))
    AND is_blacklisted = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure triggers cover updates
DROP TRIGGER IF EXISTS trg_sync_dttot_to_customer ON public.dttot_list;
CREATE TRIGGER trg_sync_dttot_to_customer
AFTER INSERT OR UPDATE OF is_active ON public.dttot_list
FOR EACH ROW EXECUTE FUNCTION public.sync_dttot_to_customer();
