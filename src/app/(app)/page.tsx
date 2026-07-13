import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProductsWithEstimates } from "@/lib/hpp";
import { formatNumber, formatRupiah } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Carrot, Package, ShoppingCart, Factory, Receipt, TriangleAlert } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [ingredients, lotCount, productionCount, productRows, latestProductions, monthSales] =
    await Promise.all([
      prisma.ingredient.findMany({
        where: { userId },
        include: { lots: true },
        orderBy: { name: "asc" },
      }),
      prisma.purchaseLot.count({ where: { ingredient: { userId } } }),
      prisma.production.count({ where: { product: { userId } } }),
      getProductsWithEstimates(userId),
      prisma.production.findMany({
        where: { product: { userId } },
        orderBy: [{ productionDate: "desc" }, { createdAt: "desc" }],
      }),
      prisma.sale.findMany({
        where: { product: { userId }, saleDate: { gte: monthStart } },
      }),
    ]);

  const omzet = monthSales.reduce((sum, s) => sum + s.total, 0);
  const labaKotor = monthSales.reduce((sum, s) => sum + (s.total - s.quantity * s.unitCost), 0);
  const monthName = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now);

  // HPP aktual terakhir per produk
  const lastActual = new Map<string, number>();
  for (const prod of latestProductions) {
    if (!lastActual.has(prod.productId)) lastActual.set(prod.productId, prod.unitCost);
  }

  // Peringatan stok: habis, atau sisa < 10% dari total yang pernah dibeli
  const stockAlerts = ingredients
    .map((ing) => {
      const bought = ing.lots.reduce((s, l) => s + l.quantity, 0);
      const remaining = ing.lots.reduce((s, l) => s + l.remainingQuantity, 0);
      return { ing, bought, remaining };
    })
    .filter(({ bought, remaining }) => bought > 0 && remaining <= bought * 0.1);

  const stats = [
    { label: "Bahan Baku", value: ingredients.length, icon: Carrot, href: "/bahan-baku" },
    { label: "Lot Pembelian", value: lotCount, icon: ShoppingCart, href: "/pembelian" },
    { label: "Produk", value: productRows.length, icon: Package, href: "/produk" },
    { label: "Produksi", value: productionCount, icon: Factory, href: "/produksi" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Selamat datang, {session!.user.name ?? session!.user.email}
        </p>
      </div>

      {monthSales.length > 0 && (
        <Link href="/penjualan">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">
                Penjualan {monthName}
              </CardTitle>
              <Receipt className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-10 gap-y-2">
              <div>
                <p className="text-xs text-neutral-500">Omzet</p>
                <p className="text-2xl font-semibold">{formatRupiah(omzet)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Laba kotor</p>
                <p className={`text-2xl font-semibold ${labaKotor < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatRupiah(labaKotor)}
                </p>
              </div>
              {omzet > 0 && (
                <div>
                  <p className="text-xs text-neutral-500">Margin kotor</p>
                  <p className="text-2xl font-semibold">{((labaKotor / omzet) * 100).toFixed(1)}%</p>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={href} href={href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">{label}</CardTitle>
                <Icon className="h-4 w-4 text-neutral-400" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {stockAlerts.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
              <TriangleAlert className="h-4 w-4" /> Stok Menipis
            </CardTitle>
            <CardDescription>
              Sisa stok ≤ 10% dari total yang pernah dibeli — catat{" "}
              <Link href="/pembelian" className="underline">pembelian</Link> baru.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {stockAlerts.map(({ ing, remaining }) => (
                <li key={ing.id}>
                  <span className="font-medium">{ing.name}</span>{" "}
                  <span className={remaining === 0 ? "text-red-600" : "text-amber-600"}>
                    {remaining === 0 ? "habis" : `sisa ${formatNumber(remaining)} ${ing.unit}`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {productRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">HPP Produk</CardTitle>
            <CardDescription>
              Estimasi memakai harga lot FIFO saat ini; aktual dari produksi terakhir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">HPP Estimasi</TableHead>
                  <TableHead className="text-right">HPP Aktual Terakhir</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Saran Harga</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productRows.map(({ product, estimate }) => {
                  const empty = product.recipeItems.length === 0 && product.otherCosts.length === 0;
                  const actual = lastActual.get(product.id);
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Link
                          href={`/produk/${product.id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {product.name}
                        </Link>
                        {estimate.missingPrices.length > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-600">
                            <TriangleAlert className="h-3 w-3" /> harga bahan belum lengkap
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {empty ? "—" : formatRupiah(estimate.hpp)}
                      </TableCell>
                      <TableCell className="text-right">
                        {actual === undefined ? "—" : formatRupiah(actual)}
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
                        {empty ? "—" : formatRupiah(estimate.suggestedPrice)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {ingredients.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mulai dari sini</CardTitle>
            <CardDescription>Langkah untuk menghitung HPP produk Anda:</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-inside list-decimal space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <li>
                Daftarkan <Link href="/bahan-baku" className="font-medium underline">bahan baku</Link>{" "}
                beserta satuannya (gram, ml, pcs)
              </li>
              <li>
                Catat <Link href="/pembelian" className="font-medium underline">pembelian bahan</Link> —
                tiap pembelian menjadi lot FIFO
              </li>
              <li>
                Buat <Link href="/produk" className="font-medium underline">produk</Link>, susun resep,
                dan tambahkan biaya lain-lain
              </li>
              <li>
                Catat <Link href="/produksi" className="font-medium underline">produksi</Link> — sistem
                menghitung HPP aktual dengan FIFO
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
