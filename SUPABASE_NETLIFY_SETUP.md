# Setup Supabase + Netlify

## 1) Buat tabel di Supabase

1. Buka Supabase SQL Editor.
2. Jalankan isi file `supabase/schema.sql`.
3. Ganti password admin di tabel `admin_users` sesuai kebutuhan.
4. Jika tabel `daily_reports` sudah pernah dibuat sebelumnya, jalankan SQL terbaru agar kolom `records_json` ikut ditambahkan.
5. SQL terbaru juga akan migrasi password lama ke `password_hash` (bcrypt via `pgcrypto`) dan mengosongkan kolom plaintext.

## 2) Set environment variables

Isi variabel berikut di Netlify Site Settings -> Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_SESSION_SECRET` (string acak panjang, minimal 32 karakter)
- `REPORT_DELETE_ADMIN_NAMES` (opsional, isi daftar nama admin dipisah koma yang boleh hapus rekap milik admin lain)

Untuk local dev, copy `.env.example` menjadi `.env.local` lalu isi nilainya.

## 3) Build settings Netlify

- Build command: `npm run build`
- Publish directory: `.next`

## 4) Catatan keamanan

- Login admin sekarang divalidasi server-side via API route.
- Password admin tervalidasi dengan hash (`password_hash`) di database, bukan plaintext.
- Cookie sesi diset `httpOnly` dan `secure` saat production.
- Jangan expose `SUPABASE_SERVICE_ROLE_KEY` di client-side.
