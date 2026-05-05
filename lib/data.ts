import { ProductType } from "@prisma/client";
import { PRODUCT_LIST_ORDER_BY } from "./catalog-sort";
import { prisma } from "./prisma";
import {
  type SiteSettings,
  defaultSettings,
  mapSettingsRecord,
} from "./site-settings";

// --- COMMON INCLUDE OBJECT ---
// We define this once to ensure all product cards get the same minimal data for rendering.
const productCardIncludes = {
  variants: {
    where: { isDisabled: false },
    orderBy: { order: "asc" as const },
    include: {
      images: {
        orderBy: { order: "asc" as const },
        take: 1,
      },
      purchaseOptions: {
        where: { type: "ONE_TIME" as const },
        orderBy: { priceInCents: "asc" as const },
        take: 1,
      },
    },
  },
  // This is the key: always fetch the primary category for linking.
  // `name` is also selected so the search drawer's MiniSearch index can
  // boost matches against primary-category names without an extra query.
  categories: {
    where: { isPrimary: true },
    include: {
      category: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  },
};
// ------------------------------

/**
 * Fetches all products marked as "isFeatured" and orders them.
 */
export async function getFeaturedProducts(type?: ProductType) {
  try {
    const products = await prisma.product.findMany({
      where: {
        isFeatured: true,
        isDisabled: false,
        ...(type ? { type } : {}),
      },
      orderBy: {
        featuredOrder: "asc",
      },
      include: productCardIncludes, // <-- USE COMMON INCLUDE
    });
    return products;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch featured products.");
  }
}

/**
 * Fetches a single product by its slug.
 * This is the CORRECTED version for /products/[productSlug]
 */
export async function getProductBySlug(productSlug?: string | null) {
  // Validate input
  if (!productSlug || typeof productSlug !== "string") {
    return null;
  }

  try {
    const product = await prisma.product.findUnique({
      where: {
        slug: productSlug,
        isDisabled: false,
      },
      include: {
        variants: {
          where: { isDisabled: false },
          orderBy: { order: "asc" },
          include: {
            images: { orderBy: { order: "asc" } },
            purchaseOptions: true,
          },
        },
        // We need all categories to match against the `from` param
        categories: {
          include: {
            category: {
              select: {
                name: true,
                slug: true,
                labels: {
                  include: { label: true },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
      },
    });
    return product;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch product.");
  }
}

/**
 * Fetches related products based on roast level.
 */
export async function getRelatedProducts(
  currentProductId: string,
  roastLevelSlug: string,
  count: number = 4
) {
  try {
    const products = await prisma.product.findMany({
      where: {
        type: ProductType.COFFEE,
        isDisabled: false,
        // Filter by the roast level category
        categories: {
          some: {
            category: {
              slug: roastLevelSlug,
            },
          },
        },
        id: {
          not: currentProductId, // Exclude the current product
        },
      },
      take: count, // Limit to 4 products
      include: productCardIncludes, // <-- USE COMMON INCLUDE
    });
    return products;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch related products.");
  }
}

/**
 * Fetches *only* the slugs for all products.
 * This is used by generateStaticParams for /products/[productSlug]
 */
export async function getAllProductSlugs() {
  try {
    const products = await prisma.product.findMany({
      select: {
        slug: true,
      },
      where: { isDisabled: false },
    });

    // We only need the slug for the static paths
    const valid = products
      .filter((p) => typeof p.slug === "string" && p.slug.length > 0)
      .map((p) => ({ productSlug: p.slug as string }));

    return valid;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch product slugs.");
  }
}

// --- CATEGORY FUNCTIONS ---

/**
 * Fetches all category slugs.
 * Used by generateStaticParams for /categories/[categorySlug]
 */
export async function getCategorySlugs() {
  try {
    const categories = await prisma.category.findMany({
      select: {
        slug: true,
      },
    });
    return categories;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch category slugs.");
  }
}

/**
 * Fetches a single category by its slug.
 */
export async function getCategoryBySlug(slug: string) {
  try {
    // All categories (Origins, Collections, Roasts) are now in the database.
    const category = await prisma.category.findUnique({
      where: { slug: slug },
      select: {
        id: true,
        name: true,
        slug: true,
        order: true,
        isUsingDefaultLabel: true,
        showPurchaseOptions: true,
        labels: {
          orderBy: { order: "asc" },
          include: {
            label: true,
          },
        },
      },
    });
    return category;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch category.");
  }
}

/**
 * Fetches all products belonging to a specific category.
 */
export async function getProductsByCategorySlug(categorySlug: string) {
  try {
    // Query the database relations for all categories.
    const products = await prisma.product.findMany({
      where: {
        // Filter by the many-to-many relation
        categories: {
          some: {
            category: {
              slug: categorySlug,
            },
          },
        },
        isDisabled: false,
      },
      include: productCardIncludes, // <-- USE COMMON INCLUDE
      // Same orderBy as the search drawer's /api/search/index endpoint so
      // the category page and the chip filter present products in the
      // same order. Shared via PRODUCT_LIST_ORDER_BY in lib/catalog-sort.ts.
      orderBy: PRODUCT_LIST_ORDER_BY,
    });
    return products;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch products by category.");
  }
}

/**
 * Fetches visible categories with their labels for navigation
 */
export async function getCategoryLabels() {
  try {
    const labels = await prisma.categoryLabel.findMany({
      where: {
        isVisible: true,
      },
      orderBy: { order: "asc" },
      include: {
        categories: {
          where: {
            category: {
              isVisible: true,
            },
          },
          orderBy: { order: "asc" },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                order: true,
              },
            },
          },
        },
      },
    });

    return labels.map((label) => ({
      id: label.id,
      name: label.name,
      icon: label.icon,
      order: label.order,
      categories: label.categories.map((entry) => ({
        id: entry.category.id,
        name: entry.category.name,
        slug: entry.category.slug,
        order: entry.order,
      })),
    }));
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch categories.");
  }
}

// Legacy aliases for backward compatibility
export async function getCategoryLabelsForHeader() {
  return getCategoryLabels();
}

export async function getCategoryLabelsForMobile() {
  return getCategoryLabels();
}

export async function getCategoryLabelsForFooter() {
  const data = await getCategoryLabels();
  const grouped: Record<string, { name: string; slug: string }[]> = {};
  const labelIcons: Record<string, string> = {};

  data.forEach((label) => {
    grouped[label.name] = label.categories.map((cat) => ({
      name: cat.name,
      slug: cat.slug,
    }));
    if (label.icon) {
      labelIcons[label.name] = label.icon;
    }
  });

  return { grouped, labelIcons };
}

/**
 * Deprecated: Use getCategoryLabels instead
 */
export async function getAllCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isVisible: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        order: true,
        labels: {
          orderBy: { order: "asc" },
          include: {
            label: true,
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    });
    return categories;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch categories.");
  }
}

/**
 * Deprecated: Use getCategoryLabelsForHeader instead
 */
export async function getCategoryLabelsWithCategories() {
  try {
    const labels = await prisma.categoryLabel.findMany({
      orderBy: { order: "asc" },
      include: {
        categories: {
          where: {
            category: {
              isVisible: true,
            },
          },
          orderBy: { order: "asc" },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                order: true,
              },
            },
          },
        },
      },
    });

    return labels.map((label) => ({
      id: label.id,
      name: label.name,
      icon: label.icon,
      order: label.order,
      categories: label.categories.map((entry) => ({
        id: entry.category.id,
        name: entry.category.name,
        slug: entry.category.slug,
        order: entry.order,
      })),
    }));
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch category labels.");
  }
}

