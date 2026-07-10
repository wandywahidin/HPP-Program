import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProduksiPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Produksi</h1>
        <p className="text-sm text-neutral-500">
          Catat produksi — sistem mengonsumsi bahan dari lot tertua (FIFO) dan menghitung HPP aktual
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Segera hadir (Fase 4)</CardTitle>
          <CardDescription>
            Form produksi dengan engine alokasi FIFO dan riwayat HPP per batch akan dibangun di fase
            berikutnya.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
