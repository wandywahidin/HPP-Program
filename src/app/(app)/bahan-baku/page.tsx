import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createIngredient, deleteIngredient } from "@/lib/actions/ingredients";
import { createAdjustment, deleteAdjustment } from "@/lib/actions/adjustments";
import { formatNumber, formatRupiah } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBanner } from "@/components/error-banner";
import { DeleteButton } from "@/components/delete-button";
import { Pencil, Plus } from "lucide-react";

export default async function BahanBakuPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [ingredients, adjustments] = await Promise.all([
    prisma.ingredient.findMany({
      where: { userId },
      include: { lots: { orderBy: { purchaseDate: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.stockAdjustment.findMany({
      where: { ingredient: { userId } },
      include: { ingredient: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Bahan Baku</h1>
        <p className="text-sm text-neutral-500">
          Kelola daftar bahan baku — stok dan harga mengikuti lot pembelian (FIFO)
        </p>
      </div>

      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Bahan Baku</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createIngredient} className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <Label htmlFor="name">Nama bahan</Label>
              <Input id="name" name="name" placeholder="cth: Tepung tapioka" required />
            </div>
            <div className="flex w-40 flex-col gap-1.5">
              <Label htmlFor="unit">Satuan</Label>
              <Input id="unit" name="unit" placeholder="gram / ml / pcs" required />
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </form>
          <p className="mt-2 text-xs text-neutral-500">
            Gunakan satuan terkecil yang dipakai di resep (mis. gram, bukan kg) agar perhitungan konsisten.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Bahan ({ingredients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ingredients.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada bahan baku. Tambahkan lewat form di atas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Sisa Stok</TableHead>
                  <TableHead className="text-right">Harga Lot Aktif (FIFO)</TableHead>
                  <TableHead className="w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map((ing) => {
                  const stock = ing.lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
                  const activeLot = ing.lots.find((lot) => lot.remainingQuantity > 0);
                  return (
                    <TableRow key={ing.id}>
                      <TableCell className="font-medium">{ing.name}</TableCell>
                      <TableCell>{ing.unit}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(stock)} {ing.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {activeLot ? `${formatRupiah(activeLot.unitPrice)}/${ing.unit}` : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/bahan-baku/${ing.id}`}
                            title="Edit"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <DeleteButton
                            action={deleteIngredient.bind(null, ing.id)}
                            confirmMessage={`Hapus bahan "${ing.name}" beserta seluruh lot pembeliannya?`}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Penyesuaian Stok</CardTitle>
          <CardDescription>
            Koreksi stok karena bahan rusak/hilang atau hasil stock opname. Pengurangan diambil
            FIFO dari lot tertua; penambahan masuk ke lot terbaru.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {ingredients.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada bahan baku.</p>
          ) : (
            <form action={createAdjustment} className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-40 flex-1 flex-col gap-1.5">
                <Label htmlFor="adjIngredientId">Bahan</Label>
                <Select id="adjIngredientId" name="ingredientId" required defaultValue="">
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
                <Label htmlFor="adjDate">Tanggal</Label>
                <Input id="adjDate" name="date" type="date" defaultValue={today} required />
              </div>
              <div className="flex w-36 flex-col gap-1.5">
                <Label htmlFor="adjType">Jenis</Label>
                <Select id="adjType" name="type" defaultValue="MINUS">
                  <option value="MINUS">Pengurangan</option>
                  <option value="PLUS">Penambahan</option>
                </Select>
              </div>
              <div className="flex w-28 flex-col gap-1.5">
                <Label htmlFor="adjQuantity">Jumlah</Label>
                <Input id="adjQuantity" name="quantity" type="number" step="any" min="0.001" required />
              </div>
              <div className="flex min-w-40 flex-1 flex-col gap-1.5">
                <Label htmlFor="adjNote">Catatan (ops.)</Label>
                <Input id="adjNote" name="note" placeholder="cth: tumpah / opname" />
              </div>
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" /> Catat
              </Button>
            </form>
          )}

          {adjustments.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Bahan</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="w-14 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adj) => (
                  <TableRow key={adj.id}>
                    <TableCell>
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(adj.date)}
                    </TableCell>
                    <TableCell className="font-medium">{adj.ingredient.name}</TableCell>
                    <TableCell>
                      <span className={adj.type === "MINUS" ? "text-red-600" : "text-emerald-600"}>
                        {adj.type === "MINUS" ? "Pengurangan" : "Penambahan"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {adj.type === "MINUS" ? "−" : "+"}
                      {formatNumber(adj.quantity)} {adj.ingredient.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatRupiah(adj.cost)}</TableCell>
                    <TableCell className="text-neutral-500">{adj.note ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DeleteButton
                          action={deleteAdjustment.bind(null, adj.id)}
                          confirmMessage={`Batalkan penyesuaian ${adj.ingredient.name} (${adj.type === "MINUS" ? "−" : "+"}${formatNumber(adj.quantity)} ${adj.ingredient.unit})? Stok akan dikembalikan.`}
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