// --- USER BEHAVIOR & RECOMMENDATION FUNCTIONS ---

/**
 * Fetches a user's purchase history with product details.
 * Returns orders with their items, sorted by most recent first.
 */
export async function getUserPurchaseHistory(userId: string) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: userId,
        status: {
          in: ["SHIPPED", "PICKED_UP"], // Only completed orders
        },
      },
      include: {
        items: {
          include: {
            purchaseOption: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                        tastingNotes: true,
                        roastLevel: true,
                        type: true,
                        categories: {
                          include: {
                            category: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20, // Limit to last 20 orders
    });

    return orders;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch user purchase history.");
  }
}

/**
 * Fetches a user's recently viewed products.
 * Returns unique products based on PRODUCT_VIEW activities.
 */
export async function getUserRecentViews(userId: string, limit: number = 10) {
  try {
    const activities = await prisma.userActivity.findMany({
      where: {
        userId: userId,
        activityType: "PRODUCT_VIEW",
        productId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit * 2, // Fetch extra to account for duplicates
      select: {
        productId: true,
        createdAt: true,
      },
    });

    // Get unique product IDs (most recent view of each product)
    const seenIds = new Set<string>();
    const uniqueProductIds = activities
      .filter((a) => {
        if (a.productId && !seenIds.has(a.productId)) {
          seenIds.add(a.productId);
          return true;
        }
        return false;
      })
      .map((a) => a.productId!)
      .slice(0, limit);

    // Fetch full product details
    if (uniqueProductIds.length === 0) return [];

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: uniqueProductIds,
        },
        type: ProductType.COFFEE,
        isDisabled: false,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        tastingNotes: true,
        roastLevel: true,
        type: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    // Preserve order from activities
    return uniqueProductIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch user recent views.");
  }
}

/**
 * Fetches a user's search history.
 * Returns unique search queries with their frequency.
 */
export async function getUserSearchHistory(userId: string, limit: number = 10) {
  try {
    const searches = await prisma.userActivity.findMany({
      where: {
        userId: userId,
        activityType: "SEARCH",
        searchQuery: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        searchQuery: true,
        createdAt: true,
      },
    });

    // Aggregate by query with frequency and most recent date
    const queryMap = new Map<
      string,
      { query: string; count: number; lastSearched: Date }
    >();

    searches.forEach((s) => {
      if (!s.searchQuery) return;
      const existing = queryMap.get(s.searchQuery);
      if (existing) {
        existing.count++;
        if (s.createdAt > existing.lastSearched) {
          existing.lastSearched = s.createdAt;
        }
      } else {
        queryMap.set(s.searchQuery, {
          query: s.searchQuery,
          count: 1,
          lastSearched: s.createdAt,
        });
      }
    });

    // Convert to array and sort by frequency, then by recency
    return Array.from(queryMap.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.lastSearched.getTime() - a.lastSearched.getTime();
      })
      .slice(0, limit);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch user search history.");
  }
}

