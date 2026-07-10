"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId, redirectWithError } from "./helpers";

export async function createProduct(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const sellingPriceRaw = String(formData.get("sellingPrice") ?? "").trim();
  const sellingPrice = sellingPriceRaw === "" ? null : Number(sellingPriceRaw);

  if (!name) redirectWithError("/produk", "Nama produk wajib diisi");
  if (sellingPrice !== null && (!Number.isFinite(sellingPrice) || sellingPrice < 0)) {
    redirectWithError("/produk", "Harga jual tidak valid");
  }

  let created: { id: string } | null = null;
  try {
    created = await prisma.product.create({
      data: { userId, name, sellingPrice },
      select: { id: true },
    });
  } catch {
    // unique (userId, name)
  }
  if (!created) redirectWithError("/produk", `Produk "${name}" sudah terdaftar`);

  revalidatePath("/produk");
  redirect(`/produk/${created.id}`);
}

export async function updateProduct(id: string, formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const sellingPriceRaw = String(formData.get("sellingPrice") ?? "").trim();
  const sellingPrice = sellingPriceRaw === "" ? null : Number(sellingPriceRaw);
  const targetMarginPct = Number(formData.get("targetMargin"));
  const defaultBatchSize = Number(formData.get("defaultBatchSize"));
  const path = `/produk/${id}`;

  if (!name) redirectWithError(path, "Nama produk wajib diisi");
  if (sellingPrice !== null && (!Number.isFinite(sellingPrice) || sellingPrice < 0)) {
    redirectWithError(path, "Harga jual tidak valid");
  }
  if (!Number.isFinite(targetMarginPct) || targetMarginPct < 0 || targetMarginPct >= 100) {
    redirectWithError(path, "Target margin harus 0–99%");
  }
  if (!Number.isFinite(defaultBatchSize) || defaultBatchSize <= 0) {
    redirectWithError(path, "Perkiraan unit per batch harus lebih dari 0");
  }

  let failed = false;
  try {
    const result = await prisma.product.updateMany({
      where: { id, userId },
      data: { name, sellingPrice, targetMargin: targetMarginPct / 100, defaultBatchSize },
    });
    if (result.count === 0) failed = true;
  } catch {
    failed = true;
  }
  if (failed) redirectWithError(path, "Gagal menyimpan — nama mungkin sudah dipakai produk lain");

  revalidatePath("/produk");
  revalidatePath(path);
  redirect(path);
}

export async function deleteProduct(id: string) {
  const userId = await requireUserId();
  await prisma.product.deleteMany({ where: { id, userId } });
  revalidatePath("/produk");
  redirect("/produk");
}

// ===== Resep =====

export async function upsertRecipeItem(productId: string, formData: FormData) {
  const userId = await requireUserId();
  const ingredientId = String(formData.get("ingredientId") ?? "");
  const quantity = Number(formData.get("quantity"));
  const path = `/produk/${productId}`;

  const [product, ingredient] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, userId } }),
    prisma.ingredient.findFirst({ where: { id: ingredientId, userId } }),
  ]);
  if (!product || !ingredient) redirectWithError(path, "Produk atau bahan tidak ditemukan");
  if (!Number.isFinite(quantity) || quantity <= 0) {
    redirectWithError(path, "Jumlah bahan harus lebih dari 0");
  }

  await prisma.recipeItem.upsert({
    where: { productId_ingredientId: { productId, ingredientId } },
    update: { quantity },
    create: { productId, ingredientId, quantity },
  });

  revalidatePath(path);
  revalidatePath("/produk");
  redirect(path);
}

export async function deleteRecipeItem(id: string) {
  const userId = await requireUserId();
  const item = await prisma.recipeItem.findFirst({
    where: { id, product: { userId } },
  });
  if (!item) redirect("/produk");

  await prisma.recipeItem.delete({ where: { id } });
  revalidatePath(`/produk/${item.productId}`);
  revalidatePath("/produk");
  redirect(`/produk/${item.productId}`);
}

// ===== Biaya lain-lain =====

export async function createOtherCost(productId: string, formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const basis = String(formData.get("basis") ?? "PER_UNIT");
  const path = `/produk/${productId}`;

  const product = await prisma.product.findFirst({ where: { id: productId, userId } });
  if (!product) redirect("/produk");
  if (!name) redirectWithError(path, "Nama biaya wajib diisi");
  if (!Number.isFinite(amount) || amount < 0) redirectWithError(path, "Jumlah biaya tidak valid");
  if (basis !== "PER_UNIT" && basis !== "PER_BATCH") redirectWithError(path, "Basis biaya tidak valid");

  await prisma.otherCost.create({ data: { productId, name, amount, basis } });

  revalidatePath(path);
  revalidatePath("/produk");
  redirect(path);
}

export async function deleteOtherCost(id: string) {
  const userId = await requireUserId();
  const cost = await prisma.otherCost.findFirst({
    where: { id, product: { userId } },
  });
  if (!cost) redirect("/produk");

  await prisma.otherCost.delete({ where: { id } });
  revalidatePath(`/produk/${cost.productId}`);
  revalidatePath("/produk");
  redirect(`/produk/${cost.productId}`);
}
