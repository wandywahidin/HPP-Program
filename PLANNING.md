# Planning: Sistem Perhitungan HPP (Harga Pokok Penjualan)

> Status: **Disetujui dengan revisi** — FIFO dari awal, biaya lain-lain masuk MVP, login Google.

## 1. Latar Belakang & Tujuan

Sistem untuk membantu pelaku usaha (UMKM/produksi) mengetahui **HPP yang ideal** dari produk yang dijual, dengan alur:

1. Input **harga pembelian bahan baku** (kapan beli, berapa banyak, berapa harganya)
2. Catat **penggunaan bahan baku** (bahan apa saja & berapa banyak yang dipakai untuk membuat suatu produk)
3. Sistem **menghitung HPP** per produk secara otomatis dengan metode **FIFO**

Setiap pengguna login dengan **akun Google**, dan satu akun bisa menyimpan **beberapa produk** dengan perhitungan HPP masing-masing.

## 2. Ruang Lingkup MVP

| # | Fitur | Deskripsi |
|---|-------|-----------|
| 1 | Login Google | Autentikasi via Google OAuth; semua data terisolasi per akun |
| 2 | Master Bahan Baku | CRUD bahan baku: nama, satuan (gram, ml, pcs, dll) |
| 3 | Pembelian Bahan Baku | Input pembelian per **lot**: bahan, tanggal, jumlah, harga total → sistem hitung harga per satuan. Tiap lot menyimpan sisa kuantitas untuk FIFO |
| 4 | Master Produk | CRUD produk: nama, harga jual (opsional) — multi-produk per akun |
| 5 | Resep Produk | Komposisi bahan per 1 unit/porsi produk |
| 6 | Biaya Lain-lain | Biaya non-bahan per produk: tenaga kerja, gas, kemasan, listrik, dll — basis per unit atau per batch produksi |
| 7 | Penggunaan / Produksi | Catat produksi: produk apa, berapa unit → sistem konsumsi bahan dari lot **tertua dulu (FIFO)** dan catat biayanya |
| 8 | Perhitungan HPP | HPP aktual per batch produksi (FIFO) + **HPP estimasi** dari resep memakai harga lot terdepan — untuk penentuan harga jual |
| 9 | Margin & Harga Ideal | Margin % vs harga jual, dan saran harga jual berdasarkan target margin |

### Di Luar MVP (fase berikutnya)

- Kartu stok lengkap / stock opname & penyesuaian stok
- Laporan laba rugi & rekap penjualan
- Multi-bisnis per akun, kolaborasi tim / role
- Export PDF/Excel

## 3. Metode Perhitungan HPP: FIFO

Setiap pembelian bahan menjadi **lot** dengan harga satuannya sendiri. Saat produksi, bahan dikonsumsi dari lot yang **paling lama dibeli** terlebih dahulu.

**Contoh FIFO — tepung tapioka (aci):**

| Lot | Tanggal | Beli | Harga/kg | Sisa |
|-----|---------|------|----------|------|
| 1 | 2 Jul | 5 kg | Rp10.000 | 5 kg |
| 2 | 8 Jul | 5 kg | Rp11.000 | 5 kg |

- Produksi 60 pack Cirawang butuh 4,8 kg aci → semua diambil dari **Lot 1** @Rp10.000 → biaya aci = Rp48.000. Sisa Lot 1 = 0,2 kg.
- Produksi berikutnya butuh 4,8 kg → 0,2 kg dari Lot 1 (Rp2.000) + 4,6 kg dari Lot 2 (Rp50.600) → biaya aci = Rp52.600.

```
HPP batch     = Σ biaya bahan terpakai (FIFO) + Σ biaya lain-lain batch
HPP per unit  = HPP batch / jumlah unit diproduksi
Margin        = (Harga jual − HPP) / Harga jual × 100%
Saran harga   = HPP / (1 − target margin%)
```

**HPP estimasi (untuk penentuan harga sebelum produksi):** dihitung dari resep × harga lot terdepan yang masih tersedia, plus biaya lain-lain per unit.

## 4. Contoh Perhitungan: Cirawang & Cirawit

Harga bahan (contoh): tapioka Rp10.000/kg, bawang putih Rp40.000/kg, cabe rawit Rp60.000/kg, garam Rp10.000/kg, penyedap Rp40.000/kg, minyak goreng Rp18.000/liter.

### Cirawang (aci tulang rangu bawang) — per 1 pack

