# Rencana Implementasi: Riwayat Perubahan Kurs

Permintaan: Membuat halaman riwayat perubahan kurs (log) yang mencatat waktu (jam, menit, detik) dan tanggal perubahan untuk setiap user/role.

## Perubahan Database
1.  **Tabel Log Perubahan Kurs (`exchange_rate_logs`)**:
    *   `id`: UUID (Primary Key)
    *   `rate_id`: UUID (FK ke `exchange_rates`)
    *   `currency_code`: Text (Redundan untuk kemudahan baca)
    *   `branch_name`: Text (Redundan untuk kemudahan baca)
    *   `old_buy_rate`: Numeric
    *   `new_buy_rate`: Numeric
    *   `old_sell_rate`: Numeric
    *   `new_sell_rate`: Numeric
    *   `changed_by`: UUID (FK ke `profiles`)
    *   `changed_at`: Timestamp with time zone (Default `now()`)
    *   `action_type`: Text (INSERT/UPDATE/DELETE)

2.  **Trigger Otomatis**:
    *   Membuat fungsi trigger untuk mencatat setiap perubahan data di tabel `exchange_rates` ke dalam `exchange_rate_logs`.

## Perubahan Frontend
1.  **Halaman Baru (`src/routes/_authenticated/rates-history.tsx`)**:
    *   Menampilkan tabel riwayat perubahan.
    *   Kolom: Waktu (Jam:Menit:Detik), Tanggal, Mata Uang, Cabang, Kurs Lama (Beli/Jual), Kurs Baru (Beli/Jual), dan Petugas (User).
    *   Filter berdasarkan mata uang, cabang, dan rentang tanggal.
2.  **Navigasi Sidebar**:
    *   Menambahkan menu "Riwayat Kurs" di bawah menu "Kurs Valuta".

## Detail Teknis
*   Audit log akan menggunakan `auth.uid()` melalui trigger untuk mencatat siapa yang melakukan perubahan.
*   Format waktu menggunakan standar Indonesia (WITA sesuai preferensi aplikasi).
*   Akses halaman diberikan kepada `super_admin`, `owner`, `branch_manager`, dan `auditor`.
