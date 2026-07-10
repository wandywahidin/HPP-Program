import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPurchase, deletePurchase } from "@/lib/actions/purchases";
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

export default async function PembelianPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [ingredients, lots] = await Promise.all([
    prisma.ingredient.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.purchaseLot.findMany({
      where: { ingredient: { userId } },
      include: { ingredient: true },
      orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Pembelian</h1>
        <p className="text-sm text-neutral-500">
          Tiap pembelian menjadi satu lot FIFO dengan harga satuannya sendiri
        </p>
      </div>

      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catat Pembelian</CardTitle>
        </CardHeader>
        <CardContent>
          {ingredients.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Daftarkan <Link href="/bahan-baku" className="font-medium underline">bahan baku</Link> terlebih
              dahulu sebelum mencatat pembelian.
            </p>
          ) : (
            <form action={createPurchase} className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                <Label htmlFor="ingredientId">Bahan</Label>
                <Select id="ingredientId" name="ingredientId" required defaultValue="">
                  <option value="" disabled>
                    Pilih bahan…
                  </option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex w-40 flex-col gap-1.5">
                <Label htmlFor="purchaseDate">Tanggal</Label>
                <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={today} required />
              </div>
              <div className="flex w-36 flex-col gap-1.5">
                <Label htmlFor="quantity">Jumlah</Label>
                <Input id="quantity" name="quantity" type="number" step="any" min="0.001" placeholder="cth: 5000" required />
              </div>
              <div className="flex w-40 flex-col gap-1.5">
                <Label htmlFor="totalPrice">Harga total (Rp)</Label>
                <Input id="totalPrice" name="totalPrice" type="number" step="any" min="0" placeholder="cth: 50000" required />
              </div>
              <Button type="submit">
                <Plus className="h-4 w-4" /> Simpan
              </Button>
            </form>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            Jumlah dalam satuan bahan (mis. beli 5 kg tepung dengan satuan gram → isi 5000).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Lot ({lots.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {lots.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada pembelian tercatat.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Bahan</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead className="text-right">Harga Total</TableHead>
                  <TableHead className="text-right">Harga Satuan</TableHead>
                  <TableHead className="w-14 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((lot) => (
                  <TableRow key={lot.id} className={lot.remainingQuantity === 0 ? "opacity-50" : undefined}>
                    <TableCell>
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(lot.purchaseDate)}
                    </TableCell>
                    <TableCell className="font-medium">{lot.ingredient.name}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(lot.quantity)} {lot.ingredient.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(lot.remainingQuantity)} {lot.ingredient.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatRupiah(lot.totalPrice)}</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(lot.unitPrice)}/{lot.ingredient.unit}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DeleteButton
                          action={deletePurchase.bind(null, lot.id)}
                          confirmMessage={`Hapus lot ${lot.ingredient.name} (${formatNumber(lot.quantity)} ${lot.ingredient.unit})?`}
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
