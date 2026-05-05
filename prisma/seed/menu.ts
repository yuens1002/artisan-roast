import {
  CategoryKind,
  PrismaClient,
  ProductType,
  RoastLevel,
} from "@prisma/client";

const LABEL_DEFS: {
  name: string;
  icon: string;
  isVisible?: boolean;
  // Optional explicit category slugs (in display order). Used by labels that
  // attach existing categories — e.g. the search-drawer-only "Top Categories"
  // label below — without owning those categories' canonical menu slot.
  attachedSlugs?: string[];
}[] = [
  { name: "By Roast Level", icon: "Rainbow" },
  { name: "By Taste Profile", icon: "Grape" },
  { name: "Origins", icon: "Earth" },
  { name: "Blends", icon: "Blend" },
  { name: "Collections", icon: "Combine" },
  { name: "Merch", icon: "Star" },
  // Hidden label that drives the search drawer's chip row. The search drawer
  // reads CategoryLabel by id without filtering on isVisible, so this label
  // does NOT appear in the product menu nav but its categories DO appear as
  // chips in the search drawer.
  {
    name: "Top Categories",
    icon: "Sparkles",
    isVisible: false,
    attachedSlugs: [
      "single-origin",
      "fruity-floral",
      "medium-roast",
      "cold-brew-blends",
      "drinkware",
      "central-america",
    ],
  },
];

const CATEGORY_DEFS = [
  // Roast
  {
    name: "Light Roast",
    slug: "light-roast",
    label: "By Roast Level",
    order: 1,
  },
  {
    name: "Medium Roast",
    slug: "medium-roast",
    label: "By Roast Level",
    order: 2,
  },
  { name: "Dark Roast", slug: "dark-roast", label: "By Roast Level", order: 3 },
  // Taste
  {
    name: "Nutty & Chocolatey",
    slug: "nutty-chocolatey",
    label: "By Taste Profile",
    order: 10,
  },
  {
    name: "Fruity & Floral",
    slug: "fruity-floral",
    label: "By Taste Profile",
    order: 11,
  },
  {
    name: "Spicy & Earthy",
    slug: "spicy-earthy",
    label: "By Taste Profile",
    order: 12,
  },
  // Origins
  {
    name: "Central America",
    slug: "central-america",
    label: "Origins",
    order: 20,
  },
  { name: "Islands", slug: "islands", label: "Origins", order: 21 },
  { name: "Africa", slug: "africa", label: "Origins", order: 22 },
  { name: "Asia", slug: "asia", label: "Origins", order: 23 },
  { name: "South America", slug: "south-america", label: "Origins", order: 24 },
  // Blends
  {
    name: "Espresso Blends",
    slug: "espresso-blends",
    label: "Blends",
    order: 30,
  },
  {
    name: "Filter/Drip Blends",
    slug: "filter-drip-blends",
    label: "Blends",
    order: 31,
  },
  {
    name: "Cold Brew Blends",
    slug: "cold-brew-blends",
    label: "Blends",
    order: 32,
  },
  // Collections
  {
    name: "New Arrivals",
    slug: "new-arrivals",
    label: "Collections",
    order: 40,
  },
  { name: "Micro Lot", slug: "micro-lot", label: "Collections", order: 41 },
  { name: "Single Origin", slug: "single-origin", label: "Collections", order: 42 },
  { name: "Staff Picks", slug: "staff-picks", label: "Collections", order: 43 },
  // Merch
  {
    name: "Drinkware",
    slug: "drinkware",
    label: "Merch",
    order: 50,
    kind: CategoryKind.MERCH,
  },
  {
    name: "Wearables",
    slug: "wearables",
    label: "Merch",
    order: 51,
    kind: CategoryKind.MERCH,
  },
  {
    name: "Supplies",
    slug: "supplies",
    label: "Merch",
    order: 52,
    kind: CategoryKind.MERCH,
  },
  {
    name: "Brewing",
    slug: "brewing",
    label: "Merch",
    order: 53,
    kind: CategoryKind.MERCH,
  },
  {
    name: "Gadgets",
    slug: "gadgets",
    label: "Merch",
    order: 54,
    kind: CategoryKind.MERCH,
  },
];

const REGION_COUNTRIES: Record<string, string[]> = {
  "Central America": [
    "Guatemala",
    "Honduras",
    "Costa Rica",
    "El Salvador",
    "Nicaragua",
    "Panama",
  ],
  Islands: ["Papua New Guinea", "PNG", "Hawaii", "Sumatra"],
  Africa: ["Ethiopia", "Kenya", "Rwanda", "Burundi", "Tanzania"],
  Asia: ["Yemen", "India", "Indonesia", "Vietnam"],
  "South America": ["Colombia", "Brazil", "Peru", "Bolivia"],
};

