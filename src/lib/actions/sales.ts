"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { estimateProduct, productEstimateInclude } from "@/lib/hpp";
import { requireUserId, redirectWithError } from "./helpers";

export async function createSale(formData: FormData) {
  const userId = await requireUserId();
  const productId = String(formData.get("productId") ?? "");
  const saleDate = String(formData.get("saleDate") ?? "");
  const quantity = Number(formData.get("quantity"));
  const unitPriceRaw = String(formData.get("unitPrice") ?? "").trim();

  if (!productId || !saleDate) redirectWithError("/penjualan", "Produk dan tanggal wajib diisi");
  if (!Number.isFinite(quantity) || quantity <= 0) {
    redirectWithError("/penjualan", "Jumlah terjual harus lebih dari 0");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId },
    include: {
      ...productEstimateInclude,
      productions: { orderBy: [{ productionDate: "desc" }, { createdAt: "desc" }], take: 1 },
    },
  });
  if (!product) redirectWithError("/penjualan", "Produk tidak ditemukan");

  // Harga jual: dari form, atau default harga jual produk
  const unitPrice = unitPriceRaw === "" ? product.sellingPrice : Number(unitPriceRaw);
  if (unitPrice === null || !Number.isFinite(unitPrice) || unitPrice < 0) {
    redirectWithError(
      "/penjualan",
      "Isi harga jual — produk ini belum punya harga jual default",
    );
  }

  // HPP dibekukan: produksi terakhir; bila belum pernah produksi, pakai estimasi
  let unitCost: number;
  const lastProduction = product.productions[0];
  if (lastProduction) {
    unitCost = lastProduction.unitCost;
  } else {
    const hasContent = product.recipeItems.length > 0 || product.otherCosts.length > 0;
    if (!hasContent) {
      redirectWithError(
        "/penjualan",
        `"${product.name}" belum punya HPP — susun resep/biaya atau catat produksi dulu`,
      );
    }
    unitCost = estimateProduct(product).hpp;
  }

  await prisma.sale.create({
    data: {
      productId,
      saleDate: new Date(saleDate),
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      unitCost,
    },
  });

  revalidatePath("/penjualan");
  revalidatePath("/");
  redirect("/penjualan");
}

export async function deleteSale(id: string) {
  const userId = await requireUserId();
  await prisma.sale.deleteMany({ where: { id, product: { userId } } });
  revalidatePath("/penjualan");
  revalidatePath("/");
  redirect("/penjualan");
}
