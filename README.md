# Financial Tracker

Pencatat pengeluaran & pemasukan harian — PWA (HTML/CSS/JS polos, tanpa build step), pakai Supabase sebagai backend, dengan scan struk belanja lewat OCR yang jalan langsung di HP (Tesseract.js, tidak ada foto yang dikirim ke server manapun).

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor → New query**, tempel isi [`supabase-schema.sql`](supabase-schema.sql), lalu Run. Ini membuat tabel `categories`, `payment_sources`, `transactions` beserta Row Level Security-nya.
3. Buka **Project Settings → API**, salin **Project URL** dan **anon public key**.
4. Buka [`js/config.js`](js/config.js) dan isi:
   ```js
   window.CATETIN_CONFIG = {
     SUPABASE_URL: 'https://xxxxx.supabase.co',
     SUPABASE_ANON_KEY: 'ey...'
   };
   ```
5. (Opsional tapi disarankan) Di **Authentication → Providers**, matikan "Confirm email" kalau kamu tidak mau buka email tiap kali daftar akun (ini aplikasi single-user, jadi keamanannya cukup dari password saja).

## 2. Menjalankan lokal

Karena pakai service worker (untuk cache offline), buka lewat server lokal — bukan langsung double-click `index.html`:

```bash
npx serve .
```

atau

```bash
python -m http.server 8080
```

Lalu buka `http://localhost:8080` (atau port yang ditampilkan).

## 3. Buat akun pertama

Di layar pertama, klik **"Belum punya akun? Daftar"**, isi email + password. Setelah masuk, tambahkan kategori & akun bank kamu sendiri lewat **Pengaturan → Kelola Kategori / Kelola Akun Bank** — atau uncomment bagian seed data di `supabase-schema.sql` dan jalankan manual di SQL Editor (ganti `YOUR_USER_ID` dengan id kamu, lihat lewat `select id from auth.users;`).

## 4. Deploy ke GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/catetin.git
git push -u origin main
```

Lalu di repo GitHub: **Settings → Pages → Source: Deploy from branch → main / (root)**. GitHub Pages otomatis pakai HTTPS, yang wajib untuk PWA + akses kamera.

## 5. Pasang ke Home Screen & Back Tap (iPhone)

Instruksi yang sama juga ada di dalam app: **Settings → Add to Home Screen & Back Tap**.

1. Buka URL app kamu di Safari.
2. Ketuk tombol **Share** → **Add to Home Screen** → **Add**. Ikon app muncul di layar utama, terbuka full-screen tanpa address bar.
3. **Settings → Accessibility → Touch → Back Tap → Double Tap** → pilih Shortcut yang membuka URL app kamu (buat lewat app Shortcuts: action "Open URL" ke alamat app kamu).
4. Karena layar **Add** adalah landing screen default (bukan Home), ketuk 2x belakang iPhone akan langsung membuka keypad input, siap dipakai dalam ~3 tap.

## 6. (Opsional) Input transaksi lewat iOS Shortcuts, tanpa buka app

Ada jalur lain yang lebih cepat dari Back Tap di atas: Shortcut yang langsung nulis ke database lewat beberapa menu pilihan, nggak buka app sama sekali. Lihat [`SHORTCUTS.md`](SHORTCUTS.md) untuk setup lengkapnya (migrasi database, ambil token, dan cara rakit Shortcut-nya step-by-step).

## Ikon aplikasi

`icons/icon-180.png`, `icon-192.png`, dan `icon-512.png` sudah diisi dengan logo "F" (badge hitam bersudut potong di atas latar oranye). `icons/icon-master.png` (1024x1024) disimpan sebagai sumber resolusi tinggi kalau nanti mau generate ukuran lain atau ganti logo — tinggal replace ketiga file PNG itu dengan ukuran yang sama.

## Batasan yang perlu diketahui

- **OCR (Tesseract.js)**: akurasi tergantung kualitas foto struk — selalu tampilkan hasil di form koreksi sebelum simpan (`~85%` di badge itu skor confidence dari Tesseract, bukan jaminan).
- **Riwayat & saldo dihitung di client**: semua transaksi user di-fetch sekaligus lalu dijumlah di JS (`js/state.js`). Cukup untuk pemakaian personal; kalau volume transaksi sudah sangat besar (puluhan ribu baris selama bertahun-tahun), pertimbangkan pindah ke agregasi lewat SQL view/RPC.
- **Notifikasi** di Settings baru toggle preferensi lokal (localStorage) — belum ada push notification sungguhan (butuh setup APNs/web push terpisah).

## Roadmap (belum dibangun)

- **Bill-splitting / "piutang"**: split transaksi ke beberapa teman, tandai lunas/belum, sesuai draft awal.
- Push notification pengingat pencatatan harian.
- Ekspor data (CSV) dari Riwayat.