/**
 * Aggregates all user behavioral data into a structured context for AI consumption.
 * This is the primary function used by the recommendation system.
 */
export async function getUserRecommendationContext(userId: string) {
  try {
    const [purchaseHistory, recentViews, searchHistory] = await Promise.all([
      getUserPurchaseHistory(userId),
      getUserRecentViews(userId, 15),
      getUserSearchHistory(userId, 10),
    ]);

    // Extract purchased products
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const purchasedProducts = (purchaseHistory as any)
      .flatMap(
        (order: {
          items: Array<{
            purchaseOption: {
              variant: {
                product: {
                  name: string;
                  tastingNotes: string[];
                  roastLevel: string | null;
                  type: ProductType;
                  categories: Array<{
                    category: { name: string; slug: string };
                  }>;
                };
              };
            };
          }>;
          createdAt: Date;
        }) =>
          order.items.map((item) => {
            return {
              name: item.purchaseOption.variant.product.name,
              roastLevel:
                item.purchaseOption.variant.product.roastLevel || "Medium",
              tastingNotes: item.purchaseOption.variant.product.tastingNotes,
              type: item.purchaseOption.variant.product.type,
              purchasedAt: order.createdAt,
            };
          })
      )
      .filter((p: { type: ProductType }) => p.type === ProductType.COFFEE);

    // Analyze preferences
    const roastLevelCounts = new Map<string, number>();
    const tastingNotesCounts = new Map<string, number>();

    purchasedProducts.forEach(
      (p: { roastLevel: string; tastingNotes: string[] }) => {
        roastLevelCounts.set(
          p.roastLevel,
          (roastLevelCounts.get(p.roastLevel) || 0) + 1
        );
        p.tastingNotes.forEach((note: string) => {
          tastingNotesCounts.set(note, (tastingNotesCounts.get(note) || 0) + 1);
        });
      }
    );

    const preferredRoastLevel = Array.from(roastLevelCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    const topTastingNotes = Array.from(tastingNotesCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);

    return {
      userId,
      purchaseHistory: {
        totalOrders: purchaseHistory.length,
        products: purchasedProducts,
        preferredRoastLevel: preferredRoastLevel || null,
        topTastingNotes,
      },
      recentViews: recentViews.map((p) => {
        return {
          name: p!.name,
          slug: p!.slug,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          roastLevel: (p as any).roastLevel || "Medium",
          tastingNotes: p!.tastingNotes,
        };
      }),
      searchHistory: searchHistory.map((s) => ({
        query: s.query,
        frequency: s.count,
      })),
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch user recommendation context.");
  }
}

/**
 * Fetches trending products based on UserActivity analytics.
 * Used for anonymous users or as fallback recommendations.
 */
export async function getTrendingProducts(
  limit: number = 6,
  daysBack: number = 7
) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    // Get product view counts from the last N days
    const productViews = await prisma.userActivity.groupBy({
      by: ["productId"],
      where: {
        activityType: "PRODUCT_VIEW",
        productId: {
          not: null,
        },
        createdAt: {
          gte: since,
        },
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _count: {
          productId: "desc",
        },
      },
      take: limit,
    });

    const productIds = (productViews as Array<{ productId: string | null }>)
      .map((pv) => pv.productId)
      .filter((id): id is string => id !== null);

    if (productIds.length === 0) return [];

    // Fetch full product details
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        type: ProductType.COFFEE,
        isDisabled: false,
      },
      include: productCardIncludes,
    });

    // Preserve order from analytics
    return productIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch trending products.");
  }
}