| Komponen | Qty | Harga satuan | Biaya |
|----------|-----|--------------|-------|
| Tepung tapioka | 80 g | Rp10/g | Rp800 |
| Bawang putih | 5 g | Rp40/g | Rp200 |
| Garam | 2 g | Rp10/g | Rp20 |
| Penyedap | 1 g | Rp40/g | Rp40 |
| Minyak goreng | 15 ml | Rp18/ml | Rp270 |
| **Subtotal bahan** | | | **Rp1.330** |
| Kemasan (pouch + label) | 1 pcs | | Rp500 |
| Gas | | | Rp150 |
| Tenaga kerja | | | Rp300 |
| Listrik & lain-lain | | | Rp100 |
| **Subtotal biaya lain** | | | **Rp1.050** |
| **HPP per pack** | | | **Rp2.380** |

Target margin 40% → saran harga jual = 2.380 / 0,6 = **Rp3.967 ≈ Rp4.000** (margin aktual 40,5%).

### Cirawit (aci tulang rangu rawit) — per 1 pack

| Komponen | Qty | Harga satuan | Biaya |
|----------|-----|--------------|-------|
| Tepung tapioka | 80 g | Rp10/g | Rp800 |
| Cabe rawit | 8 g | Rp60/g | Rp480 |
| Bawang putih | 3 g | Rp40/g | Rp120 |
| Garam | 2 g | Rp10/g | Rp20 |
| Penyedap | 1 g | Rp40/g | Rp40 |
| Minyak goreng | 15 ml | Rp18/ml | Rp270 |
| **Subtotal bahan** | | | **Rp1.730** |
| **Subtotal biaya lain** (sama) | | | **Rp1.050** |
| **HPP per pack** | | | **Rp2.780** |

Target margin 40% → saran harga jual = 2.780 / 0,6 = **Rp4.633 ≈ Rp5.000** (margin aktual 44,4%).

> Angka di atas hanya ilustrasi — di sistem, harga bahan mengikuti lot pembelian nyata (FIFO), jadi HPP otomatis naik/turun mengikuti harga beli terkini.

## 5. Rancangan Data (ERD)

```
users (dari Google OAuth)
├── id, email, name, image

ingredients                      ← scoped per user_id
├── id, user_id, name, unit

purchase_lots                    ← tiap pembelian = 1 lot FIFO
├── id, ingredient_id, purchase_date
├── quantity, remaining_quantity
└── total_price, unit_price

products                         ← scoped per user_id
├── id, user_id, name, selling_price, target_margin

recipe_items
├── id, product_id, ingredient_id
└── quantity (per 1 unit produk)

other_costs                      ← biaya lain-lain per produk
├── id, product_id, name, amount
└── basis (PER_UNIT | PER_BATCH)

productions                      ← catatan produksi / penggunaan
├── id, product_id, production_date, quantity_produced
└── total_cost, unit_cost (hasil FIFO, disimpan)

production_consumptions          ← jejak alokasi FIFO
├── id, production_id, ingredient_id, lot_id
└── quantity, cost
```

Semua query difilter `user_id` (multi-tenant per akun Google).

## 6. Halaman / UI

1. **Login** — tombol "Masuk dengan Google"
2. **Dashboard** — HPP & margin tiap produk, peringatan stok lot menipis
3. **Bahan Baku** — daftar bahan + sisa stok (dari lot)
4. **Pembelian** — riwayat lot + form input pembelian
5. **Produk** — daftar produk; per produk: resep, biaya lain-lain, HPP estimasi, saran harga
6. **Produksi** — form catat produksi (auto-konsumsi FIFO dari resep, bisa disesuaikan) + riwayat dengan HPP aktual per batch

## 7. Tech Stack (disetujui — Opsi A)

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Auth | **Auth.js (NextAuth v5) + Google Provider** |
| UI | Tailwind CSS + shadcn/ui |
| Database | SQLite (dev) → PostgreSQL (produksi: Neon/Supabase) |
| ORM | Prisma |
| Deploy | Vercel |

## 8. Tahapan Pengerjaan

| Fase | Isi |
|------|-----|
| 1. Setup + Auth | Init project, schema Prisma, login Google, layout dasar |
| 2. Bahan & Pembelian | CRUD bahan + input lot pembelian + sisa stok |
| 3. Produk, Resep & Biaya Lain | CRUD produk, editor resep, biaya lain-lain, HPP estimasi |
| 4. Produksi & FIFO | Form produksi, engine alokasi FIFO, HPP aktual per batch |
| 5. Polish | Dashboard, margin & saran harga, validasi, format Rupiah |
