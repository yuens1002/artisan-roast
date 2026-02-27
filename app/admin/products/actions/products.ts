"use server";

import { Prisma, ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { productCreateSchema } from "@/lib/validations/product";
import { getWeightUnit } from "@/lib/config/app-settings";
import { WeightUnitOption, fromGrams, roundToInt } from "@/lib/weight-unit";
import { revalidatePath } from "next/cache";

type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

export async function getProduct(id: string): Promise<ActionResult> {
  await requireAdmin();

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      variants: {
        orderBy: { order: "asc" },
        include: {
          purchaseOptions: true,
          images: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!product) {
    return { ok: false, error: "Product not found" };
  }

  const currentUnit = await getWeightUnit();

  const formattedProduct = {
    ...product,
    categoryIds: product.categories.map((c) => c.categoryId),
    variants: product.variants.map((variant) => ({
      ...variant,
      weight: roundToInt(fromGrams(variant.weight, currentUnit as WeightUnitOption)),
    })),
  };

  return { ok: true, data: formattedProduct };
}

export async function createProduct(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = productCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }

  const data = parsed.data;
  const {
    name, slug, description, heading, isOrganic, isFeatured, isDisabled,
    categoryIds, productType, roastLevel, origin, variety,
    altitude, tastingNotes,
  } = data;

  const isCoffee = productType === ProductType.COFFEE;
  const isMerch = productType === ProductType.MERCH;
  const rawDetails = isMerch && "details" in data ? data.details : undefined;
  const processing = isCoffee && "processing" in data ? data.processing : undefined;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name,
          slug,
          description: description || null,
          heading: heading || null,
          isOrganic,
          isFeatured,
          isDisabled,
          type: productType,
          roastLevel: isCoffee ? roastLevel : null,
          origin: isCoffee ? origin : [],
          variety: isCoffee ? variety || null : null,
          altitude: isCoffee ? altitude || null : null,
          tastingNotes: isCoffee ? tastingNotes : [],
          processing: isCoffee ? processing || null : null,
          details: rawDetails || undefined,
        },
      });

      if (categoryIds && categoryIds.length > 0) {
        await tx.categoriesOnProducts.createMany({
          data: categoryIds.map((categoryId) => ({
            productId: newProduct.id,
            categoryId,
            isPrimary: false,
          })),
        });
      }

      return newProduct;
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/merch");
    return { ok: true, data: product };
  } catch (error) {
    console.error("Error creating product:", error);
    return { ok: false, error: "Failed to create product" };
  }
}

export async function updateProduct(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = productCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }

  const data = parsed.data;
  const {
    name, slug, description, heading, isOrganic, isFeatured, isDisabled,
    categoryIds, productType, roastLevel, origin, variety,
    altitude, tastingNotes,
  } = data;

  const isCoffee = productType === ProductType.COFFEE;
  const isMerch = productType === ProductType.MERCH;
  const rawDetails = isMerch && "details" in data ? data.details : undefined;
  const details = rawDetails === undefined ? undefined : rawDetails ? rawDetails : Prisma.JsonNull;
  const processing = isCoffee && "processing" in data ? data.processing : undefined;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          description: description || null,
          heading: heading || null,
          isOrganic,
          isFeatured,
          isDisabled,
          type: productType,
          roastLevel: isCoffee ? roastLevel : null,
          origin: isCoffee ? origin : [],
          tastingNotes: isCoffee ? tastingNotes : [],
          variety: isCoffee ? variety || null : null,
          altitude: isCoffee ? altitude || null : null,
          processing: isCoffee ? processing || null : null,
          details: isMerch ? (details ?? undefined) : undefined,
        },
      });

      await tx.categoriesOnProducts.deleteMany({ where: { productId: id } });
      if (categoryIds && categoryIds.length > 0) {
        await tx.categoriesOnProducts.createMany({
          data: categoryIds.map((categoryId) => ({
            productId: id,
            categoryId,
            isPrimary: false,
          })),
        });
      }

      return updatedProduct;
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/merch");
    revalidatePath(`/products/${product.slug}`);
    return { ok: true, data: product };
  } catch (error) {
    console.error("Error updating product:", error);
    return { ok: false, error: "Failed to update product" };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.categoriesOnProducts.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
    revalidatePath("/admin/products");
    revalidatePath("/admin/merch");
    return { ok: true, data: null };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { ok: false, error: "Failed to delete product" };
  }
}
