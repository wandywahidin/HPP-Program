"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";
import { requireUserId, redirectWithError } from "./helpers";

// MINUS: kurangi stok FIFO dari lot tertua (bahan rusak/hilang/opname turun);
// cost = nilai kerugian. PLUS: tambahkan ke lot terbaru (opname naik) dengan
// harga lot itu. Keduanya menyimpan alokasi per lot agar bisa dibatalkan.
export async function createAdjustment(formData: FormData) {
  const userId = await requireUserId();
  const ingredientId = String(formData.get("ingredientId") ?? "");
  const date = String(formData.get("date") ?? "");
  const type = String(formData.get("type") ?? "");
  const quantity = Number(formData.get("quantity"));
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!ingredientId || !date) redirectWithError("/bahan-baku", "Bahan dan tanggal wajib diisi");
  if (type !== "MINUS" && type !== "PLUS") redirectWithError("/bahan-baku", "Jenis penyesuaian tidak valid");
  if (!Number.isFinite(quantity) || quantity <= 0) {
    redirectWithError("/bahan-baku", "Jumlah penyesuaian harus lebih dari 0");
  }

  const ingredient = await prisma.ingredient.findFirst({ where: { id: ingredientId, userId } });
  if (!ingredient) redirectWithError("/bahan-baku", "Bahan tidak ditemukan");

  let errorMessage: string | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      const allocations: { lotId: string; quantity: number; cost: number }[] = [];

      if (type === "MINUS") {
        let needed = quantity;
        const lots = await tx.purchaseLot.findMany({
          where: { ingredientId, remainingQuantity: { gt: 0 } },
          orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
        });
        for (const lot of lots) {
          if (needed <= 0) break;
          const take = Math.min(lot.remainingQuantity, needed);
          allocations.push({ lotId: lot.id, quantity: take, cost: take * lot.unitPrice });
          needed -= take;
        }
        if (needed > 1e-9) {
          throw new Error(
            `Stok ${ingredient.name} tidak cukup — kurang ${formatNumber(needed)} ${ingredient.unit}`,
          );
        }
        for (const a of allocations) {
          await tx.purchaseLot.update({
            where: { id: a.lotId },
            data: { remainingQuantity: { decrement: a.quantity } },
          });
        }
      } else {
        const lot = await tx.purchaseLot.findFirst({
          where: { ingredientId },
          orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
        });
        if (!lot) {
          throw new Error(
            `${ingredient.name} belum punya lot pembelian — catat pembelian dulu sebelum koreksi tambah`,
          );
        }
        allocations.push({ lotId: lot.id, quantity, cost: quantity * lot.unitPrice });
        await tx.purchaseLot.update({
          where: { id: lot.id },
          data: { remainingQuantity: { increment: quantity } },
        });
      }

      await tx.stockAdjustment.create({
        data: {
          ingredientId,
          date: new Date(date),
          type,
          quantity,
          cost: allocations.reduce((sum, a) => sum + a.cost, 0),
          note,
          allocations: { create: allocations },
        },
      });
    });
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "Gagal mencatat penyesuaian";
  }
  if (errorMessage) redirectWithError("/bahan-baku", errorMessage);

  revalidatePath("/bahan-baku");
  revalidatePath("/pembelian");
  redirect("/bahan-baku");
}

// Membatalkan penyesuaian mengembalikan lot ke keadaan semula.
export async function deleteAdjustment(id: string) {
  const userId = await requireUserId();

  const adjustment = await prisma.stockAdjustment.findFirst({
    where: { id, ingredient: { userId } },
    include: { allocations: { include: { lot: true } }, ingredient: true },
  });
  if (!adjustment) redirect("/bahan-baku");

  let errorMessage: string | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      for (const a of adjustment.allocations) {
        if (adjustment.type === "MINUS") {
          await tx.purchaseLot.update({
            where: { id: a.lotId },
            data: { remainingQuantity: { increment: a.quantity } },
          });
        } else {
          if (a.lot.remainingQuantity < a.quantity - 1e-9) {
            throw new Error(
              "Penyesuaian tidak bisa dibatalkan — stok hasil koreksi sudah terpakai",
            );
          }
          await tx.purchaseLot.update({
            where: { id: a.lotId },
            data: { remainingQuantity: { decrement: a.quantity } },
          });
        }
      }
      await tx.stockAdjustment.delete({ where: { id } });
    });
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "Gagal membatalkan penyesuaian";
  }
  if (errorMessage) redirectWithError("/bahan-baku", errorMessage);

  revalidatePath("/bahan-baku");
  revalidatePath("/pembelian");
  redirect("/bahan-baku");
}
