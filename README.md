# HPP Program

Aplikasi web untuk menghitung **Harga Pokok Penjualan (HPP)** dengan metode **FIFO**:
catat pembelian bahan baku per lot, susun resep produk & biaya lain-lain, catat produksi,
dan dapatkan HPP aktual + saran harga jual. Lihat [PLANNING.md](./PLANNING.md) untuk detail rancangan.

## Tech Stack

- Next.js (App Router) + TypeScript
- Auth.js (NextAuth v5) — login Google + mode login dev
- Prisma 6 + SQLite (dev) / PostgreSQL (produksi)
- Tailwind CSS

## Menjalankan Secara Lokal

```bash
npm install
cp .env.example .env        # lalu isi AUTH_SECRET (npx auth secret)
npx prisma migrate dev      # buat database SQLite + tabel
npm run dev                 # buka http://localhost:3000
```

Tanpa kredensial Google, set `AUTH_DEV_LOGIN="true"` di `.env` (default) dan gunakan
tombol **Login Dev** di halaman login.

## Setup Login Google

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat project (atau pakai yang ada)
2. **APIs & Services → OAuth consent screen** → isi nama aplikasi & email, tipe *External*
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: *Web application*
   - Authorized JavaScript origins: `http://localhost:3000` (tambahkan domain produksi nanti)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Salin **Client ID** dan **Client Secret** ke `.env`:
   ```
   AUTH_GOOGLE_ID="xxx.apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="GOCSPX-xxx"
   ```
5. Restart `npm run dev` → tombol "Masuk dengan Google" muncul di halaman login

Untuk produksi: set `AUTH_DEV_LOGIN="false"`, ganti `DATABASE_URL` ke PostgreSQL,
dan tambahkan redirect URI domain produksi di Google Console.

## Status Pengerjaan

- [x] Fase 1 — Setup project, schema database, login Google, layout & navigasi
- [ ] Fase 2 — CRUD bahan baku + pembelian (lot FIFO) + sisa stok
- [ ] Fase 3 — Produk, resep, biaya lain-lain, HPP estimasi
- [ ] Fase 4 — Produksi + engine FIFO + HPP aktual per batch
- [ ] Fase 5 — Dashboard lengkap, margin & saran harga, polish