const TASTE_KEYWORDS: Record<string, string[]> = {
  "Nutty & Chocolatey": [
    "nutty",
    "nut",
    "almond",
    "hazelnut",
    "pecan",
    "walnut",
    "cocoa",
    "chocolate",
    "cacao",
  ],
  "Fruity & Floral": [
    "fruit",
    "berry",
    "citrus",
    "orange",
    "lemon",
    "lime",
    "grapefruit",
    "apple",
    "pear",
    "peach",
    "plum",
    "apricot",
    "pineapple",
    "mango",
    "passion",
    "cherry",
    "floral",
    "jasmine",
    "rose",
  ],
  "Spicy & Earthy": [
    "spice",
    "spicy",
    "earthy",
    "cedar",
    "tobacco",
    "clove",
    "cinnamon",
    "pepper",
    "herbal",
  ],
};

const MERCH_KEYWORDS: Record<string, string[]> = {
  Drinkware: ["mug", "tumbler", "bottle", "cup"],
  Wearables: ["tee", "shirt", "hoodie", "cap", "hat", "tote"],
  Supplies: ["filter", "filters", "towel", "canister", "spoon"],
  Brewing: ["kettle", "dripper", "press", "brewer"],
  Gadgets: ["scale", "grinder", "gadget"],
};

function detectRoastLevel(
  name: string,
  description: string | null | undefined
): RoastLevel {
  const haystack = `${name} ${description ?? ""}`.toLowerCase();
  if (
    haystack.includes("dark") ||
    haystack.includes("espresso") ||
    haystack.includes("italian") ||
    haystack.includes("french")
  ) {
    return RoastLevel.DARK;
  }
  if (haystack.includes("light") || haystack.includes("honey")) {
    return RoastLevel.LIGHT;
  }
  return RoastLevel.MEDIUM;
}

function findTasteCategories(texts: string[]): string[] {
  const joined = texts.filter(Boolean).join(" ").toLowerCase();
  const found: string[] = [];
  for (const [cat, words] of Object.entries(TASTE_KEYWORDS)) {
    if (words.some((w) => joined.includes(w))) found.push(cat);
  }
  return found;
}

function mapRegions(origins: string[]): string[] {
  const out = new Set<string>();
  for (const origin of origins) {
    const lower = origin.toLowerCase();
    for (const [region, countries] of Object.entries(REGION_COUNTRIES)) {
      if (countries.some((c) => lower.includes(c.toLowerCase()))) {
        out.add(region);
      }
    }
  }
  return [...out];
}

function mapBlendCategory(
  name: string,
  description: string | null | undefined
): string | null {
  const haystack = `${name} ${description ?? ""}`.toLowerCase();
  if (haystack.includes("cold brew")) return "Cold Brew Blends";
  if (haystack.includes("espresso")) return "Espresso Blends";
  if (haystack.includes("blend")) return "Filter/Drip Blends";
  return null;
}

function mapMerchCategory(slug: string, name: string): string {
  const haystack = `${slug} ${name}`.toLowerCase();
  for (const [cat, words] of Object.entries(MERCH_KEYWORDS)) {
    if (words.some((w) => haystack.includes(w))) return cat;
  }
  return "Supplies"; // safe default
}

async function ensureNewArrivalsTag(prisma: PrismaClient) {
  const name = "new-arrivals";
  const existing = await prisma.tag.findUnique({ where: { name } });
  if (existing) return existing;
  return prisma.tag.create({
    data: { name, label: "New Arrivals", color: "BLUE" },
  });
}

