"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId, redirectWithError } from "./helpers";

export async function createIngredient(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();

  if (!name || !unit) redirectWithError("/bahan-baku", "Nama dan satuan wajib diisi");

  let failed = false;
  try {
    await prisma.ingredient.create({ data: { userId, name, unit } });
  } catch {
    failed = true; // pelanggaran unique (userId, name)
  }
  if (failed) redirectWithError("/bahan-baku", `Bahan "${name}" sudah terdaftar`);

  revalidatePath("/bahan-baku");
  redirect("/bahan-baku");
}

export async function updateIngredient(id: string, formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();

  if (!name || !unit) redirectWithError(`/bahan-baku/${id}`, "Nama dan satuan wajib diisi");

  let failed = false;
  try {
    const result = await prisma.ingredient.updateMany({
      where: { id, userId },
      data: { name, unit },
    });
    if (result.count === 0) failed = true;
  } catch {
    failed = true;
  }
  if (failed) redirectWithError(`/bahan-baku/${id}`, "Gagal menyimpan — nama mungkin sudah dipakai bahan lain");

  revalidatePath("/bahan-baku");
  redirect("/bahan-baku");
}

export async function deleteIngredient(id: string) {
  const userId = await requireUserId();

  let failed = false;
  try {
    await prisma.ingredient.deleteMany({ where: { id, userId } });
  } catch {
    // lot bahan ini sudah pernah dipakai produksi (relasi Restrict)
    failed = true;
  }
  if (failed) {
    redirectWithError(
      "/bahan-baku",
      "Bahan tidak bisa dihapus karena sudah dipakai dalam catatan produksi",
    );
  }

  revalidatePath("/bahan-baku");
  redirect("/bahan-baku");
}
