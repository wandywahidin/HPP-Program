import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BahanBakuPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Bahan Baku</h1>
        <p className="text-sm text-neutral-500">Kelola daftar bahan baku dan satuannya</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Segera hadir (Fase 2)</CardTitle>
          <CardDescription>
            CRUD bahan baku beserta sisa stok dari lot pembelian akan dibangun di fase berikutnya.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
