# Cetak Struk Langsung ke Printer

## Jawaban singkat

Browser tidak mengizinkan aplikasi web mencetak benar-benar "senyap" (tanpa dialog apa pun) — itu blokir keamanan bawaan Chrome/Edge/Firefox, tidak bisa dilewati dari kode aplikasi. Yang bisa dilakukan:

1. Menghilangkan langkah "buka tab PDF lalu klik print" — struk langsung memunculkan dialog print printer (1 klik saja: Print).
2. Benar-benar tanpa dialog: hanya mungkin kalau browser kasir dijalankan dengan mode kiosk-printing (pengaturan di komputer kasir, bukan di aplikasi).

## Yang akan dibangun

### 1. Cetak satu-klik (default baru)
Saat teller klik "Cetak Struk":
- PDF struk dibuat seperti sekarang (layout 76 x 297 mm, Courier, tidak berubah).
- PDF dimuat ke iframe tersembunyi di halaman, lalu dialog print langsung terbuka otomatis.
- Tidak ada lagi tab baru berisi preview PDF; teller tinggal tekan Print/Enter.
- Fallback otomatis: jika iframe diblokir browser, kembali ke perilaku lama (buka tab / unduh file) supaya struk tetap bisa dicetak.

### 2. Mode "tanpa dialog" (opsional, via kiosk printing)
Ditambahkan catatan panduan di halaman Pengaturan (khusus super admin):
- Cara menjalankan Chrome dengan `--kiosk-printing` dan menetapkan printer dot-matrix sebagai printer default.
- Dengan mode itu, alur di poin 1 akan mencetak otomatis tanpa dialog sama sekali.
Aplikasi tidak bisa mengaktifkan ini sendiri — harus diset di komputer kasir.

## Detail teknis

- `src/lib/pdf.ts`: tambah fungsi `printPdf(doc, filename)` — `doc.output("bloburl")`, iframe hidden, `onload` -> `contentWindow.print()`, revoke URL setelah selesai; fallback ke `openPdf` bila gagal.
- `src/lib/pdf-receipt.ts`: ganti `openPdf(...)` di akhir `generateReceiptPdf` menjadi `printPdf(...)`.
- Laporan PDF (LKUB/LTKM) tetap memakai `openPdf` (tetap preview), karena itu dokumen untuk dibaca/disimpan.
- Alur transaksi, data struk, dan kewajiban cetak struk tidak diubah.