/**
 * Fetches all unique origins from the product catalog.
 * @deprecated Origins are now managed via the Category table.
 */
export async function getAllOrigins() {
  // This function is kept for backward compatibility if needed,
  // but should be replaced by querying categories with labelSetting.value="Origins".
  try {
    const labels = await prisma.categoryLabel.findMany({
      where: { name: "Origins" },
      include: {
        categories: {
          orderBy: { order: "asc" },
          include: { category: { select: { name: true } } },
        },
      },
    });
    if (!labels.length) return [];

    return labels[0].categories.map((c) => c.category.name);
  } catch (error) {
    console.error("Database Error:", error);
    return [];
  }
}

/**
 * Returns the available roast levels.
 * @deprecated Roast levels are now managed via the Category table.
 */
export async function getRoastLevels() {
  try {
    const labels = await prisma.categoryLabel.findMany({
      where: { name: "Roasts" },
      include: {
        categories: {
          orderBy: { order: "asc" },
          include: { category: { select: { name: true } } },
        },
      },
    });
    if (!labels.length) return [];

    return labels[0].categories.map((c) => c.category.name);
  } catch (error) {
    console.error("Database Error:", error);
    return [];
  }
}

/**
 * Returns special categories (Micro Lot, Blends).
 * @deprecated Special categories are now managed via the Category table.
 */
export function getSpecialCategories() {
  return ["Micro Lot", "Blends"];
}

// --- SITE SETTINGS ---

const publicSettingsKeys = [
  "store_name",
  "store_tagline",
  "store_description",
  "store_logo_url",
  "store_favicon_url",
  "contactEmail",
  "homepage_featured_heading",
  "homepage_recommendations_trending_heading",
  "homepage_recommendations_trending_description",
  "homepage_recommendations_personalized_heading",
  "homepage_recommendations_explore_all_text",
  "footer_categories_heading",
  "footer_quick_links_heading",
  "product_related_heading",
  "product_addons_section_title",
  "cart_addons_section_title",
  "homepage_hero_enabled",
  "homepage_hero_type",
  "homepage_hero_slides",
  "homepage_hero_video_url",
  "homepage_hero_video_poster_url",
  "homepage_hero_heading",
  "homepage_hero_tagline",
] as const;

