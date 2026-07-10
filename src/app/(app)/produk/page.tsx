import Link from "next/link";
import { auth } from "@/auth";
import { getProductsWithEstimates } from "@/lib/hpp";
import { createProduct } from "@/lib/actions/products";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBanner } from "@/components/error-banner";
import { Plus, TriangleAlert } from "lucide-react";

export default async function ProdukPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const rows = await getProductsWithEstimates(session!.user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Produk</h1>
        <p className="text-sm text-neutral-500">
          HPP estimasi dihitung dari resep × harga lot FIFO terkini + biaya lain-lain
        </p>
      </div>

      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProduct} className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <Label htmlFor="name">Nama produk</Label>
              <Input id="name" name="name" placeholder="cth: Cirawang" required />
            </div>
            <div className="flex w-44 flex-col gap-1.5">
              <Label htmlFor="sellingPrice">Harga jual (Rp, opsional)</Label>
              <Input id="sellingPrice" name="sellingPrice" type="number" step="any" min="0" placeholder="cth: 4000" />
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </form>
          <p className="mt-2 text-xs text-neutral-500">
            Setelah dibuat, Anda akan diarahkan ke halaman produk untuk menyusun resep & biaya.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Produk ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada produk. Tambahkan lewat form di atas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-right">HPP Estimasi</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Saran Harga</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ product, estimate }) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link href={`/produk/${product.id}`} className="font-medium underline-offset-2 hover:underline">
                        {product.name}
                      </Link>
                      {estimate.missingPrices.length > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-600">
                          <TriangleAlert className="h-3 w-3" />
                          harga bahan belum lengkap
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {product.recipeItems.length === 0 && product.otherCosts.length === 0
                        ? "—"
                        : formatRupiah(estimate.hpp)}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.sellingPrice ? formatRupiah(product.sellingPrice) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {estimate.margin === null ? (
                        "—"
                      ) : (
                        <span className={estimate.margin < 0 ? "text-red-600" : "text-emerald-600"}>
                          {(estimate.margin * 100).toFixed(1)}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.recipeItems.length === 0 && product.otherCosts.length === 0
                        ? "—"
                        : formatRupiah(estimate.suggestedPrice)}
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
