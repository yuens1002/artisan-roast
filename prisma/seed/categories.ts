import { PrismaClient } from "@prisma/client";

export async function seedCategories(prisma: PrismaClient) {
  console.log("  📂 Creating categories...");

  const labelCollections = await prisma.categoryLabel.upsert({
    where: { name: "Collections" },
    update: { order: 0 },
    create: { name: "Collections", order: 0 },
  });
  const labelRoasts = await prisma.categoryLabel.upsert({
    where: { name: "Roasts" },
    update: { order: 1 },
    create: { name: "Roasts", order: 1 },
  });
  const labelOrigins = await prisma.categoryLabel.upsert({
    where: { name: "Origins" },
    update: { order: 2 },
    create: { name: "Origins", order: 2 },
  });

  // Collection Categories
  const _catBlends = await prisma.category.upsert({
    where: { slug: "blends" },
    update: {},
    create: {
      name: "Blend",
      slug: "blends",
      order: 20,
    },
  });

  const _catMerch = await prisma.category.upsert({
    where: { slug: "merch" },
    update: {},
    create: {
      name: "Merch",
      slug: "merch",
      order: 25,
      showPurchaseOptions: true,
    },
  });

  const _catSingleOrigin = await prisma.category.upsert({
    where: { slug: "single-origin" },
    update: {},
    create: {
      name: "Single Origin",
      slug: "single-origin",
      order: 22,
    },
  });

  const _catMicroLot = await prisma.category.upsert({
    where: { slug: "micro-lot" },
    update: {},
    create: {
      name: "Micro Lot",
      slug: "micro-lot",
      order: 21,
    },
  });

  // One-shot slug migration: align any pre-existing "Staff Picks" category
  // (which may have been created with a non-canonical slug like "new-category"
  // via admin UI) to the canonical slug "staff-picks" so the search drawer
  // settings reference resolves and seedMenu's upsert by slug succeeds.
  // Idempotent: no-op once aligned.
  // The 6 demo chip categories + Staff Picks are then created/maintained by
  // seedMenu (CATEGORY_DEFS in prisma/seed/menu.ts). Adding them here would
  // be dead code since seedMenu deletes anything not in CATEGORY_DEFS.
  await prisma.category.updateMany({
    where: { name: "Staff Picks", slug: { not: "staff-picks" } },
    data: { slug: "staff-picks" },
  });

  // Roast Level Categories
  const _catDark = await prisma.category.upsert({
    where: { slug: "dark-roast" },
    update: {},
    create: {
      name: "Dark Roast",
      slug: "dark-roast",
      order: 3,
    },
  });

  const _catMedium = await prisma.category.upsert({
    where: { slug: "medium-roast" },
    update: {},
    create: {
      name: "Medium Roast",
      slug: "medium-roast",
      order: 2,
    },
  });

  const _catLight = await prisma.category.upsert({
    where: { slug: "light-roast" },
    update: {},
    create: {
      name: "Light Roast",
      slug: "light-roast",
      order: 1,
    },
  });

  // Origin Categories
  const origins = [
    "Ethiopia",
    "Kenya",
    "Colombia",
    "Guatemala",
    "Costa Rica",
    "Brazil",
    "Indonesia",
    "Papua New Guinea",
    "Honduras",
    "Mexico",
    "Peru",
    "Nicaragua",
    "El Salvador",
    "Rwanda",
    "Burundi",
    "Tanzania",
    "Panama",
    "Bolivia",
    "Yemen",
    "India",
    "Hawaii",
  ];

  const originCategories: Record<
    string,
    { id: string; name: string; slug: string }
  > = {};
  for (let i = 0; i < origins.length; i++) {
    const origin = origins[i];
    const slug = origin.toLowerCase().replace(/\s+/g, "-");
    originCategories[origin] = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: {
        name: origin,
        slug,
        order: 100 + i,
      },
    });
  }

  const attach = async (labelId: string, categoryId: string, order: number) => {
    await prisma.categoryLabelCategory.upsert({
      where: {
        labelId_categoryId: {
          labelId,
          categoryId,
        },
      },
      update: { order },
      create: { labelId, categoryId, order },
    });
  };

  await attach(labelCollections.id, _catBlends.id, 0);
  await attach(labelCollections.id, _catMicroLot.id, 1);
  await attach(labelCollections.id, _catSingleOrigin.id, 2);
  await attach(labelCollections.id, _catMerch.id, 3);

  await attach(labelRoasts.id, _catLight.id, 0);
  await attach(labelRoasts.id, _catMedium.id, 1);
  await attach(labelRoasts.id, _catDark.id, 2);

  await Promise.all(
    Object.values(originCategories).map((cat, idx) =>
      attach(labelOrigins.id, cat.id, idx)
    )
  );

  console.log("  ✅ Categories created/verified");
}
