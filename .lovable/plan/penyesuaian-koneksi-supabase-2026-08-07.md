# Penyesuaian Koneksi Supabase

## Hasil pemeriksaan

- Aplikasi (browser) **sudah terhubung** ke project `vbmdlqwplfomtzrhafrc`. Koneksi diuji langsung ke Data API dengan publishable key yang Anda berikan dan berhasil (HTTP 200), tabel `branches` terbaca.
- Kunci dan URL yang Anda sebutkan sudah persis sama dengan yang dipakai di `src/integrations/supabase/client.ts` dan di halaman manajemen user.
- Tidak ada kode sisi server (server function) yang memakai koneksi lain, jadi seluruh operasi data memang berjalan di project tersebut.

Satu hal yang tidak cocok: konfigurasi bawaan platform (file `.env` dan `supabase/config.toml`) masih menunjuk ke project backend bawaan Lovable Cloud. File-file itu dikelola otomatis oleh platform dan tidak boleh diubah manual, tetapi karena aplikasi tidak membacanya, hal ini tidak memengaruhi jalannya sistem.

## Yang akan dikerjakan

1. Membuat satu sumber konfigurasi tunggal untuk URL dan publishable key project `vbmdlqwplfomtzrhafrc`, lalu memakainya di `client.ts` dan di halaman Manajemen User, sehingga tidak ada lagi nilai yang ditulis ganda di dua tempat.
2. Menghapus teks nyasar di halaman depan ("saya ingin mengubah koneksi ke supabase ke project ID ini ...") yang sebelumnya masuk ke tampilan publik.
3. Menambahkan pemeriksaan koneksi ringan di halaman Pengaturan (khusus Super Admin): menampilkan project yang sedang dipakai dan status koneksi (berhasil / gagal), supaya ke depan bisa dicek sendiri tanpa perlu buka kode.

## Catatan teknis

- Konstanta koneksi diletakkan di satu modul kecil (mis. `src/integrations/supabase/config.ts`); `client.ts` dan `users.tsx` mengimpor dari sana.
- Publishable key aman berada di kode klien; tidak ada service role key yang dipakai di sisi browser.
- `.env`, `supabase/config.toml`, dan berkas hasil generate di `src/integrations/supabase/` (selain penambahan modul konfigurasi) tidak disentuh.