// --- SEARCH DRAWER CONFIG ---

const FALLBACK_SEARCH_DRAWER_CHIPS_HEADING = "Top Categories";
const MAX_CHIPS = 6;
const CURATED_PRODUCTS_LIMIT = 6;

export interface SearchDrawerChip {
  name: string;
  slug: string;
}

/**
 * Curated products for the search drawer share the ProductCard payload shape
 * (FeaturedProduct) so they can render through the canonical
 * `<ProductCard product={p} />` component without an adapter layer.
 */
export type SearchDrawerCuratedProduct = Awaited<
  ReturnType<typeof getFeaturedProducts>
>[number];

export interface SearchDrawerConfig {
  chipsHeading: string;
  chips: SearchDrawerChip[];
  curatedCategoryName: string | null;
  curatedProducts: SearchDrawerCuratedProduct[];
}

/**
 * Fetches the search drawer configuration:
 *
 * - chipsHeading: name of the admin-selected CategoryLabel (drives chip row heading)
 * - chips: categories under that label, ordered by CategoryLabelCategory.order asc
 * - curatedCategoryName + curatedProducts: products under the admin-selected
 *   curated Category (default fallback section / shown when no search results)
 *
 * Defaults: when the chip-label setting is missing or points to a deleted label,
 * falls back to the 1st CategoryLabel by `order` (any visibility — hidden labels
 * work for search even though they're hidden from product menu nav). When the
 * curated-category setting is missing or points to a deleted category, falls
 * back to the 1st Category by `order`.
 */
export async function getSearchDrawerConfig(): Promise<SearchDrawerConfig> {
  try {
    const settingsRows = await prisma.siteSettings.findMany({
      where: {
        key: {
          in: ["search_drawer_chip_label", "search_drawer_curated_category"],
        },
      },
      select: { key: true, value: true },
    });

    const record = settingsRows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    // --- Chip label resolution ---
    // Admin setting stores CategoryLabel.id. Hidden labels (isVisible: false)
    // are valid here — search drawer reads them anyway.
    const chipLabelId = record.search_drawer_chip_label || null;
    let label = chipLabelId
      ? await prisma.categoryLabel.findUnique({
          where: { id: chipLabelId },
          select: {
            name: true,
            categories: {
              orderBy: { order: "asc" },
              take: MAX_CHIPS,
              select: { category: { select: { name: true, slug: true } } },
            },
          },
        })
      : null;

    // Fallback: setting missing or pointing at a deleted label → 1st by order.
    if (!label) {
      label = await prisma.categoryLabel.findFirst({
        orderBy: { order: "asc" },
        select: {
          name: true,
          categories: {
            orderBy: { order: "asc" },
            take: MAX_CHIPS,
            select: { category: { select: { name: true, slug: true } } },
          },
        },
      });
    }

    const chipsHeading = label?.name ?? FALLBACK_SEARCH_DRAWER_CHIPS_HEADING;
    const chips: SearchDrawerChip[] =
      label?.categories.map((c) => ({
        name: c.category.name,
        slug: c.category.slug,
      })) ?? [];

    // --- Curated category resolution ---
    // Empty string sentinel = admin explicitly cleared (no curated section).
    // Missing key OR slug pointing at a deleted category = fallback to 1st by order.
    const hasCuratedKey = "search_drawer_curated_category" in record;
    const curatedSlugSetting = record.search_drawer_curated_category;
    const curatedExplicitlyCleared = hasCuratedKey && curatedSlugSetting === "";

    let curatedCategoryName: string | null = null;
    let curatedProducts: SearchDrawerCuratedProduct[] = [];

    if (!curatedExplicitlyCleared) {
      let curated = curatedSlugSetting
        ? await prisma.category.findUnique({
            where: { slug: curatedSlugSetting },
            select: { name: true, slug: true },
          })
        : null;

      if (!curated) {
        curated = await prisma.category.findFirst({
          orderBy: { order: "asc" },
          select: { name: true, slug: true },
        });
      }

      if (curated) {
        curatedCategoryName = curated.name;
        curatedProducts = await prisma.product.findMany({
          where: {
            isDisabled: false,
            categories: { some: { category: { slug: curated.slug } } },
          },
          include: productCardIncludes,
          take: CURATED_PRODUCTS_LIMIT,
        });
      }
    }

    return { chipsHeading, chips, curatedCategoryName, curatedProducts };
  } catch (error) {
    console.error("getSearchDrawerConfig failed:", error);
    return {
      chipsHeading: FALLBACK_SEARCH_DRAWER_CHIPS_HEADING,
      chips: [],
      curatedCategoryName: null,
      curatedProducts: [],
    };
  }
}

