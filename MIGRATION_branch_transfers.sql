-- 1. Tambahkan kolom is_hq ke branches
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_hq BOOLEAN DEFAULT false;

-- 2. Jadikan cabang Jimbaran sebagai Kantor Pusat (HQ)
-- Kita asumsikan ada cabang dengan nama 'Jimbaran'. Jika belum ada, query ini tidak akan me-update apa pun.
UPDATE public.branches 
SET is_hq = true, name = 'Kantor Pusat' 
WHERE name ILIKE '%Jimbaran%' OR code = 'HQ-JIMBARAN';

-- 3. Tambahkan tabel branch_transfers untuk mencatat pengiriman valas antar cabang
CREATE TABLE IF NOT EXISTS public.branch_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_branch_id UUID REFERENCES public.branches(id) NOT NULL,
    to_branch_id UUID REFERENCES public.branches(id) NOT NULL,
    currency_id UUID REFERENCES public.currencies(id) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL CHECK (amount > 0),
    sender_id UUID REFERENCES auth.users(id),
    receiver_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    shift_id UUID REFERENCES public.shifts(id), -- shif saat transfer dikirim
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grant privileges
GRANT SELECT, INSERT, UPDATE ON public.branch_transfers TO authenticated;
GRANT ALL ON public.branch_transfers TO service_role;

-- Enable RLS
ALTER TABLE public.branch_transfers ENABLE ROW LEVEL SECURITY;

-- Policies for branch_transfers
CREATE POLICY "Users can view transfers related to their branch" 
ON public.branch_transfers FOR SELECT TO authenticated
USING (
  from_branch_id IN (SELECT branch_id FROM public.profiles WHERE id = auth.uid()) OR 
  to_branch_id IN (SELECT branch_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
);

CREATE POLICY "Users can insert transfers from their branch" 
ON public.branch_transfers FOR INSERT TO authenticated
WITH CHECK (
  from_branch_id IN (SELECT branch_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
);

CREATE POLICY "Users can update transfers they receive or send" 
ON public.branch_transfers FOR UPDATE TO authenticated
USING (
  to_branch_id IN (SELECT branch_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
);

-- 4. Tambahkan trigger untuk update cash_balances saat transfer diterima/ditolak
-- Jika diterima: kurangi saldo asal (sudah dikurangi saat pending? tidak, lebih baik kurangi saat accepted)
-- Sebenarnya lebih aman: kurangi saldo asal saat 'pending' (masuk ke transit), lalu pindah ke tujuan saat 'accepted'.
-- Tapi permintaan user: "jika diterima maka akan masuk ke saldo kantor pusat, jika ditolak maka akan masuk kembali ke saldo cabang tersebut".
-- Jadi alurnya:
-- Pending: kurangi saldo cabang pengirim.
-- Accepted: tambah saldo cabang penerima.
-- Rejected: tambah (kembalikan) saldo cabang pengirim.

CREATE OR REPLACE FUNCTION public.handle_branch_transfer_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Saat baru dibuat (pending)
    IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
        INSERT INTO public.cash_movements (branch_id, currency_id, amount, movement_type, reference_id, notes)
        VALUES (NEW.from_branch_id, NEW.currency_id, -NEW.amount, 'adjustment', NEW.id, 'Transfer ke Kantor Pusat (Pending)');
    END IF;

    -- Saat diupdate statusnya
    IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status != 'pending') THEN
        IF (NEW.status = 'accepted') THEN
            -- Tambah saldo penerima
            INSERT INTO public.cash_movements (branch_id, currency_id, amount, movement_type, reference_id, notes)
            VALUES (NEW.to_branch_id, NEW.currency_id, NEW.amount, 'adjustment', NEW.id, 'Terima transfer dari cabang');
        ELSIF (NEW.status = 'rejected') THEN
            -- Kembalikan saldo pengirim
            INSERT INTO public.cash_movements (branch_id, currency_id, amount, movement_type, reference_id, notes)
            VALUES (NEW.from_branch_id, NEW.currency_id, NEW.amount, 'adjustment', NEW.id, 'Transfer ditolak (Kembali ke saldo)');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_branch_transfer_status_change
AFTER INSERT OR UPDATE ON public.branch_transfers
FOR EACH ROW EXECUTE FUNCTION public.handle_branch_transfer_status();

-- 5. Tambahkan notifikasi otomatis saat ada transfer baru
CREATE OR REPLACE FUNCTION public.notify_branch_transfer()
RETURNS TRIGGER AS $$
DECLARE
    hq_users UUID[];
    user_id UUID;
BEGIN
    -- Ambil semua user di cabang tujuan (Kantor Pusat)
    SELECT array_agg(id) INTO hq_users FROM public.profiles WHERE branch_id = NEW.to_branch_id;
    
    IF hq_users IS NOT NULL THEN
        FOREACH user_id IN ARRAY hq_users LOOP
            INSERT INTO public.notifications (user_id, title, message, type, reference_id)
            VALUES (user_id, 'Transfer Masuk', 'Ada kiriman valas baru dari cabang.', 'info', NEW.id);
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_branch_transfer_created
AFTER INSERT ON public.branch_transfers
FOR EACH ROW EXECUTE FUNCTION public.notify_branch_transfer();
