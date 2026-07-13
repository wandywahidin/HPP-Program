import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createSale, deleteSale } from "@/lib/actions/sales";
import { formatNumber, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBanner } from "@/components/error-banner";
import { DeleteButton } from "@/components/delete-button";
import { Plus } from "lucide-react";

export default async function PenjualanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [products, sales, productionAgg, salesAgg] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.sale.findMany({
      where: { product: { userId } },
      include: { product: true },
      orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.production.groupBy({
      by: ["productId"],
      where: { product: { userId } },
      _sum: { quantityProduced: true, quantityDefect: true },
    }),
    prisma.sale.groupBy({
      by: ["productId"],
      where: { product: { userId } },
      _sum: { quantity: true },
    }),
  ]);

  // Ringkasan bulan berjalan
  const monthSales = sales.filter((s) => s.saleDate >= monthStart);
  const omzet = monthSales.reduce((sum, s) => sum + s.total, 0);
  const hppTerjual = monthSales.reduce((sum, s) => sum + s.quantity * s.unitCost, 0);
  const labaKotor = omzet - hppTerjual;

  // Stok produk jadi = diproduksi (layak jual) − terjual
  const producedMap = new Map(
    productionAgg.map((p) => [
      p.productId,
      (p._sum.quantityProduced ?? 0) - (p._sum.quantityDefect ?? 0),
    ]),
  );
  const soldMap = new Map(salesAgg.map((s) => [s.productId, s._sum.quantity ?? 0]));
  const finishedStock = products
    .map((p) => ({
      product: p,
      produced: producedMap.get(p.id) ?? 0,
      sold: soldMap.get(p.id) ?? 0,
    }))
    .filter((row) => row.produced > 0 || row.sold > 0);

  const monthName = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now);
  const today = now.toISOString().slice(0, 10);
  const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Penjualan</h1>
        <p className="text-sm text-neutral-500">
          Laba kotor dihitung dari HPP yang dibekukan saat transaksi dicatat
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Omzet {monthName}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatRupiah(omzet)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">HPP Terjual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatRupiah(hppTerjual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Laba Kotor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${labaKotor < 0 ? "text-red-600" : "text-emerald-600"}`}>
              {formatRupiah(labaKotor)}
            </p>
            {omzet > 0 && (
              <p className="text-xs text-neutral-500">{((labaKotor / omzet) * 100).toFixed(1)}% dari omzet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catat Penjualan</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Buat <Link href="/produk" className="font-medium underline">produk</Link> terlebih dahulu.
            </p>
          ) : (
            <form action={createSale} className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                <Label htmlFor="productId">Produk</Label>
                <Select id="productId" name="productId" required defaultValue="">
                  <option value="" disabled>Pilih produk…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex w-40 flex-col gap-1.5">
                <Label htmlFor="saleDate">Tanggal</Label>
                <Input id="saleDate" name="saleDate" type="date" defaultValue={today} required />
              </div>
              <div className="flex w-32 flex-col gap-1.5">
                <Label htmlFor="quantity">Jumlah</Label>
                <Input id="quantity" name="quantity" type="number" step="any" min="0.001" required />
              </div>
              <div className="flex w-44 flex-col gap-1.5">
                <Label htmlFor="unitPrice">Harga/unit (Rp)</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="kosong = harga produk"
                />
              </div>
              <Button type="submit">
                <Plus className="h-4 w-4" /> Catat
              </Button>
            </form>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            Kosongkan harga untuk memakai harga jual produk. HPP diambil dari produksi terakhir
            (atau estimasi bila belum pernah produksi) dan dibekukan pada transaksi.
          </p>
        </CardContent>
      </Card>

      {finishedStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stok Produk Jadi</CardTitle>
            <CardDescription>
              Layak jual (produksi dikurangi unit gagal) dikurangi terjual — minus berarti ada
              penjualan yang belum tercatat produksinya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Layak Jual</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finishedStock.map(({ product, produced, sold }) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{formatNumber(produced)}</TableCell>
                    <TableCell className="text-right">{formatNumber(sold)}</TableCell>
                    <TableCell className={`text-right font-medium ${produced - sold < 0 ? "text-red-600" : ""}`}>
                      {formatNumber(produced - sold)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Penjualan ({sales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada penjualan tercatat.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Harga/Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">HPP/Unit</TableHead>
                  <TableHead className="text-right">Laba</TableHead>
                  <TableHead className="w-14 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => {
                  const laba = sale.total - sale.quantity * sale.unitCost;
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{dateFmt.format(sale.saleDate)}</TableCell>
                      <TableCell className="font-medium">{sale.product.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(sale.quantity)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(sale.unitPrice)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(sale.total)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(sale.unitCost)}</TableCell>
                      <TableCell className={`text-right font-medium ${laba < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatRupiah(laba)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DeleteButton
                            action={deleteSale.bind(null, sale.id)}
                            confirmMessage={`Hapus penjualan ${sale.product.name} (${formatNumber(sale.quantity)} unit, ${formatRupiah(sale.total)})?`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