/**
 * Fetches public site settings directly from the database.
 * Server-side equivalent of the /api/settings/public endpoint.
 */
export async function getPublicSiteSettings(): Promise<SiteSettings> {
  try {
    const settings = await prisma.siteSettings.findMany({
      where: { key: { in: [...publicSettingsKeys] } },
      select: { key: true, value: true },
    });

    const record = settings.reduce(
      (acc, { key, value }) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    return mapSettingsRecord(record);
  } catch (error) {
    console.error("Database Error:", error);
    return defaultSettings;
  }
}

// --- HOME RECOMMENDATIONS ---

export interface HomeRecommendationsResult {
  products: Awaited<ReturnType<typeof getFeaturedProducts>>;
  isPersonalized: boolean;
  source: "behavioral" | "trending";
  userPreferences?: {
    preferredRoastLevel?: string;
    topTastingNotes?: string[];
  };
}

/**
 * Fetches personalized or trending product recommendations.
 * Server-side equivalent of the /api/recommendations endpoint.
 */
export async function getHomeRecommendations(
  userId?: string,
  limit = 6,
  excludeId?: string
): Promise<HomeRecommendationsResult> {
  // Helper to format trending results
  const trendingResult = async (): Promise<HomeRecommendationsResult> => {
    const trending = await getTrendingProducts(limit + 1, 7);
    const filtered = trending
      .filter((p): p is NonNullable<typeof p> => p != null)
      .filter((p) => !excludeId || p.id !== excludeId)
      .slice(0, limit);
    return { products: filtered, isPersonalized: false, source: "trending" };
  };

  if (!userId) return trendingResult();

  // Authenticated user — try personalized recommendations
  let userContext;
  try {
    userContext = await getUserRecommendationContext(userId);
  } catch {
    return trendingResult();
  }

  const hasHistory =
    userContext.purchaseHistory.totalOrders > 0 ||
    userContext.recentViews.length > 0;

  if (!hasHistory) return trendingResult();

  // Score products based on user preferences
  const purchasedProductNames = userContext.purchaseHistory.products.map(
    (p: { name: string }) => p.name
  );
  const recentlyViewedNames = userContext.recentViews.map((v) => v.name);

  const allProducts = await prisma.product.findMany({
    where: {
      type: ProductType.COFFEE,
      isDisabled: false,
      ...(excludeId && { id: { not: excludeId } }),
    },
    include: productCardIncludes,
  });

  const scoredProducts = allProducts.map((product) => {
    let score = 0;

    const matchingNotes = product.tastingNotes.filter((note) =>
      userContext.purchaseHistory.topTastingNotes.includes(note)
    );
    score += matchingNotes.length * 5;

    if (
      recentlyViewedNames.includes(product.name) &&
      !purchasedProductNames.includes(product.name)
    ) {
      score += 3;
    }

    if (purchasedProductNames.slice(0, 3).includes(product.name)) {
      score -= 20;
    }

    return { product, score };
  });

  const recommendations = scoredProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product }) => product);

  return {
    products: recommendations,
    isPersonalized: true,
    source: "behavioral",
    userPreferences: {
      preferredRoastLevel: userContext.purchaseHistory.preferredRoastLevel ?? undefined,
      topTastingNotes: userContext.purchaseHistory.topTastingNotes.slice(0, 3),
    },
  };
}
