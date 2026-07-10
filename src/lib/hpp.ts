import { prisma } from "@/lib/prisma";

export type IngredientEstimate = {
  ingredientId: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number | null; // null = belum ada lot harga sama sekali
  cost: number;
  priceSource: "fifo" | "last" | "none"; // fifo = lot terdepan, last = lot terakhir (stok habis)
};

export type ProductEstimate = {
  items: IngredientEstimate[];
  materialCost: number;
  otherPerUnit: number;
  otherPerBatchTotal: number;
  otherPerBatchPerUnit: number;
  hpp: number;
  missingPrices: string[];
  suggestedPrice: number;
  margin: number | null; // vs harga jual saat ini
};

type ProductWithRelations = {
  sellingPrice: number | null;
  targetMargin: number;
  defaultBatchSize: number;
  recipeItems: {
    quantity: number;
    ingredient: {
      id: string;
      name: string;
      unit: string;
      lots: { remainingQuantity: number; unitPrice: number; purchaseDate: Date }[];
    };
  }[];
  otherCosts: { name: string; amount: number; basis: string }[];
};

// HPP estimasi per 1 unit produk: resep × harga lot FIFO terdepan
// (fallback: harga lot terakhir bila stok habis) + biaya lain-lain.
export function estimateProduct(product: ProductWithRelations): ProductEstimate {
  const items: IngredientEstimate[] = product.recipeItems.map((item) => {
    const lots = item.ingredient.lots; // diharapkan terurut purchaseDate asc
    const front = lots.find((l) => l.remainingQuantity > 0);
    const last = lots.length > 0 ? lots[lots.length - 1] : undefined;

    let unitPrice: number | null = null;
    let priceSource: IngredientEstimate["priceSource"] = "none";
    if (front) {
      unitPrice = front.unitPrice;
      priceSource = "fifo";
    } else if (last) {
      unitPrice = last.unitPrice;
      priceSource = "last";
    }

    return {
      ingredientId: item.ingredient.id,
      name: item.ingredient.name,
      unit: item.ingredient.unit,
      quantity: item.quantity,
      unitPrice,
      cost: (unitPrice ?? 0) * item.quantity,
      priceSource,
    };
  });

  const materialCost = items.reduce((sum, i) => sum + i.cost, 0);
  const otherPerUnit = product.otherCosts
    .filter((c) => c.basis === "PER_UNIT")
    .reduce((sum, c) => sum + c.amount, 0);
  const otherPerBatchTotal = product.otherCosts
    .filter((c) => c.basis === "PER_BATCH")
    .reduce((sum, c) => sum + c.amount, 0);
  const batchSize = product.defaultBatchSize > 0 ? product.defaultBatchSize : 1;
  const otherPerBatchPerUnit = otherPerBatchTotal / batchSize;

  const hpp = materialCost + otherPerUnit + otherPerBatchPerUnit;
  const missingPrices = items.filter((i) => i.priceSource === "none").map((i) => i.name);

  const target = Math.min(Math.max(product.targetMargin, 0), 0.95);
  const suggestedPrice = target < 1 ? hpp / (1 - target) : hpp;

  const margin =
    product.sellingPrice && product.sellingPrice > 0
      ? (product.sellingPrice - hpp) / product.sellingPrice
      : null;

  return {
    items,
    materialCost,
    otherPerUnit,
    otherPerBatchTotal,
    otherPerBatchPerUnit,
    hpp,
    missingPrices,
    suggestedPrice,
    margin,
  };
}

export const productEstimateInclude = {
  recipeItems: {
    include: {
      ingredient: {
        include: { lots: { orderBy: { purchaseDate: "asc" as const } } },
      },
    },
  },
  otherCosts: true,
};

export async function getProductsWithEstimates(userId: string) {
  const products = await prisma.product.findMany({
    where: { userId },
    include: productEstimateInclude,
    orderBy: { name: "asc" },
  });
  return products.map((p) => ({ product: p, estimate: estimateProduct(p) }));
}
