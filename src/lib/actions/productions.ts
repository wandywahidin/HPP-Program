"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";
import { requireUserId, redirectWithError } from "./helpers";

// Mencatat produksi: mengonsumsi bahan dari lot tertua dulu (FIFO)
// dan menyimpan HPP aktual batch. Seluruhnya dalam satu transaksi —
// gagal di tengah (mis. stok kurang) membatalkan semuanya.
export async function createProduction(formData: FormData) {
  const userId = await requireUserId();
  const productId = String(formData.get("productId") ?? "");
  const productionDate = String(formData.get("productionDate") ?? "");
  const quantityProduced = Number(formData.get("quantityProduced"));
  const defectRaw = String(formData.get("quantityDefect") ?? "").trim();
  const quantityDefect = defectRaw === "" ? 0 : Number(defectRaw);

  if (!productId || !productionDate) redirectWithError("/produksi", "Produk dan tanggal wajib diisi");
  if (!Number.isFinite(quantityProduced) || quantityProduced <= 0) {
    redirectWithError("/produksi", "Jumlah produksi harus lebih dari 0");
  }
  if (!Number.isFinite(quantityDefect) || quantityDefect < 0) {
    redirectWithError("/produksi", "Unit gagal tidak valid");
  }
  if (quantityDefect >= quantityProduced) {
    redirectWithError("/produksi", "Unit gagal harus lebih kecil dari jumlah produksi");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId },
    include: { recipeItems: { include: { ingredient: true } }, otherCosts: true },
  });
  if (!product) redirectWithError("/produksi", "Produk tidak ditemukan");
  if (product.recipeItems.length === 0) {
    redirectWithError("/produksi", `Produk "${product.name}" belum punya resep — susun dulu di halaman produk`);
  }

  let errorMessage: string | null = null;
  let createdId: string | null = null;

  try {
    createdId = await prisma.$transaction(async (tx) => {
      const consumptions: {
        ingredientId: string;
        lotId: string;
        quantity: number;
        cost: number;
      }[] = [];
      const shortages: string[] = [];

      for (const item of product.recipeItems) {
        let needed = item.quantity * quantityProduced;
        const lots = await tx.purchaseLot.findMany({
          where: { ingredientId: item.ingredientId, remainingQuantity: { gt: 0 } },
          orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
        });

        for (const lot of lots) {
          if (needed <= 0) break;
          const take = Math.min(lot.remainingQuantity, needed);
          consumptions.push({
            ingredientId: item.ingredientId,
            lotId: lot.id,
            quantity: take,
            cost: take * lot.unitPrice,
          });
          needed -= take;
        }

        if (needed > 1e-9) {
          shortages.push(
            `${item.ingredient.name} kurang ${formatNumber(needed)} ${item.ingredient.unit}`,
          );
        }
      }

      if (shortages.length > 0) {
        throw new Error(`Stok tidak cukup: ${shortages.join("; ")}`);
      }

      for (const c of consumptions) {
        await tx.purchaseLot.update({
          where: { id: c.lotId },
          data: { remainingQuantity: { decrement: c.quantity } },
        });
      }

      const materialCost = consumptions.reduce((sum, c) => sum + c.cost, 0);
      const otherCost = product.otherCosts.reduce(
        (sum, c) => sum + (c.basis === "PER_BATCH" ? c.amount : c.amount * quantityProduced),
        0,
      );
      const totalCost = materialCost + otherCost;
      // Biaya batch ditanggung unit layak jual saja — unit gagal ikut
      // menaikkan HPP unit yang berhasil, sesuai kenyataan.
      const sellable = quantityProduced - quantityDefect;

      const production = await tx.production.create({
        data: {
          productId: product.id,
          productionDate: new Date(productionDate),
          quantityProduced,
          quantityDefect,
          materialCost,
          otherCost,
          totalCost,
          unitCost: totalCost / sellable,
          consumptions: { create: consumptions },
        },
      });
      return production.id;
    });
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "Gagal mencatat produksi";
  }
  if (errorMessage || !createdId) redirectWithError("/produksi", errorMessage ?? "Gagal mencatat produksi");

  revalidatePath("/produksi");
  revalidatePath("/pembelian");
  revalidatePath("/bahan-baku");
  redirect(`/produksi/${createdId}`);
}

// Menghapus produksi mengembalikan kuantitas bahan ke lot asalnya.
export async function deleteProduction(id: string) {
  const userId = await requireUserId();

  const production = await prisma.production.findFirst({
    where: { id, product: { userId } },
    include: { consumptions: true },
  });
  if (!production) redirect("/produksi");

  await prisma.$transaction(async (tx) => {
    for (const c of production.consumptions) {
      await tx.purchaseLot.update({
        where: { id: c.lotId },
        data: { remainingQuantity: { increment: c.quantity } },
      });
    }
    await tx.production.delete({ where: { id } });
  });

  revalidatePath("/produksi");
  revalidatePath("/pembelian");
  revalidatePath("/bahan-baku");
  redirect("/produksi");
}
