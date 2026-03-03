# Panduan Backup Rutin Supabase

Dokumen ini menjelaskan cara backup data aplikasi absensi secara manual dan otomatis.

## Tabel yang wajib dibackup

- `public.attendance_records`
- `public.daily_reports`
- `public.admin_users`

## Opsi 1: Backup manual (paling cepat)

1. Buka Supabase Dashboard.
2. Masuk ke `Table Editor`.
3. Pilih tabel satu per satu (`attendance_records`, `daily_reports`, `admin_users`).
4. Export ke CSV.
5. Simpan file ke folder cloud (Google Drive/OneDrive/Dropbox).

Disarankan lakukan minimal 1x seminggu.

## Opsi 2: Backup otomatis SQL (disarankan)

Gunakan `pg_dump` agar backup siap restore penuh.

### 1) Siapkan connection string

Ambil database connection string Supabase dari:
`Project Settings -> Database`.

Contoh format:

```bash
postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
```

### 2) Jalankan backup manual via terminal

```bash
mkdir -p backups
pg_dump "postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require" \
  -t public.attendance_records \
  -t public.daily_reports \
  -t public.admin_users \
  -f backups/backup_absen_$(date +%F).sql
```

### 3) Buat script backup

Buat file `scripts/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

mkdir -p backups

pg_dump "$SUPABASE_DB_URL" \
  -t public.attendance_records \
  -t public.daily_reports \
  -t public.admin_users \
  -f "backups/backup_absen_$(date +%F).sql"
```

Lalu beri izin eksekusi:

```bash
chmod +x scripts/backup.sh
```

### 4) Jadwalkan via cron (macOS/Linux)

Buka cron:

```bash
crontab -e
```

Contoh jalan tiap hari jam 23:30:

```cron
30 23 * * * SUPABASE_DB_URL='postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require' /bin/bash /PATH/KE/PROJECT/scripts/backup.sh >> /PATH/KE/PROJECT/backups/backup.log 2>&1
```

## Restore dasar

Untuk restore file SQL:

```bash
psql "postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require" -f backups/backup_absen_YYYY-MM-DD.sql
```

## Checklist operasional

- Simpan backup di lokasi berbeda (cloud + lokal).
- Uji restore minimal 1x per bulan.
- Retensi minimal 30 backup harian.
- Jangan commit kredensial database ke Git.
