import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createIngredient, deleteIngredient } from "@/lib/actions/ingredients";
import { formatNumber, formatRupiah } from "@/lib/utils";
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

  const ingredients = await prisma.ingredient.findMany({
    where: { userId },
    include: { lots: { orderBy: { purchaseDate: "asc" } } },
    orderBy: { name: "asc" },
  });

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
    </div>
  );
}
