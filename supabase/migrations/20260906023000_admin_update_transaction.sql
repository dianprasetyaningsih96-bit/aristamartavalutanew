-- ==============================================================================
-- Migration: Admin Update Transaction (Multi-Currency Support & Renumbering)
-- ==============================================================================

-- 1. Helper function to preview transaction number when date changes
CREATE OR REPLACE FUNCTION public.preview_transaction_no(
  _transaction_id uuid,
  _new_date timestamptz
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx record;
  v_date_str text;
  v_prefix text;
  v_seq int := 1;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = _transaction_id;
  IF NOT FOUND THEN
    RETURN '';
  END IF;

  -- Prefix: AMV[branch_letter][type_num]-YYYYMMDD-
  v_date_str := to_char(timezone('Asia/Makassar', COALESCE(_new_date, v_tx.transaction_date)), 'YYYYMMDD');
  v_prefix := substring(v_tx.transaction_no from 1 for 6) || v_date_str || '-';

  -- Hitung posisi urutan jika transaksi ini dimasukkan pada tanggal & jam baru
  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.transactions
  WHERE id <> _transaction_id
    AND transaction_no LIKE v_prefix || '%'
    AND transaction_date <= _new_date;

  RETURN v_prefix || lpad(v_seq::text, 3, '0');
END;
$$;

-- 2. Function to update transaction with multi-currency items, cash re-balance & renumbering
CREATE OR REPLACE FUNCTION public.admin_update_transaction(
  _transaction_id uuid,
  _customer_id uuid,
  _payment_method text,
  _notes text,
  _transaction_date timestamptz,
  _items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx record;
  v_item record;
  v_mv record;
  v_total_idr numeric := 0;
  v_first_curr uuid;
  v_first_foreign numeric;
  v_first_rate numeric;
  v_old_prefix text;
  v_new_prefix text;
  v_date_str text;
  idr_id uuid;
  v_new_idr numeric;
  r record;
  i int := 0;
  v_res jsonb;
BEGIN
  -- 1. Verifikasi Super Admin
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Akses ditolak. Hanya Super Admin yang dapat mengubah transaksi.';
  END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = _transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan.';
  END IF;

  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Minimal harus ada 1 mata uang dalam transaksi.';
  END IF;

  -- 2. Hitung total IDR dan ambil baris pertama untuk header
  FOR v_item IN SELECT * FROM jsonb_to_recordset(_items) AS x(
    currency_id uuid, foreign_amount numeric, rate numeric, idr_amount numeric
  )
  LOOP
    v_total_idr := v_total_idr + v_item.idr_amount;
  END LOOP;

  SELECT 
    (_items->0->>'currency_id')::uuid,
    (_items->0->>'foreign_amount')::numeric,
    (_items->0->>'rate')::numeric
  INTO v_first_curr, v_first_foreign, v_first_rate;

  -- 3. Kembalikan mutasi kas lama & kurangi dari cash_balances
  IF v_tx.branch_id IS NOT NULL AND v_tx.status = 'completed' THEN
    FOR v_mv IN 
      SELECT * FROM public.cash_movements 
      WHERE reference_id = _transaction_id
    LOOP
      UPDATE public.cash_balances
        SET balance = balance - v_mv.amount,
            updated_at = now()
        WHERE branch_id = v_mv.branch_id AND currency_id = v_mv.currency_id;

      DELETE FROM public.cash_movements WHERE id = v_mv.id;
    END LOOP;
  END IF;

  -- 4. Hapus item lama di transaction_items
  DELETE FROM public.transaction_items WHERE transaction_id = _transaction_id;

  -- 5. Ambil prefix lama dan tentukan prefix baru
  v_old_prefix := substring(v_tx.transaction_no from 1 for length(v_tx.transaction_no) - 3);
  v_date_str := to_char(timezone('Asia/Makassar', COALESCE(_transaction_date, v_tx.transaction_date)), 'YYYYMMDD');
  v_new_prefix := substring(v_tx.transaction_no from 1 for 6) || v_date_str || '-';

  -- 6. Update header transaksi
  UPDATE public.transactions SET
    customer_id = _customer_id,
    payment_method = COALESCE(_payment_method, 'cash')::public.payment_method,
    notes = _notes,
    transaction_date = COALESCE(_transaction_date, transaction_date),
    currency_id = v_first_curr,
    foreign_amount = v_first_foreign,
    rate = v_first_rate,
    idr_amount = v_total_idr,
    updated_at = now()
  WHERE id = _transaction_id;

  -- 7. Insert items baru ke transaction_items
  -- Trigger transaction_items_post_cash akan otomatis memasukkan mutasi valas ke cash_movements & cash_balances
  FOR v_item IN SELECT * FROM jsonb_to_recordset(_items) AS x(
    currency_id uuid, foreign_amount numeric, rate numeric, idr_amount numeric
  )
  LOOP
    INSERT INTO public.transaction_items (
      transaction_id, currency_id, foreign_amount, rate, idr_amount, created_at
    ) VALUES (
      _transaction_id, v_item.currency_id, v_item.foreign_amount, v_item.rate, v_item.idr_amount, COALESCE(_transaction_date, v_tx.transaction_date)
    );
  END LOOP;

  -- 8. Masukkan mutasi IDR baru ke cash_movements & cash_balances
  IF v_tx.branch_id IS NOT NULL AND v_tx.status = 'completed' THEN
    SELECT id INTO idr_id FROM public.currencies WHERE code = 'IDR' LIMIT 1;
    IF idr_id IS NOT NULL THEN
      IF v_tx.transaction_type = 'buy' THEN
        v_new_idr := -v_total_idr;
      ELSE
        v_new_idr := v_total_idr;
      END IF;

      INSERT INTO public.cash_movements (
        branch_id, currency_id, movement_type, amount,
        reference_id, reference_no, notes, created_by, created_at
      ) VALUES (
        v_tx.branch_id, idr_id,
        v_tx.transaction_type::text::public.cash_movement_type,
        v_new_idr, _transaction_id, v_tx.transaction_no,
        'Auto dari transaksi (IDR)', v_tx.teller_id, COALESCE(_transaction_date, v_tx.transaction_date)
      );
    END IF;
  END IF;

  -- 9. Penomoran ulang untuk v_new_prefix (agar berurutan berdasarkan transaction_date, created_at)
  UPDATE public.transactions
    SET transaction_no = 'TMP-' || id::text
    WHERE (transaction_no LIKE v_new_prefix || '%' OR id = _transaction_id);

  i := 0;
  FOR r IN
    SELECT id FROM public.transactions
    WHERE transaction_no LIKE 'TMP-%'
    ORDER BY transaction_date ASC, created_at ASC
  LOOP
    i := i + 1;
    UPDATE public.transactions
      SET transaction_no = v_new_prefix || lpad(i::text, 3, '0')
      WHERE id = r.id;

    UPDATE public.cash_movements
      SET reference_no = v_new_prefix || lpad(i::text, 3, '0')
      WHERE reference_id = r.id;
  END LOOP;

  -- 10. Jika tanggal berubah (v_old_prefix <> v_new_prefix), renumber juga prefix lama agar tidak ada nomor bolong
  IF v_old_prefix <> v_new_prefix THEN
    UPDATE public.transactions
      SET transaction_no = 'TMP-OLD-' || id::text
      WHERE transaction_no LIKE v_old_prefix || '%';

    i := 0;
    FOR r IN
      SELECT id FROM public.transactions
      WHERE transaction_no LIKE 'TMP-OLD-%'
      ORDER BY transaction_date ASC, created_at ASC
    LOOP
      i := i + 1;
      UPDATE public.transactions
        SET transaction_no = v_old_prefix || lpad(i::text, 3, '0')
        WHERE id = r.id;

      UPDATE public.cash_movements
        SET reference_no = v_old_prefix || lpad(i::text, 3, '0')
        WHERE reference_id = r.id;
    END LOOP;
  END IF;

  -- 11. Ambil kembali data transaksi yang sudah ter-update
  SELECT to_jsonb(t) INTO v_res FROM (
    SELECT 
      tr.*,
      (SELECT json_build_object('code', c.code, 'name', c.name) FROM public.currencies c WHERE c.id = tr.currency_id) as currencies,
      (SELECT json_build_object('code', b.code, 'name', b.name, 'address', b.address, 'city', b.city, 'phone', b.phone) FROM public.branches b WHERE b.id = tr.branch_id) as branches,
      (SELECT json_build_object('customer_code', cust.customer_code, 'full_name', cust.full_name, 'nationality', cust.nationality, 'occupation', cust.occupation, 'date_of_birth', cust.date_of_birth, 'place_of_birth', cust.place_of_birth) FROM public.customers cust WHERE cust.id = tr.customer_id) as customers,
      (SELECT json_build_object('full_name', p.full_name) FROM public.profiles p WHERE p.id = tr.teller_id) as profiles,
      (
        SELECT json_agg(json_build_object(
          'id', ti.id,
          'currency_id', ti.currency_id,
          'foreign_amount', ti.foreign_amount,
          'rate', ti.rate,
          'idr_amount', ti.idr_amount,
          'currencies', json_build_object('code', cur.code, 'name', cur.name)
        ) ORDER BY ti.created_at ASC)
        FROM public.transaction_items ti
        JOIN public.currencies cur ON cur.id = ti.currency_id
        WHERE ti.transaction_id = tr.id
      ) as transaction_items
    FROM public.transactions tr
    WHERE tr.id = _transaction_id
  ) t;

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_transaction(uuid, uuid, text, text, timestamptz, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_transaction_no(uuid, timestamptz) TO authenticated;
