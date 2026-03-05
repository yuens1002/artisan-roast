/**
 * UserActivity queries for analytics dashboards.
 *
 * Provides behavior funnel data, search analytics, trending products,
 * and daily activity metrics.
 */

import { prisma } from "@/lib/prisma";
import type { FunnelStep, RankedItem, ChartDataPoint, ActivityByDayPoint } from "../contracts";
import type { DateRange } from "../time";
import { toDateKey, generateDateKeys } from "../time";
import { computeConversionRate } from "../metrics-registry";

// ---------------------------------------------------------------------------
// Behavior funnel: Views → Cart → Orders
// ---------------------------------------------------------------------------

export async function getBehaviorFunnel(
  range: DateRange,
  orderCount: number
): Promise<FunnelStep[]> {
  const dateFilter = { gte: range.from, lt: range.to };

  const [viewCount, cartCount] = await Promise.all([
    prisma.userActivity.count({
      where: {
        activityType: "PRODUCT_VIEW",
        createdAt: dateFilter,
      },
    }),
    prisma.userActivity.count({
      where: {
        activityType: "ADD_TO_CART",
        createdAt: dateFilter,
      },
    }),
  ]);

  return [
    { label: "Product Views", value: viewCount },
    {
      label: "Add to Cart",
      value: cartCount,
      conversionFromPrevious: computeConversionRate(cartCount, viewCount),
    },
    {
      label: "Orders",
      value: orderCount,
      conversionFromPrevious: computeConversionRate(orderCount, cartCount),
    },
  ];
}

// ---------------------------------------------------------------------------
// Top search queries
// ---------------------------------------------------------------------------

export async function getTopSearches(
  range: DateRange,
  limit = 5
): Promise<RankedItem[]> {
  const searches = await prisma.userActivity.groupBy({
    by: ["searchQuery"],
    where: {
      activityType: "SEARCH",
      createdAt: { gte: range.from, lt: range.to },
      searchQuery: { not: null },
    },
    _count: true,
    orderBy: { _count: { searchQuery: "desc" } },
    take: limit,
  });

  return searches.map((s, i) => ({
    rank: i + 1,
    label: s.searchQuery ?? "",
    value: s._count,
    href: `/admin/analytics?search=${encodeURIComponent(s.searchQuery ?? "")}`,
  }));
}

// ---------------------------------------------------------------------------
// Trending products (most viewed)
// ---------------------------------------------------------------------------

export async function getTrendingProducts(
  range: DateRange,
  limit = 10
): Promise<RankedItem[]> {
  const dateFilter = { gte: range.from, lt: range.to };

  const productViews = await prisma.userActivity.groupBy({
    by: ["productId"],
    where: {
      activityType: "PRODUCT_VIEW",
      productId: { not: null },
      createdAt: dateFilter,
    },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: limit,
  });

  const productIds = productViews
    .map((pv) => pv.productId)
    .filter((id): id is string => id !== null);

  if (productIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true },
  });

  const nameMap = new Map(products.map((p) => [p.id, { name: p.name, slug: p.slug }]));

  return productViews
    .map((pv, i) => {
      const product = pv.productId ? nameMap.get(pv.productId) : null;
      return {
        rank: i + 1,
        label: product?.name ?? "Unknown",
        value: pv._count.productId,
        href: product?.slug ? `/products/${product.slug}` : undefined,
      };
    });
}

// ---------------------------------------------------------------------------
// Daily activity trend
// ---------------------------------------------------------------------------

export async function getActivityByDay(
  range: DateRange
): Promise<ChartDataPoint[]> {
  const activities = await prisma.userActivity.findMany({
    where: { createdAt: { gte: range.from, lt: range.to } },
    select: { createdAt: true },
  });

  // Bucket counts by day
  const countByDay = new Map<string, number>();
  for (const a of activities) {
    const key = toDateKey(a.createdAt);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  // Fill all days in range
  return generateDateKeys(range).map((date) => ({
    date,
    primary: countByDay.get(date) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Activity breakdown by type
// ---------------------------------------------------------------------------

export async function getActivityBreakdown(
  range: DateRange
): Promise<{ label: string; value: number }[]> {
  const breakdown = await prisma.userActivity.groupBy({
    by: ["activityType"],
    where: { createdAt: { gte: range.from, lt: range.to } },
    _count: { activityType: true },
  });

  return breakdown.map((b) => ({
    label: b.activityType.replace(/_/g, " "),
    value: b._count.activityType,
  }));
}

// ---------------------------------------------------------------------------
// Search count
// ---------------------------------------------------------------------------

export async function getSearchCount(range: DateRange): Promise<number> {
  return prisma.userActivity.count({
    where: {
      activityType: "SEARCH",
      createdAt: { gte: range.from, lt: range.to },
    },
  });
}

// ---------------------------------------------------------------------------
// Page view count
// ---------------------------------------------------------------------------

export async function getPageViewCount(range: DateRange): Promise<number> {
  return prisma.userActivity.count({
    where: {
      activityType: "PAGE_VIEW",
      createdAt: { gte: range.from, lt: range.to },
    },
  });
}

// ---------------------------------------------------------------------------
// Daily activity by type (stacked chart)
// ---------------------------------------------------------------------------

export async function getActivityByDayByType(
  range: DateRange
): Promise<ActivityByDayPoint[]> {
  const activities = await prisma.userActivity.findMany({
    where: { createdAt: { gte: range.from, lt: range.to } },
    select: { createdAt: true, activityType: true },
  });

  // Bucket by day + type
  const buckets = new Map<string, Record<string, number>>();
  for (const a of activities) {
    const key = toDateKey(a.createdAt);
    const bucket = buckets.get(key) ?? {};
    bucket[a.activityType] = (bucket[a.activityType] ?? 0) + 1;
    buckets.set(key, bucket);
  }

  return generateDateKeys(range).map((date) => {
    const b = buckets.get(date) ?? {};
    return {
      date,
      pageView: b["PAGE_VIEW"] ?? 0,
      productView: b["PRODUCT_VIEW"] ?? 0,
      search: b["SEARCH"] ?? 0,
      addToCart: b["ADD_TO_CART"] ?? 0,
      removeFromCart: b["REMOVE_FROM_CART"] ?? 0,
    };
  });
}
