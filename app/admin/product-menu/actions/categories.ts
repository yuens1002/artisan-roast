"use server";

import {
  createCategoryWithLabels,
  deleteCategoryWithRelations,
  listCategoriesAndLabels,
  updateCategoryWithLabels,
} from "@/app/admin/product-menu/data/categories";
import {
  cloneCategorySchema,
  createCategorySchema,
  createNewCategorySchema,
  updateCategorySchema,
} from "@/app/admin/product-menu/types/category";
import { generateSlug } from "@/app/admin/_hooks/useSlugGenerator";
import { revalidateSearchDrawer } from "@/lib/cache/revalidate-search-drawer";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  makeCloneName,
  makeNewItemName,
  retryWithUniqueConstraint,
  stripCopySuffix,
} from "./utils";

/**
 * Category-specific retry wrapper that generates both name and slug
 * Wraps retryWithUniqueConstraint to handle slug generation
 */
async function createWithUniqueNameAndSlug<T>(opts: {
  makeName: (attempt: number) => string;
  create: (args: { name: string; slug: string }) => Promise<T>;
  maxAttempts?: number;
  errorMessage?: string;
}): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  return await retryWithUniqueConstraint({
    makeName: opts.makeName,
    create: async (name) => {
      const slug = generateSlug(name);
      return await opts.create({ name, slug });
    },
    maxAttempts: opts.maxAttempts,
    errorMessage: opts.errorMessage ?? "Failed to generate a unique category name",
  });
}

// List categories with labels
export async function listCategories() {
  try {
    const { categories, labels } = await listCategoriesAndLabels("menu-builder-newest-first");
    return { ok: true, data: { categories, labels } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list categories";
    return { ok: false, error: message };
  }
}

// Create a category
export async function createCategory(input: unknown) {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      details: parsed.error.issues,
    };
  }

  try {
    const {
      name,
      slug,
      labelIds = [],
    } = parsed.data as {
      name: string;
      slug: string;
      labelIds?: string[];
    };

    const fresh = await createCategoryWithLabels({ name, slug, labelIds });

    revalidateSearchDrawer();
    return {
      ok: true,
      data: fresh,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create category";
    return { ok: false, error: message };
  }
}

// Create a new default category (server-owned workflow)
export async function createNewCategory(input?: unknown) {
  const parsed = createNewCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      details: parsed.error.issues,
    };
  }

  try {
    const labelIds = parsed.data?.labelIds ?? [];

    const result = await createWithUniqueNameAndSlug({
      makeName: (attempt) => makeNewItemName("Category", attempt),
      create: async ({ name, slug }) => {
        return await createCategoryWithLabels({ name, slug, labelIds });
      },
    });
    if (result.ok) revalidateSearchDrawer();
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create new category";
    return { ok: false, error: message };
  }
}

// Clone a category (including products + label attachments)
export async function cloneCategory(input: unknown) {
  const parsed = cloneCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      details: parsed.error.issues,
    };
  }

  try {
    const original = await prisma.category.findUnique({
      where: { id: parsed.data.id },
      include: {
        labels: { orderBy: { order: "asc" } },
        products: { orderBy: { order: "asc" } },
      },
    });

    if (!original) {
      return { ok: false, error: "Category not found" };
    }

    const baseName = stripCopySuffix(original.name);

    // Keep natural sort order by mirroring original order.
    const nextOrder = original.order;

    const created = await createWithUniqueNameAndSlug({
      makeName: (attempt) => makeCloneName(baseName, attempt),
      create: async ({ name, slug }) => {
        return await prisma.$transaction(async (tx) => {
          const created = await tx.category.create({
            data: {
              name,
              slug,
              kind: original.kind,
              isUsingDefaultLabel: original.isUsingDefaultLabel,
              showPurchaseOptions: original.showPurchaseOptions,
              isVisible: original.isVisible,
              order: nextOrder,
            },
          });

          if (original.labels.length > 0) {
            await tx.categoryLabelCategory.createMany({
              data: original.labels.map((entry) => ({
                labelId: entry.labelId,
                categoryId: created.id,
                order: entry.order,
              })),
            });
          }

          if (original.products.length > 0) {
            await tx.categoriesOnProducts.createMany({
              data: original.products.map((entry) => ({
                productId: entry.productId,
                categoryId: created.id,
                // Avoid creating multiple primary categories for a product.
                isPrimary: false,
                order: entry.order,
              })),
            });
          }

          return created;
        });
      },
      errorMessage: "Failed to generate a unique clone name",
    });

    if (!created.ok) return created;
    revalidateSearchDrawer();
    return { ok: true, data: { id: created.data.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clone category";
    return { ok: false, error: message };
  }
}

// Update a category
export async function updateCategory(id: unknown, input: unknown) {
  const idParsed = z.string().min(1).safeParse(id);
  const bodyParsed = updateCategorySchema.safeParse(input);
  if (!idParsed.success) return { ok: false, error: "Invalid id" };
  if (!bodyParsed.success)
    return {
      ok: false,
      error: "Validation failed",
      details: bodyParsed.error.issues,
    };

  try {
    const { name, slug, labelIds, isVisible } = bodyParsed.data;

    const fresh = await updateCategoryWithLabels({
      id: idParsed.data,
      name,
      slug,
      labelIds,
      isVisible,
    });

    revalidateSearchDrawer();
    return {
      ok: true,
      data: fresh,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update category";
    return { ok: false, error: message };
  }
}

// Delete a category
export async function deleteCategory(id: unknown) {
  const idParsed = z.string().min(1).safeParse(id);
  if (!idParsed.success) return { ok: false, error: "Invalid id" };

  try {
    await deleteCategoryWithRelations(idParsed.data);
    revalidateSearchDrawer();
    return { ok: true, data: { id: idParsed.data } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete category";
    return { ok: false, error: message };
  }
}

/**
 * Restore a deleted category with all its data and label relationships.
 * Used for undo after delete.
 */
export async function restoreCategory(input: unknown) {
  const schema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    isVisible: z.boolean(),
    order: z.number(),
    labelIds: z.array(z.string()),
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Validation failed",
      details: parsed.error.issues,
    };
  }

  try {
    const { name, slug, isVisible, order, labelIds } = parsed.data;

    const newCategory = await prisma.$transaction(async (tx) => {
      // Create the category with all original settings
      const category = await tx.category.create({
        data: {
          name,
          slug,
          isVisible,
          order,
        },
      });

      // Reattach to labels
      if (labelIds.length > 0) {
        await tx.categoryLabelCategory.createMany({
          data: labelIds.map((labelId, idx) => ({
            labelId,
            categoryId: category.id,
            order: idx,
          })),
        });
      }

      return category;
    });

    revalidateSearchDrawer();
    return { ok: true as const, data: newCategory };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to restore category";
    return { ok: false as const, error: message };
  }
}
