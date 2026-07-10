import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateIngredient } from "@/lib/actions/ingredients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/components/error-banner";

export default async function EditBahanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const session = await auth();

  const ingredient = await prisma.ingredient.findFirst({
    where: { id, userId: session!.user.id },
  });
  if (!ingredient) notFound();

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Bahan Baku</h1>
        <p className="text-sm text-neutral-500">{ingredient.name}</p>
      </div>

      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ubah Data</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateIngredient.bind(null, ingredient.id)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nama bahan</Label>
              <Input id="name" name="name" defaultValue={ingredient.name} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit">Satuan</Label>
              <Input id="unit" name="unit" defaultValue={ingredient.unit} required />
            </div>
            <p className="text-xs text-neutral-500">
              Mengubah satuan tidak mengonversi angka lot/resep yang sudah ada — pastikan konsisten.
            </p>
            <div className="flex gap-2">
              <Button type="submit">Simpan</Button>
              <Link
                href="/bahan-baku"
                className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Batal
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
