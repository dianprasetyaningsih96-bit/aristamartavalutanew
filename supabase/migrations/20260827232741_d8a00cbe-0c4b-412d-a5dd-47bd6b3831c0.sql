CREATE OR REPLACE FUNCTION public.admin_delete_transaction(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
  v_prefix text;
  v_mv RECORD;
  r RECORD;
  i int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Hanya Super Admin yang dapat menghapus transaksi';
  END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = _transaction_id;
  IF v_tx.id IS NULL THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  -- Kembalikan saldo kas & hapus mutasi yang berasal dari transaksi ini
  FOR v_mv IN
    SELECT * FROM public.cash_movements
    WHERE reference_table = 'transactions' AND reference_id = _transaction_id
  LOOP
    UPDATE public.cash_balances
      SET balance = balance - v_mv.amount
      WHERE branch_id = v_mv.branch_id AND currency_id = v_mv.currency_id;
    DELETE FROM public.cash_movements WHERE id = v_mv.id;
  END LOOP;

  v_prefix := substring(v_tx.transaction_no from 1 for length(v_tx.transaction_no) - 4);

  DELETE FROM public.transactions WHERE id = _transaction_id;

  -- Penomoran ulang dua tahap agar tidak bentrok
  UPDATE public.transactions
    SET transaction_no = 'TMP-' || id::text
    WHERE transaction_no LIKE v_prefix || '%';

  FOR r IN
    SELECT id FROM public.transactions
    WHERE transaction_no LIKE 'TMP-%'
    ORDER BY transaction_date ASC, created_at ASC
  LOOP
    i := i + 1;
    UPDATE public.transactions
      SET transaction_no = v_prefix || lpad(i::text, 4, '0')
      WHERE id = r.id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_transaction(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_delete_transaction(uuid) TO authenticated;