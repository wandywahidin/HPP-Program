import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatNumber, formatRupiah } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default async function ProduksiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const production = await prisma.production.findFirst({
    where: { id, product: { userId: session!.user.id } },
    include: {
      product: true,
      consumptions: {
        include: { ingredient: true, lot: true },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!production) notFound();

  const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/produksi"
          className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Produksi
        </Link>
        <h1 className="text-2xl font-semibold">
          {production.product.name} — {formatNumber(production.quantityProduced)} unit
        </h1>
        <p className="text-sm text-neutral-500">
          Diproduksi {dateFmt.format(production.productionDate)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">HPP Aktual Batch Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <p className="text-xs text-neutral-500">Biaya bahan (FIFO)</p>
              <p className="text-lg font-semibold">{formatRupiah(production.materialCost)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Biaya lain-lain</p>
              <p className="text-lg font-semibold">{formatRupiah(production.otherCost)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Total biaya</p>
              <p className="text-lg font-semibold">{formatRupiah(production.totalCost)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">HPP per unit</p>
              <p className="text-lg font-semibold">{formatRupiah(production.unitCost)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rincian Konsumsi Bahan (FIFO)</CardTitle>
          <CardDescription>
            Lot mana yang dipakai, berapa banyak, dan dengan harga berapa — bahan yang sama bisa
            memakai beberapa lot dengan harga berbeda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bahan</TableHead>
                <TableHead>Lot (tgl beli)</TableHead>
                <TableHead className="text-right">Dipakai</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Biaya</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {production.consumptions.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.ingredient.name}</TableCell>
                  <TableCell>{dateFmt.format(c.lot.purchaseDate)}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(c.quantity)} {c.ingredient.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatRupiah(c.lot.unitPrice)}/{c.ingredient.unit}
                  </TableCell>
                  <TableCell className="text-right">{formatRupiah(c.cost)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="font-medium">Total biaya bahan</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatRupiah(production.materialCost)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
