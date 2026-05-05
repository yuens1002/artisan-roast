"use server";

import { z } from "zod";
import {
  createCategoryLabelSchema,
  updateCategoryLabelSchema,
} from "@/app/admin/product-menu/types/category";
import { prisma } from "@/lib/prisma";
import {
  attachCategoryToLabel,
  autoSortCategoriesInLabel as autoSortCategoriesInLabelData,
  batchMoveCategoriesToLabel as batchMoveCategoriesToLabelData,
  createCategoryLabel,
  deleteCategoryLabel,
  detachCategoryFromLabel,
  listCategoryLabelsWithCategories,
  reorderCategoriesInLabel as reorderCategoriesInLabelData,
  reorderCategoryLabels,
  updateCategoryLabel,
} from "@/app/admin/product-menu/data/labels";
import { revalidateSearchDrawer } from "@/lib/cache/revalidate-search-drawer";
import {
  makeCloneName,
  makeNewItemName,
  retryWithUniqueConstraint,
  stripCopySuffix,
} from "./utils";

export async function listLabels() {
  try {
    const labels = await listCategoryLabelsWithCategories();
    return { ok: true as const, data: labels };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list labels";
    return { ok: false as const, error: message };
  }
}

export async function createLabel(input: unknown) {
  const parsed = createCategoryLabelSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Validation failed",
      details: parsed.error.issues,
    };
  }

  try {
    const { name, icon, afterLabelId } = parsed.data;
    const label = await createCategoryLabel({
      name,
      icon: icon ?? null,
      afterLabelId: afterLabelId ?? null,
    });
    revalidateSearchDrawer();
    return { ok: true as const, data: label };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create label";
    return { ok: false as const, error: message };
  }
}

/**
 * Create a new label with a default name (server-owned workflow).
 * Handles name collision by appending (1), (2), (3), etc.
 */
export async function createNewLabel() {
  try {
    const result = await retryWithUniqueConstraint({
      makeName: (attempt) => makeNewItemName("Label", attempt),
      create: async (name) => {
        return await createCategoryLabel({
          name,
          icon: null,
          afterLabelId: null,
        });
      },
      errorMessage: "Could not generate unique label name",
    });
    if (result.ok) revalidateSearchDrawer();
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create label";
    return { ok: false as const, error: message };
  }
}

export async function updateLabel(id: unknown, input: unknown) {
  const idParsed = z.string().min(1).safeParse(id);
  const bodyParsed = updateCategoryLabelSchema.safeParse(input);
  if (!idParsed.success) return { ok: false as const, error: "Invalid id" };
  if (!bodyParsed.success) {
    return {
      ok: false as const,
      error: "Validation failed",
      details: bodyParsed.error.issues,
    };
  }

  try {
    const { name, icon, isVisible, autoOrder } = bodyParsed.data;
    const label = await updateCategoryLabel({
      id: idParsed.data,
      ...(name !== undefined ? { name } : {}),
      ...(icon !== undefined ? { icon } : {}),
      ...(isVisible !== undefined ? { isVisible } : {}),
      ...(autoOrder !== undefined ? { autoOrder } : {}),
    });
    revalidateSearchDrawer();
    return { ok: true as const, data: label };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update label";
    return { ok: false as const, error: message };
  }
}

export async function deleteLabel(id: unknown) {
  const idParsed = z.string().min(1).safeParse(id);
  if (!idParsed.success) return { ok: false as const, error: "Invalid id" };

  try {
    await deleteCategoryLabel(idParsed.data);
    revalidateSearchDrawer();
    return { ok: true as const, data: { id: idParsed.data } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete label";
    return { ok: false as const, error: message };
  }
}

export async function reorderLabels(labelIds: unknown) {
  const arr = z.array(z.string()).safeParse(labelIds);
  if (!arr.success) return { ok: false as const, error: "Invalid labelIds" };

  try {
    await reorderCategoryLabels(arr.data);
    revalidateSearchDrawer();
    return { ok: true as const, data: {} };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reorder labels";
    return { ok: false as const, error: message };
  }
}

export async function attachCategory(labelId: unknown, categoryId: unknown) {
  const parsed = z
    .object({ labelId: z.string().min(1), categoryId: z.string().min(1) })
    .safeParse({ labelId, categoryId });
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid labelId or categoryId" };
  }

  try {
    await attachCategoryToLabel(parsed.data);
    revalidateSearchDrawer();
    return { ok: true as const, data: {} };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to attach category";
    return { ok: false as const, error: message };
  }
}

