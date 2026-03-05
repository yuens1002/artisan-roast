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
  CompareMode,
  FunnelStep,
} from "../contracts";
import {
  getComparisonRange,
  resolveRange,
  toDateRangeDTO,
  type DateRange,
} from "../time";
import { computeConversionRate } from "../metrics-registry";
import { prisma } from "@/lib/prisma";
import {
  getBehaviorFunnel,
  getTopSearches,
  getTrendingProducts,
  getActivityByDayByType,
  getSearchCount,
  getPageViewCount,
} from "../queries/activity-queries";

export type GetUserAnalyticsParams =
  | { period: PeriodPreset; compare: CompareMode }
  | { customFrom: string; customTo: string; compare: CompareMode };

const VALID_ORDER_STATUSES = ["SHIPPED", "PICKED_UP", "PENDING", "DELIVERED", "OUT_FOR_DELIVERY"] as const;

function kpisFromFunnel(
  funnel: FunnelStep[],
  totalSearches: number,
  totalPageViews: number
): UserAnalyticsKpis {
  return {
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
    totalPageViews,
  };
}

async function buildKpisForRange(range: DateRange): Promise<UserAnalyticsKpis> {
  const orderCount = await prisma.order.count({
    where: {
      createdAt: { gte: range.from, lt: range.to },
      status: { in: [...VALID_ORDER_STATUSES] },
    },
  });

  const [funnel, totalSearches, totalPageViews] = await Promise.all([
    getBehaviorFunnel(range, orderCount),
    getSearchCount(range),
    getPageViewCount(range),
  ]);

  return kpisFromFunnel(funnel, totalSearches, totalPageViews);
}

export async function getUserAnalytics(
  params: GetUserAnalyticsParams
): Promise<UserAnalyticsResponse> {
  const range = "customFrom" in params
    ? resolveRange({ customFrom: params.customFrom, customTo: params.customTo })
    : resolveRange({ period: params.period });
  const compRange = getComparisonRange(range, params.compare);

  // Order count needed for funnel
  const orderCount = await prisma.order.count({
    where: {
      createdAt: { gte: range.from, lt: range.to },
      status: { in: [...VALID_ORDER_STATUSES] },
    },
  });

  // Parallel queries
  const [
    funnel,
    totalSearches,
    totalPageViews,
    trendingProducts,
    topSearches,
    activityByDay,
    comparisonKpis,
  ] = await Promise.all([
    getBehaviorFunnel(range, orderCount),
    getSearchCount(range),
    getPageViewCount(range),
    getTrendingProducts(range, 10),
    getTopSearches(range, 10),
    getActivityByDayByType(range),
    compRange ? buildKpisForRange(compRange) : Promise.resolve(null),
  ]);

  const kpis = kpisFromFunnel(funnel, totalSearches, totalPageViews);

  return {
    period: toDateRangeDTO(range),
    comparison: compRange ? toDateRangeDTO(compRange) : null,
    kpis,
    comparisonKpis,
    behaviorFunnel: funnel,
    trendingProducts,
    topSearches,
    activityByDay,
  };
}
