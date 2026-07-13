import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { estimateProduct, productEstimateInclude } from "@/lib/hpp";
import {
  updateProduct,
  deleteProduct,
  duplicateProduct,
  upsertRecipeItem,
  deleteRecipeItem,
  createOtherCost,
  deleteOtherCost,
} from "@/lib/actions/products";
import { formatNumber, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBanner } from "@/components/error-banner";
import { DeleteButton } from "@/components/delete-button";
import { Copy, Plus, TriangleAlert } from "lucide-react";

export default async function ProdukDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [product, ingredients] = await Promise.all([
    prisma.product.findFirst({
      where: { id, userId },
      include: productEstimateInclude,
    }),
    prisma.ingredient.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  const estimate = estimateProduct(product);
  const hasContent = product.recipeItems.length > 0 || product.otherCosts.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-sm text-neutral-500">Resep, biaya lain-lain, dan HPP estimasi</p>
        </div>
        <div className="flex items-center gap-2">
          <form action={duplicateProduct.bind(null, product.id)}>
            <Button type="submit" variant="outline" size="sm" title="Salin produk beserta resep & biaya">
              <Copy className="h-4 w-4" /> Duplikat
            </Button>
          </form>
          <DeleteButton
            action={deleteProduct.bind(null, product.id)}
            confirmMessage={`Hapus produk "${product.name}" beserta resep, biaya, dan riwayat produksinya?`}
          />
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Ringkasan HPP */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ringkasan HPP (per 1 unit)</CardTitle>
          <CardDescription>
            Memakai harga lot FIFO terdepan saat ini — berubah otomatis mengikuti pembelian.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!hasContent ? (
            <p className="text-sm text-neutral-500">
              Susun resep dan biaya lain-lain di bawah untuk melihat HPP.
            </p>
          ) : (
            <>
              {estimate.missingPrices.length > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  <TriangleAlert className="h-4 w-4 shrink-0" />
                  Belum ada harga untuk: {estimate.missingPrices.join(", ")} — catat{" "}
                  <Link href="/pembelian" className="underline">pembelian</Link> agar HPP akurat.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-neutral-500">Biaya bahan</p>
                  <p className="text-lg font-semibold">{formatRupiah(estimate.materialCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Biaya lain-lain</p>
                  <p className="text-lg font-semibold">
                    {formatRupiah(estimate.otherPerUnit + estimate.otherPerBatchPerUnit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">HPP per unit</p>
                  <p className="text-lg font-semibold">{formatRupiah(estimate.hpp)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">
                    Saran harga (margin {(product.targetMargin * 100).toFixed(0)}%)
                  </p>
                  <p className="text-lg font-semibold">{formatRupiah(estimate.suggestedPrice)}</p>
                </div>
              </div>
              {estimate.margin !== null && (
                <p className="text-sm">
                  Dengan harga jual {formatRupiah(product.sellingPrice!)}, margin saat ini{" "}
                  <span className={estimate.margin < 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
                    {(estimate.margin * 100).toFixed(1)}%
                  </span>
                  {estimate.margin < product.targetMargin && " — di bawah target"}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Resep */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resep (per 1 unit)</CardTitle>
            <CardDescription>Pilih bahan yang sama untuk mengubah jumlahnya.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {ingredients.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Daftarkan <Link href="/bahan-baku" className="font-medium underline">bahan baku</Link> dulu.
              </p>
            ) : (
              <form action={upsertRecipeItem.bind(null, product.id)} className="flex flex-wrap items-end gap-3">
                <div className="flex min-w-40 flex-1 flex-col gap-1.5">
                  <Label htmlFor="ingredientId">Bahan</Label>
                  <Select id="ingredientId" name="ingredientId" required defaultValue="">
                    <option value="" disabled>Pilih bahan…</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex w-28 flex-col gap-1.5">
                  <Label htmlFor="quantity">Jumlah</Label>
                  <Input id="quantity" name="quantity" type="number" step="any" min="0.001" required />
                </div>
                <Button type="submit" size="sm">
                  <Plus className="h-4 w-4" /> Simpan
                </Button>
              </form>
            )}

            {product.recipeItems.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bahan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Harga Satuan</TableHead>
                    <TableHead className="text-right">Biaya</TableHead>
                    <TableHead className="w-14" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.recipeItems.map((item) => {
                    const est = estimate.items.find((i) => i.ingredientId === item.ingredientId)!;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.ingredient.name}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.quantity)} {item.ingredient.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {est.unitPrice === null
                            ? "—"
                            : `${formatRupiah(est.unitPrice)}/${item.ingredient.unit}`}
                          {est.priceSource === "last" && (
                            <span className="ml-1 text-xs text-amber-600" title="Stok habis, memakai harga lot terakhir">*</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatRupiah(est.cost)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <DeleteButton
                              action={deleteRecipeItem.bind(null, item.id)}
                              confirmMessage={`Hapus ${item.ingredient.name} dari resep?`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={3} className="font-medium">Subtotal bahan</TableCell>
                    <TableCell className="text-right font-semibold">{formatRupiah(estimate.materialCost)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Biaya lain-lain */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Biaya Lain-lain</CardTitle>
            <CardDescription>
              Per unit (kemasan, dll) atau per batch (gas, tenaga kerja — dibagi perkiraan unit per batch).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form action={createOtherCost.bind(null, product.id)} className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-36 flex-1 flex-col gap-1.5">
                <Label htmlFor="costName">Nama biaya</Label>
                <Input id="costName" name="name" placeholder="cth: Kemasan" required />
              </div>
              <div className="flex w-32 flex-col gap-1.5">
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input id="amount" name="amount" type="number" step="any" min="0" required />
              </div>
              <div className="flex w-32 flex-col gap-1.5">
                <Label htmlFor="basis">Basis</Label>
                <Select id="basis" name="basis" defaultValue="PER_UNIT">
                  <option value="PER_UNIT">Per unit</option>
                  <option value="PER_BATCH">Per batch</option>
                </Select>
              </div>
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            </form>

            {product.otherCosts.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Basis</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Per Unit</TableHead>
                    <TableHead className="w-14" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.otherCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell className="font-medium">{cost.name}</TableCell>
                      <TableCell>{cost.basis === "PER_UNIT" ? "Per unit" : "Per batch"}</TableCell>
                      <TableCell className="text-right">{formatRupiah(cost.amount)}</TableCell>
                      <TableCell className="text-right">
                        {formatRupiah(
                          cost.basis === "PER_UNIT"
                            ? cost.amount
                            : cost.amount / (product.defaultBatchSize > 0 ? product.defaultBatchSize : 1),
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DeleteButton
                            action={deleteOtherCost.bind(null, cost.id)}
                            confirmMessage={`Hapus biaya "${cost.name}"?`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="font-medium">Subtotal per unit</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatRupiah(estimate.otherPerUnit + estimate.otherPerBatchPerUnit)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pengaturan produk */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pengaturan Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProduct.bind(null, product.id)} className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-44 flex-1 flex-col gap-1.5">
              <Label htmlFor="name">Nama produk</Label>
              <Input id="name" name="name" defaultValue={product.name} required />
            </div>
            <div className="flex w-40 flex-col gap-1.5">
              <Label htmlFor="sellingPrice">Harga jual (Rp)</Label>
              <Input
                id="sellingPrice"
                name="sellingPrice"
                type="number"
                step="any"
                min="0"
                defaultValue={product.sellingPrice ?? ""}
                placeholder="kosongkan jika belum"
              />
            </div>
            <div className="flex w-36 flex-col gap-1.5">
              <Label htmlFor="targetMargin">Target margin (%)</Label>
              <Input
                id="targetMargin"
                name="targetMargin"
                type="number"
                step="any"
                min="0"
                max="99"
                defaultValue={product.targetMargin * 100}
                required
              />
            </div>
            <div className="flex w-44 flex-col gap-1.5">
              <Label htmlFor="defaultBatchSize">Unit per batch (perkiraan)</Label>
              <Input
                id="defaultBatchSize"
                name="defaultBatchSize"
                type="number"
                step="any"
                min="0.001"
                defaultValue={product.defaultBatchSize}
                required
              />
            </div>
            <Button type="submit">Simpan</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
