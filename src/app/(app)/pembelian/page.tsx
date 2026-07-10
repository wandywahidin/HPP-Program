import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PembelianPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Pembelian</h1>
        <p className="text-sm text-neutral-500">
          Catat pembelian bahan baku — tiap pembelian menjadi satu lot FIFO
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Segera hadir (Fase 2)</CardTitle>
          <CardDescription>
            Form input pembelian dan riwayat lot dengan sisa kuantitas akan dibangun di fase berikutnya.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
