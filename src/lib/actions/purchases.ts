"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId, redirectWithError } from "./helpers";

export async function createPurchase(formData: FormData) {
  const userId = await requireUserId();
  const ingredientId = String(formData.get("ingredientId") ?? "");
  const purchaseDate = String(formData.get("purchaseDate") ?? "");
  const quantity = Number(formData.get("quantity"));
  const totalPrice = Number(formData.get("totalPrice"));

  if (!ingredientId || !purchaseDate) redirectWithError("/pembelian", "Bahan dan tanggal wajib diisi");
  if (!Number.isFinite(quantity) || quantity <= 0) redirectWithError("/pembelian", "Jumlah harus lebih dari 0");
  if (!Number.isFinite(totalPrice) || totalPrice < 0) redirectWithError("/pembelian", "Harga total tidak valid");

  const ingredient = await prisma.ingredient.findFirst({ where: { id: ingredientId, userId } });
  if (!ingredient) redirectWithError("/pembelian", "Bahan tidak ditemukan");

  await prisma.purchaseLot.create({
    data: {
      ingredientId,
      purchaseDate: new Date(purchaseDate),
      quantity,
      remainingQuantity: quantity,
      totalPrice,
      unitPrice: totalPrice / quantity,
    },
  });

  revalidatePath("/pembelian");
  revalidatePath("/bahan-baku");
  redirect("/pembelian");
}

export async function deletePurchase(id: string) {
  const userId = await requireUserId();

  const lot = await prisma.purchaseLot.findFirst({
    where: { id, ingredient: { userId } },
  });
  if (!lot) redirectWithError("/pembelian", "Lot tidak ditemukan");
  if (lot.remainingQuantity !== lot.quantity) {
    redirectWithError("/pembelian", "Lot tidak bisa dihapus karena sebagian sudah dipakai produksi");
  }

  await prisma.purchaseLot.delete({ where: { id } });

  revalidatePath("/pembelian");
  revalidatePath("/bahan-baku");
  redirect("/pembelian");
}