export async function detachCategory(labelId: unknown, categoryId: unknown) {
  const parsed = z
    .object({ labelId: z.string().min(1), categoryId: z.string().min(1) })
    .safeParse({ labelId, categoryId });
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid labelId or categoryId" };
  }

  try {
    await detachCategoryFromLabel(parsed.data);
    revalidateSearchDrawer();
    return { ok: true as const, data: {} };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to detach category";
    return { ok: false as const, error: message };
  }
}

export async function reorderCategoriesInLabel(labelId: unknown, categoryIds: unknown) {
  const parsed = z
    .object({ labelId: z.string().min(1), categoryIds: z.array(z.string()) })
    .safeParse({ labelId, categoryIds });
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid labelId or categoryIds" };
  }

  try {
    await reorderCategoriesInLabelData(parsed.data);
    revalidateSearchDrawer();
    return { ok: true as const, data: {} };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reorder categories";
    return { ok: false as const, error: message };
  }
}

export async function autoSortCategoriesInLabel(labelId: unknown) {
  const idParsed = z.string().min(1).safeParse(labelId);
  if (!idParsed.success) return { ok: false as const, error: "Invalid labelId" };

  try {
    await autoSortCategoriesInLabelData(idParsed.data);
    await prisma.categoryLabel.update({
      where: { id: idParsed.data },
      data: { autoOrder: true },
    });
    revalidateSearchDrawer();
    return { ok: true as const, data: {} };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to auto-sort categories";
    return { ok: false as const, error: message };
  }
}

export async function cloneLabel(input: unknown) {
  const parsed = z.object({ id: z.string().min(1) }).safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input" };
  }

  try {
    const original = await prisma.categoryLabel.findUnique({
      where: { id: parsed.data.id },
      include: {
        categories: { orderBy: { order: "asc" } },
      },
    });

    if (!original) {
      return { ok: false as const, error: "Label not found" };
    }

    const baseName = stripCopySuffix(original.name);

    const result = await retryWithUniqueConstraint({
      makeName: (attempt) => makeCloneName(baseName, attempt),
      create: async (name) => {
        return await prisma.$transaction(async (tx) => {
          const newLabel = await tx.categoryLabel.create({
            data: {
              name,
              icon: original.icon,
              isVisible: original.isVisible,
              autoOrder: original.autoOrder,
              order: original.order,
            },
          });

          // Copy category attachments
          if (original.categories.length > 0) {
            await tx.categoryLabelCategory.createMany({
              data: original.categories.map((entry) => ({
                labelId: newLabel.id,
                categoryId: entry.categoryId,
                order: entry.order,
              })),
            });
          }

          return newLabel;
        });
      },
      errorMessage: "Could not generate unique label name",
    });
    if (result.ok) revalidateSearchDrawer();
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clone label";
    return { ok: false as const, error: message };
  }
}

const batchMoveSchema = z.object({
  moves: z.array(
    z.object({
      categoryId: z.string().min(1),
      fromLabelId: z.string().min(1),
    })
  ),
  toLabelId: z.string().min(1),
  targetCategoryId: z.string().nullable(),
  dropPosition: z.enum(["before", "after"]),
});

/**
 * Batch move multiple categories to a label in a single transaction.
 *
 * Used for multi-select cross-boundary drag operations.
 */
export async function batchMoveCategoriesToLabel(input: unknown) {
  const parsed = batchMoveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Validation failed",
      details: parsed.error.issues,
    };
  }

  try {
    await batchMoveCategoriesToLabelData(parsed.data);
    revalidateSearchDrawer();
    return { ok: true as const, data: {} };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to batch move categories";
    return { ok: false as const, error: message };
  }
}

/**
 * Restore a deleted label with all its data and category relationships.
 * Used for undo after delete.
 */
export async function restoreLabel(input: unknown) {
  const schema = z.object({
    name: z.string().min(1),
    icon: z.string().nullable(),
    isVisible: z.boolean(),
    autoOrder: z.boolean(),
    order: z.number(),
    categoryIds: z.array(z.string()),
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
    const { name, icon, isVisible, autoOrder, order, categoryIds } = parsed.data;

    const newLabel = await prisma.$transaction(async (tx) => {
      // Create the label with all original settings
      const label = await tx.categoryLabel.create({
        data: {
          name,
          icon,
          isVisible,
          autoOrder,
          order,
        },
      });

      // Reattach categories in order
      if (categoryIds.length > 0) {
        await tx.categoryLabelCategory.createMany({
          data: categoryIds.map((categoryId, idx) => ({
            labelId: label.id,
            categoryId,
            order: idx,
          })),
        });
      }

      return label;
    });

    revalidateSearchDrawer();
    return { ok: true as const, data: newLabel };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to restore label";
    return { ok: false as const, error: message };
  }
}
