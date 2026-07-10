# Planning: Sistem Perhitungan HPP (Harga Pokok Penjualan)

> Status: **Draft untuk review** — silakan beri masukan sebelum implementasi dimulai.

## 1. Latar Belakang & Tujuan

Sistem untuk membantu pelaku usaha (UMKM/produksi) mengetahui **HPP yang ideal** dari produk yang dijual, dengan alur:

1. Input **harga pembelian bahan baku** (kapan beli, berapa banyak, berapa harganya)
2. Catat **penggunaan bahan baku** (bahan apa saja & berapa banyak yang dipakai untuk membuat suatu produk)
3. Sistem **menghitung HPP** per produk secara otomatis

## 2. Ruang Lingkup MVP

### ✅ Masuk MVP

| # | Fitur | Deskripsi |
|---|-------|-----------|
| 1 | Master Bahan Baku | CRUD bahan baku: nama, satuan (gram, ml, pcs, dll) |
| 2 | Pembelian Bahan Baku | Input pembelian: bahan, tanggal, jumlah, harga total → sistem hitung harga per satuan |
| 3 | Master Produk | CRUD produk yang dijual: nama, harga jual (opsional) |
| 4 | Resep / Penggunaan Bahan | Definisikan komposisi produk: bahan apa & berapa banyak per 1 porsi/unit produk |
| 5 | Perhitungan HPP | HPP per produk = Σ (jumlah bahan dipakai × harga rata-rata bahan) |
| 6 | HPP Ideal & Margin | Tampilkan HPP, bandingkan dengan harga jual → margin (%), dan saran harga jual berdasarkan target margin |

### ❌ Di Luar MVP (fase berikutnya)

- Manajemen stok / kartu stok (stok masuk-keluar real-time)
- Metode FIFO/LIFO (MVP pakai **rata-rata tertimbang / moving average** karena paling sederhana dan umum untuk UMKM)
- Biaya tenaga kerja & overhead (bisa ditambahkan sebagai komponen biaya di fase 2)
- Multi-user, role & permission
- Laporan laba rugi

## 3. Metode Perhitungan HPP (MVP)

**Rata-rata tertimbang (weighted average):**

```
Harga rata-rata bahan = Total nilai pembelian bahan / Total kuantitas dibeli
HPP produk            = Σ (qty bahan dalam resep × harga rata-rata bahan)
Margin                = (Harga jual − HPP) / Harga jual × 100%
Saran harga jual      = HPP / (1 − target margin%)
```

Contoh: beli tepung 2× → 1 kg @ Rp12.000 dan 1 kg @ Rp14.000 → harga rata-rata Rp13.000/kg = Rp13/gram. Resep roti pakai 200 gram tepung → kontribusi tepung ke HPP = Rp2.600.

## 4. Rancangan Data (ERD Sederhana)

```
ingredients (bahan baku)
├── id, name, unit (gram/ml/pcs/...)

purchases (pembelian)
├── id, ingredient_id → ingredients
├── purchase_date, quantity, total_price
└── unit_price (dihitung: total_price / quantity)

products (produk)
├── id, name, selling_price (nullable)

recipe_items (resep / penggunaan bahan per produk)
├── id, product_id → products
├── ingredient_id → ingredients
└── quantity (jumlah bahan per 1 unit produk)
```

HPP dihitung on-the-fly dari data di atas (tidak disimpan), sehingga selalu update saat ada pembelian baru.

## 5. Halaman / UI (MVP)

1. **Dashboard** — ringkasan: jumlah bahan, produk, HPP tiap produk & margin
2. **Bahan Baku** — daftar + form tambah/edit bahan
3. **Pembelian** — daftar riwayat pembelian + form input pembelian
4. **Produk & Resep** — daftar produk, form produk, dan editor resep (pilih bahan + qty)
5. **Detail HPP Produk** — rincian: breakdown biaya per bahan, total HPP, margin, saran harga jual

## 6. Rekomendasi Tech Stack

### ⭐ Opsi A — Next.js Full-Stack (REKOMENDASI)

| Layer | Teknologi |
|-------|-----------|
| Framework | **Next.js 15 (App Router) + TypeScript** |
| UI | Tailwind CSS + shadcn/ui |
| Database | **SQLite** (dev) → PostgreSQL (produksi, mis. Neon/Supabase) |
| ORM | Prisma |
| Deploy | Vercel (gratis untuk mulai) |

**Alasan:** satu bahasa (TypeScript) untuk frontend + backend, satu repo, cepat untuk MVP, mudah deploy gratis, ekosistem komponen UI lengkap. SQLite membuat development tanpa perlu setup database server.

### Opsi B — Laravel + MySQL

Laravel 11 + Blade/Livewire + MySQL. Cocok jika Anda lebih familiar dengan PHP; ekosistem & hosting murah banyak di Indonesia. Kekurangannya: dua konteks (PHP + JS) jika nanti butuh UI interaktif.

### Opsi C — Super Ringan (Backend saja dulu)

FastAPI/Express + SQLite tanpa frontend framework (HTML + HTMX). Paling cepat jalan, tapi kurang scalable untuk UI yang berkembang.

## 7. Tahapan Pengerjaan (Milestone)

| Fase | Isi | Estimasi |
|------|-----|----------|
| 1. Setup | Init project, database schema, layout dasar | ~1 sesi |
| 2. Bahan & Pembelian | CRUD bahan baku + input pembelian + harga rata-rata | ~1–2 sesi |
| 3. Produk & Resep | CRUD produk + editor resep | ~1–2 sesi |
| 4. HPP & Margin | Halaman perhitungan HPP, margin, saran harga jual | ~1 sesi |
| 5. Polish | Dashboard, validasi input, format Rupiah | ~1 sesi |

## 8. Pertanyaan untuk Anda (mohon masukan)

1. **Tech stack** — setuju dengan Opsi A (Next.js), atau lebih nyaman dengan opsi lain?
2. **Metode HPP** — rata-rata tertimbang cukup untuk MVP, atau butuh FIFO dari awal?
3. **Biaya lain** — apakah tenaga kerja/overhead perlu masuk MVP, atau cukup bahan baku dulu?
4. **Pengguna** — dipakai sendiri (single user, tanpa login) atau perlu login dari awal?
5. **Bahasa UI** — Bahasa Indonesia?
