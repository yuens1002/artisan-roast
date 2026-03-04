/**
 * User analytics service.
 *
 * Orchestrates queries for the /admin/analytics page.
 * Returns UserAnalyticsResponse (see contracts.ts).
 */

import type {
  UserAnalyticsResponse,
  UserAnalyticsKpis,
  PeriodPreset,
} from "../contracts";
import { getDateRange, toDateRangeDTO } from "../time";
import { computeConversionRate } from "../metrics-registry";
import { prisma } from "@/lib/prisma";
import {
  getBehaviorFunnel,
  getTopSearches,
  getTrendingProducts,
  getActivityByDay,
  getActivityBreakdown,
  getSearchCount,
} from "../queries/activity-queries";

export interface GetUserAnalyticsParams {
  period: PeriodPreset;
}

export async function getUserAnalytics(
  params: GetUserAnalyticsParams
): Promise<UserAnalyticsResponse> {
  const range = getDateRange(params.period);

  // Order count needed for funnel — query first
  const orderCount = await prisma.order.count({
    where: {
      createdAt: { gte: range.from, lt: range.to },
      status: { in: ["SHIPPED", "PICKED_UP", "PENDING", "DELIVERED"] },
    },
  });

  // Parallel queries
  const [funnel, trendingProducts, topSearches, activityByDay, activityBreakdown, totalSearches] =
    await Promise.all([
      getBehaviorFunnel(range, orderCount),
      getTrendingProducts(range, 10),
      getTopSearches(range, 10),
      getActivityByDay(range),
      getActivityBreakdown(range),
      getSearchCount(range),
    ]);

  const kpis: UserAnalyticsKpis = {
    totalProductViews: funnel[0]?.value ?? 0,
    totalAddToCart: funnel[1]?.value ?? 0,
    totalOrders: funnel[2]?.value ?? 0,
    conversionRate: computeConversionRate(
      funnel[2]?.value ?? 0,
      funnel[0]?.value ?? 0
    ),
    cartConversionRate: computeConversionRate(
      funnel[2]?.value ?? 0,
      funnel[1]?.value ?? 0
    ),
    totalSearches,
  };

  return {
    period: toDateRangeDTO(range),
    kpis,
    behaviorFunnel: funnel,
    trendingProducts,
    topSearches,
    activityByDay,
    activityBreakdown,
  };
}
