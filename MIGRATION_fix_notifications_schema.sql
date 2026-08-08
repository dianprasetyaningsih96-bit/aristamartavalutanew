-- Perbaikan skema tabel notifications untuk mendukung kolom 'type'
-- Hal ini mengatasi error "column 'type' of relation 'notifications' does not exist" 
-- yang terjadi saat proses transfer otomatis valas antar cabang.

DO $$ 
BEGIN
    -- Tambahkan kolom type jika belum ada
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE public.notifications ADD COLUMN type text;
    END IF;

    -- Tambahkan kolom branch_id untuk notifikasi berbasis cabang (opsional tapi sering digunakan di trigger)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'branch_id') THEN
        ALTER TABLE public.notifications ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Pastikan grant tetap konsisten setelah perubahan kolom
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
