import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Carrot, Package, ShoppingCart, Factory } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [ingredientCount, lotCount, productCount, productionCount] = await Promise.all([
    prisma.ingredient.count({ where: { userId } }),
    prisma.purchaseLot.count({ where: { ingredient: { userId } } }),
    prisma.product.count({ where: { userId } }),
    prisma.production.count({ where: { product: { userId } } }),
  ]);

  const stats = [
    { label: "Bahan Baku", value: ingredientCount, icon: Carrot, href: "/bahan-baku" },
    { label: "Lot Pembelian", value: lotCount, icon: ShoppingCart, href: "/pembelian" },
    { label: "Produk", value: productCount, icon: Package, href: "/produk" },
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

      {ingredientCount === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mulai dari sini</CardTitle>
            <CardDescription>Langkah untuk menghitung HPP produk Anda:</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-inside list-decimal space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <li>
                Daftarkan <Link href="/bahan-baku" className="font-medium underline">bahan baku</Link> beserta satuannya (gram, ml, pcs)
              </li>
              <li>
                Catat <Link href="/pembelian" className="font-medium underline">pembelian bahan</Link> — tiap pembelian menjadi lot FIFO
              </li>
              <li>
                Buat <Link href="/produk" className="font-medium underline">produk</Link>, susun resep, dan tambahkan biaya lain-lain
              </li>
              <li>
                Catat <Link href="/produksi" className="font-medium underline">produksi</Link> — sistem menghitung HPP aktual dengan FIFO
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
