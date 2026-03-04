/**
 * UserActivity queries for analytics dashboards.
 *
 * Provides behavior funnel data and search analytics.
 */

import { prisma } from "@/lib/prisma";
import type { FunnelStep, RankedItem } from "../contracts";
import type { DateRange } from "../time";
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
