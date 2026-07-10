import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProdukPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Produk</h1>
        <p className="text-sm text-neutral-500">
          Kelola produk, resep, biaya lain-lain, dan lihat HPP estimasi
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Segera hadir (Fase 3)</CardTitle>
          <CardDescription>
            CRUD produk, editor resep, biaya lain-lain, HPP estimasi, dan saran harga jual akan
            dibangun di fase berikutnya.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
