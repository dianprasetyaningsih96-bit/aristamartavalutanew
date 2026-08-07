
CREATE OR REPLACE FUNCTION public.process_branch_transfer(transfer_id uuid, p_status text, p_notes text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
 AS $function$
 DECLARE
     v_transfer RECORD;
     v_head_office_id uuid;
     v_operator_id uuid;
     v_operator_branch_id uuid;
     v_branch_name text;
     v_curr_code text;
     v_is_super_admin boolean;
 BEGIN
     v_operator_id := auth.uid();
     
     -- Cek role super_admin
     SELECT EXISTS (
         SELECT 1 FROM public.user_roles 
         WHERE user_id = v_operator_id AND role = 'super_admin'
     ) INTO v_is_super_admin;
 
     -- Ambil branch_id operator
     SELECT branch_id INTO v_operator_branch_id FROM public.profiles WHERE id = v_operator_id;
 
     -- Ambil detail transfer
     SELECT * INTO v_transfer FROM public.branch_transfers WHERE id = transfer_id FOR UPDATE;
 
     IF NOT FOUND THEN
         RAISE EXCEPTION 'Transfer tidak ditemukan (ID: %)', transfer_id;
     END IF;
 
     IF v_transfer.status != 'pending' THEN
         RAISE EXCEPTION 'Transfer sudah diproses (Status: %)', v_transfer.status;
     END IF;
 
     -- Tentukan Kantor Pusat secara eksplisit
     SELECT id INTO v_head_office_id FROM public.branches WHERE is_head_office = TRUE LIMIT 1;
 
     -- Fallback 1: Cari cabang bernama Jimbaran
     IF v_head_office_id IS NULL THEN
         SELECT id INTO v_head_office_id FROM public.branches WHERE name ILIKE '%Jimbaran%' LIMIT 1;
     END IF;
 
     -- Fallback 2: Gunakan cabang pertama yang ada jika masih NULL
     IF v_head_office_id IS NULL THEN
         SELECT id INTO v_head_office_id FROM public.branches ORDER BY created_at ASC LIMIT 1;
     END IF;
 
     -- Jika masih NULL, berarti tabel branches benar-benar kosong atau ada masalah serius
     IF v_head_office_id IS NULL THEN
         RAISE EXCEPTION 'Konfigurasi Kantor Pusat tidak ditemukan. Pastikan minimal ada satu cabang terdaftar.';
     END IF;
 
     -- Validasi Otoritas: Super Admin bisa apa saja, role lain harus di Kantor Pusat
     IF NOT v_is_super_admin THEN
         IF v_operator_branch_id IS NULL OR v_operator_branch_id != v_head_office_id THEN
             RAISE EXCEPTION 'Hanya petugas di Kantor Pusat yang dapat menyetujui transfer ini.';
         END IF;
     END IF;
 
     -- Update status transfer
     UPDATE public.branch_transfers
     SET status = p_status,
         processed_at = now(),
         processed_by = v_operator_id,
         target_branch_id = v_head_office_id,
         notes = p_notes
     WHERE id = transfer_id;
 
     SELECT name INTO v_branch_name FROM public.branches WHERE id = v_transfer.branch_id;
     
     -- Jika diterima, lakukan mutasi saldo
     IF p_status = 'accepted' THEN
         -- 1. Tambah saldo ke Kantor Pusat
         INSERT INTO public.cash_balances (branch_id, currency_id, balance)
         VALUES (v_head_office_id, v_transfer.currency_id, v_transfer.amount)
         ON CONFLICT (branch_id, currency_id)
         DO UPDATE SET balance = cash_balances.balance + EXCLUDED.balance;
 
         -- 2. Catat mutasi masuk di Kantor Pusat
         INSERT INTO public.cash_movements (
             branch_id, created_by, currency_id, amount, movement_type,
             reference_table, reference_id, notes, reference_no
         ) VALUES (
             v_head_office_id, v_operator_id, v_transfer.currency_id, v_transfer.amount, 'transfer_in',
             'branch_transfers', transfer_id,
             'Terima transfer dari ' || COALESCE(v_branch_name, 'Cabang'),
             transfer_id::text
         );
     END IF;
 
 END;
 $function$;
