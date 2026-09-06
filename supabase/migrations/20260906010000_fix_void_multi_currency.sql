-- Migration: Fix void multi-currency transactions so all items are reversed to cash balance

CREATE OR REPLACE FUNCTION public.reverse_transaction_cash_movements()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  idr_id uuid;
  v_item record;
  v_has_items boolean := false;
  v_foreign numeric(20,2);
  v_idr numeric(20,2);
BEGIN
  -- Hanya proses jika ada cabang dan status berubah dari completed ke voided
  IF NEW.branch_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.status = 'completed' AND NEW.status = 'voided' THEN
    SELECT id INTO idr_id FROM public.currencies WHERE code = 'IDR' LIMIT 1;

    -- 1. Balikkan Kas IDR (Total Rupiah Transaksi)
    IF idr_id IS NOT NULL THEN
      IF NEW.transaction_type = 'buy' THEN
        v_idr := NEW.idr_amount;       -- Beli batal: uang kas IDR kembali masuk (+)
      ELSE
        v_idr := -NEW.idr_amount;      -- Jual batal: uang kas IDR ditarik kembali (-)
      END IF;

      INSERT INTO public.cash_movements (
        branch_id, currency_id, movement_type, amount,
        reference_id, reference_no, notes, created_by, created_at
      ) VALUES (
        NEW.branch_id, idr_id, 'adjustment',
        v_idr, NEW.id, NEW.transaction_no,
        'Void transaksi (IDR)', NEW.voided_by, now()
      );
    END IF;

    -- 2. Balikkan Masing-Masing Valuta dari transaction_items (Multi Mata Uang)
    FOR v_item IN 
      SELECT * FROM public.transaction_items 
      WHERE transaction_id = NEW.id
    LOOP
      v_has_items := true;
      IF NEW.transaction_type = 'buy' THEN
        v_foreign := -v_item.foreign_amount; -- Beli batal: valas keluar (-)
      ELSE
        v_foreign := v_item.foreign_amount;  -- Jual batal: valas masuk kembali (+)
      END IF;

      INSERT INTO public.cash_movements (
        branch_id, currency_id, movement_type, amount,
        reference_id, reference_no, notes, created_by, created_at
      ) VALUES (
        NEW.branch_id, v_item.currency_id, 'adjustment',
        v_foreign, NEW.id, NEW.transaction_no,
        'Void transaksi', NEW.voided_by, now()
      );
    END LOOP;

    -- 3. Fallback untuk transaksi lama (jika belum ada baris di transaction_items)
    IF NOT v_has_items AND NEW.currency_id IS NOT NULL THEN
      IF NEW.transaction_type = 'buy' THEN
        v_foreign := -NEW.foreign_amount;
      ELSE
        v_foreign := NEW.foreign_amount;
      END IF;

      INSERT INTO public.cash_movements (
        branch_id, currency_id, movement_type, amount,
        reference_id, reference_no, notes, created_by, created_at
      ) VALUES (
        NEW.branch_id, NEW.currency_id, 'adjustment',
        v_foreign, NEW.id, NEW.transaction_no,
        'Void transaksi', NEW.voided_by, now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_reverse_cash ON public.transactions;
CREATE TRIGGER transactions_reverse_cash
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.reverse_transaction_cash_movements();
