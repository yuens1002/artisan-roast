import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const KEY_CHIP_LABEL = "search_drawer_chip_label";
const KEY_CURATED_CATEGORY = "search_drawer_curated_category";

/**
 * v2 schema: partial update — admin form auto-saves only the changed field.
 * - chipLabelId: CategoryLabel.id, must be non-empty when present.
 * - curatedCategorySlug: Category.slug. Empty string is the "explicitly cleared"
 *   sentinel (no curated section).
 */
const settingsSchema = z
  .object({
    chipLabelId: z.string().min(1, "Chip label id is required").optional(),
    curatedCategorySlug: z.string().optional(),
  })
  .refine(
    (v) => v.chipLabelId !== undefined || v.curatedCategorySlug !== undefined,
    { message: "At least one field must be provided" }
  );

export async function GET() {
  const authResult = await requireAdminApi();
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const rows = await prisma.siteSettings.findMany({
      where: { key: { in: [KEY_CHIP_LABEL, KEY_CURATED_CATEGORY] } },
      select: { key: true, value: true },
    });

    const map = rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    return NextResponse.json({
      chipLabelId: map[KEY_CHIP_LABEL] || null,
      curatedCategorySlug:
        KEY_CURATED_CATEGORY in map ? map[KEY_CURATED_CATEGORY] : null,
    });
  } catch (error) {
    console.error("Failed to fetch search drawer settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const authResult = await requireAdminApi();
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues.map((issue) => issue.message).join("; "),
        },
        { status: 400 }
      );
    }

    const { chipLabelId, curatedCategorySlug } = parsed.data;

    const ops = [] as Promise<unknown>[];
    if (chipLabelId !== undefined) {
      ops.push(
        prisma.siteSettings.upsert({
          where: { key: KEY_CHIP_LABEL },
          update: { value: chipLabelId },
          create: { key: KEY_CHIP_LABEL, value: chipLabelId },
        })
      );
    }
    if (curatedCategorySlug !== undefined) {
      ops.push(
        prisma.siteSettings.upsert({
          where: { key: KEY_CURATED_CATEGORY },
          update: { value: curatedCategorySlug },
          create: { key: KEY_CURATED_CATEGORY, value: curatedCategorySlug },
        })
      );
    }

    await Promise.all(ops);

    // Invalidate the cached storefront drawer config so the change reaches
    // visitors on their next page load (the layout's getCachedSearchDrawerConfig
    // is tagged with this name). Next 16 requires a cacheLife profile;
    // "default" triggers an immediate revalidation on the next request.
    revalidateTag("search-drawer-config", "default");

    // Return the canonical state from DB so the client confirms its optimistic
    // value matches what was persisted.
    const rows = await prisma.siteSettings.findMany({
      where: { key: { in: [KEY_CHIP_LABEL, KEY_CURATED_CATEGORY] } },
      select: { key: true, value: true },
    });
    const map = rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    return NextResponse.json({
      chipLabelId: map[KEY_CHIP_LABEL] || null,
      curatedCategorySlug:
        KEY_CURATED_CATEGORY in map ? map[KEY_CURATED_CATEGORY] : null,
    });
  } catch (error) {
    console.error("Failed to update search drawer settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
