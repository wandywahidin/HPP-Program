import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createProduction, deleteProduction } from "@/lib/actions/productions";
import { formatNumber, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBanner } from "@/components/error-banner";
import { DeleteButton } from "@/components/delete-button";
import { Plus } from "lucide-react";

export default async function ProduksiPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [products, productions] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.production.findMany({
      where: { product: { userId } },
      include: { product: true },
      orderBy: [{ productionDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Produksi</h1>
        <p className="text-sm text-neutral-500">
          Mencatat produksi mengonsumsi bahan dari lot tertua dulu (FIFO) dan menghitung HPP aktual
        </p>
      </div>

      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catat Produksi</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Buat <Link href="/produk" className="font-medium underline">produk</Link> beserta resepnya
              terlebih dahulu.
            </p>
          ) : (
            <form action={createProduction} className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                <Label htmlFor="productId">Produk</Label>
                <Select id="productId" name="productId" required defaultValue="">
                  <option value="" disabled>
                    Pilih produk…
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex w-40 flex-col gap-1.5">
                <Label htmlFor="productionDate">Tanggal</Label>
                <Input id="productionDate" name="productionDate" type="date" defaultValue={today} required />
              </div>
              <div className="flex w-36 flex-col gap-1.5">
                <Label htmlFor="quantityProduced">Jumlah unit</Label>
                <Input
                  id="quantityProduced"
                  name="quantityProduced"
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder="cth: 60"
                  required
                />
              </div>
              <Button type="submit">
                <Plus className="h-4 w-4" /> Catat
              </Button>
            </form>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            Kebutuhan bahan = resep × jumlah unit. Jika stok kurang, pencatatan dibatalkan dan
            kekurangannya ditampilkan.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Produksi ({productions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {productions.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada produksi tercatat.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Biaya Bahan</TableHead>
                  <TableHead className="text-right">Biaya Lain</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">HPP / Unit</TableHead>
                  <TableHead className="w-14 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productions.map((prod) => (
                  <TableRow key={prod.id}>
                    <TableCell>
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(prod.productionDate)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/produksi/${prod.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {prod.product.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(prod.quantityProduced)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(prod.materialCost)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(prod.otherCost)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(prod.totalCost)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatRupiah(prod.unitCost)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DeleteButton
                          action={deleteProduction.bind(null, prod.id)}
                          confirmMessage={`Hapus produksi ${prod.product.name} (${formatNumber(prod.quantityProduced)} unit)? Stok bahan akan dikembalikan ke lot asalnya.`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