export async function seedMenu(prisma: PrismaClient) {
  console.log("\n📑 Aligning menu (labels, categories, assignments)...");

  // Upsert labels
  const labels = new Map<string, string>();
  const allowedLabelNames = new Set(LABEL_DEFS.map((l) => l.name));
  for (let i = 0; i < LABEL_DEFS.length; i += 1) {
    const { name, icon, isVisible } = LABEL_DEFS[i];
    const visible = isVisible ?? true;
    const label = await prisma.categoryLabel.upsert({
      where: { name },
      update: { order: i + 1, icon, isVisible: visible },
      create: { name, order: i + 1, icon, isVisible: visible },
    });
    labels.set(name, label.id);
  }

  // Remove old labels not in allowed set
  const obsoleteLabels = await prisma.categoryLabel.findMany({
    where: { name: { notIn: Array.from(allowedLabelNames) } },
    select: { id: true, name: true },
  });
  if (obsoleteLabels.length) {
    const obsoleteLabelIds = obsoleteLabels.map((l) => l.id);
    await prisma.categoryLabelCategory.deleteMany({
      where: { labelId: { in: obsoleteLabelIds } },
    });
    await prisma.categoryLabel.deleteMany({
      where: { id: { in: obsoleteLabelIds } },
    });
  }

  // Upsert categories and label links
  const allowedNames = new Set(CATEGORY_DEFS.map((c) => c.name));
  const categoryIds = new Map<string, string>();

  for (const cat of CATEGORY_DEFS) {
    const categoryKind = cat.kind ?? CategoryKind.COFFEE;
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {
        slug: cat.slug,
        name: cat.name,
        order: cat.order,
        kind: categoryKind,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        order: cat.order,
        kind: categoryKind,
        showPurchaseOptions: true,
      },
    });
    categoryIds.set(cat.name, category.id);

    const labelId = labels.get(cat.label);
    if (labelId) {
      await prisma.categoryLabelCategory.upsert({
        where: { labelId_categoryId: { labelId, categoryId: category.id } },
        update: { order: cat.order },
        create: { labelId, categoryId: category.id, order: cat.order },
      });
    }
  }

  // Remove old categories not in allowed set
  const obsolete = await prisma.category.findMany({
    where: { name: { notIn: Array.from(allowedNames) } },
    select: { id: true, name: true },
  });
  const obsoleteIds = obsolete.map((c) => c.id);
  if (obsoleteIds.length) {
    await prisma.categoryLabelCategory.deleteMany({
      where: { categoryId: { in: obsoleteIds } },
    });
    await prisma.categoriesOnProducts.deleteMany({
      where: { categoryId: { in: obsoleteIds } },
    });
    await prisma.category.deleteMany({ where: { id: { in: obsoleteIds } } });
  }

  // Refresh map after deletions
  const categoryMap = new Map<string, string>();
  const freshCategories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
  });
  const slugToId = new Map<string, string>();
  freshCategories.forEach((c) => {
    categoryMap.set(c.name, c.id);
    slugToId.set(c.slug, c.id);
  });

  // Multi-label attachments: labels with `attachedSlugs` reference categories
  // that already live under a different canonical label. Used by hidden labels
  // (e.g. "Top Categories" for the search drawer) to surface existing
  // categories without claiming them in the product menu nav.
  for (const def of LABEL_DEFS) {
    if (!def.attachedSlugs || def.attachedSlugs.length === 0) continue;
    const labelId = labels.get(def.name);
    if (!labelId) continue;
    for (let i = 0; i < def.attachedSlugs.length; i += 1) {
      const slug = def.attachedSlugs[i];
      const categoryId = slugToId.get(slug);
      if (!categoryId) {
        console.warn(
          `  ⚠ "${def.name}" references missing category slug "${slug}"`
        );
        continue;
      }
      await prisma.categoryLabelCategory.upsert({
        where: { labelId_categoryId: { labelId, categoryId } },
        update: { order: i },
        create: { labelId, categoryId, order: i },
      });
    }
  }

  // Assign categories to coffee products
  const coffees = await prisma.product.findMany({
    where: { type: ProductType.COFFEE },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      tastingNotes: true,
      origin: true,
      roastLevel: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  for (const coffee of coffees) {
    const targets = new Set<string>();

    // Primary category (added FIRST → wins `isPrimary: true` in the createMany
    // map below). Mirrors prisma/seed/products.ts intent:
    //   - Blends (Espresso / Filter-Drip / Cold Brew) → that blend category
    //   - All other coffees → "Single Origin"
    // Roast / taste / region / micro-lot stay as secondary attachments so they
    // still surface on category pages, but are NOT primary — that ensures the
    // search drawer's chip filter (which uses the primary category) finds
    // products under origin / collection chips, not just roast chips.
    const blendCat = mapBlendCategory(coffee.name, coffee.description);
    targets.add(blendCat ?? "Single Origin");

    const roastLevel =
      coffee.roastLevel ?? detectRoastLevel(coffee.name, coffee.description);
    targets.add(
      roastLevel === RoastLevel.DARK
        ? "Dark Roast"
        : roastLevel === RoastLevel.LIGHT
          ? "Light Roast"
          : "Medium Roast"
    );

    // Taste categories — match against tastingNotes ONLY (not description).
    // Marketing copy in descriptions uses fruit/spice/cocoa words liberally
    // even for coffees that don't actually taste that way, which produced ~86%
    // overlap between Fruity & Floral and Medium Roast in the demo catalog.
    // tastingNotes are explicit cupping signals — using only those produces
    // distinct, cuppable categories.
    //
    // Roast-aware gating layered on top mirrors basic coffee domain knowledge:
    // - Fruity & Floral acidity rarely survives DARK roasts (caramelization
    //   suppresses the bright top notes).
    // - Spicy & Earthy notes typically need MEDIUM+ roast development to
    //   emerge — LIGHT roasts retain green/grassy character instead.
    for (const cat of findTasteCategories(coffee.tastingNotes ?? [])) {
      if (cat === "Fruity & Floral" && roastLevel === RoastLevel.DARK) continue;
      if (cat === "Spicy & Earthy" && roastLevel === RoastLevel.LIGHT) continue;
      targets.add(cat);
    }
    mapRegions(coffee.origin ?? []).forEach((c) => targets.add(c));
    if (
      `${coffee.name} ${coffee.description ?? ""}`
        .toLowerCase()
        .includes("micro")
    ) {
      targets.add("Micro Lot");
    }

    const targetIds = Array.from(targets)
      .map((name) => categoryMap.get(name))
      .filter(Boolean) as string[];

    await prisma.categoriesOnProducts.deleteMany({
      where: { productId: coffee.id },
    });
    if (targetIds.length) {
      await prisma.categoriesOnProducts.createMany({
        data: targetIds.map((id, idx) => ({
          productId: coffee.id,
          categoryId: id,
          isPrimary: idx === 0,
        })),
      });
    }

    await prisma.product.update({
      where: { id: coffee.id },
      data: { roastLevel },
    });
  }

  // Assign merch categories by keyword
  const merch = await prisma.product.findMany({
    where: { type: ProductType.MERCH },
    select: { id: true, name: true, slug: true },
  });

  for (const item of merch) {
    const catName = mapMerchCategory(item.slug, item.name);
    const catId = categoryMap.get(catName);
    if (!catId) continue;
    await prisma.categoriesOnProducts.deleteMany({
      where: { productId: item.id },
    });
    await prisma.categoriesOnProducts.create({
      data: { productId: item.id, categoryId: catId, isPrimary: true },
    });
  }

  // New Arrivals tagging
  const newArrivalsId = categoryMap.get("New Arrivals");
  if (newArrivalsId) {
    const tag = await ensureNewArrivalsTag(prisma);
    const latest = coffees.slice(0, 8);
    let count = 0;
    for (const coffee of latest) {
      if (count >= 4) break;
      const exists = await prisma.categoriesOnProducts.findFirst({
        where: { productId: coffee.id, categoryId: newArrivalsId },
      });
      if (!exists) {
        await prisma.categoriesOnProducts.create({
          data: {
            productId: coffee.id,
            categoryId: newArrivalsId,
            isPrimary: false,
          },
        });
        count += 1;
      }
      const tagExists = await prisma.productTag.findFirst({
        where: { productId: coffee.id, tagId: tag.id },
      });
      if (!tagExists) {
        await prisma.productTag.create({
          data: { productId: coffee.id, tagId: tag.id },
        });
      }
    }
  }

  // Staff Picks attachments — populate the search drawer's curated section.
  // Reseed overwrites these (matching the search-drawer settings overwrite
  // pattern) so the demo showcase stays fresh. 4 coffees + 2 merch = 6 items.
  const staffPicksId = categoryMap.get("Staff Picks");
  if (staffPicksId) {
    // Clear existing attachments then re-attach
    await prisma.categoriesOnProducts.deleteMany({
      where: { categoryId: staffPicksId },
    });

    const coffeePicks = coffees.slice(0, 4);
    const merchPicks = merch.slice(0, 2);
    const picks = [
      ...coffeePicks.map((p) => p.id),
      ...merchPicks.map((p) => p.id),
    ];

    for (const productId of picks) {
      // Use isPrimary: false so we don't override the product's primary
      // category (which drives breadcrumb / canonical category display).
      await prisma.categoriesOnProducts.create({
        data: { productId, categoryId: staffPicksId, isPrimary: false },
      });
    }
  }

  // Search drawer settings — RESEED OVERWRITES (update: { value }) so the
  // demo showcase is restored on every refresh. Admin can still edit via
  // /admin/settings/search and changes persist until the next reseed.
  // Same pattern as app.weightUnit / app.locationType.
  const topCategoriesLabelId = labels.get("Top Categories");
  if (topCategoriesLabelId) {
    await prisma.siteSettings.upsert({
      where: { key: "search_drawer_chip_label" },
      update: { value: topCategoriesLabelId },
      create: { key: "search_drawer_chip_label", value: topCategoriesLabelId },
    });
  }
  await prisma.siteSettings.upsert({
    where: { key: "search_drawer_curated_category" },
    update: { value: "staff-picks" },
    create: { key: "search_drawer_curated_category", value: "staff-picks" },
  });

  console.log("  ✓ Menu aligned with new structure");
}
