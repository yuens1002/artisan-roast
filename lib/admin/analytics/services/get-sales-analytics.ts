/**
 * Sales analytics service.
 *
 * Orchestrates queries for the /admin/sales deep-dive page.
 * Returns SalesResponse (see contracts.ts).
 */

import type { OrderStatus } from "@prisma/client";
import type {
  SalesResponse,
  SalesKpis,
  PeriodPreset,
  CompareMode,
} from "../contracts";
import {
  getComparisonRange,
  resolveRange,
  toDateRangeDTO,
  type DateRange,
} from "../time";
import {
  computeAov,
  computeNetRevenue,
  computeRefundRate,
  computeFulfillmentRate,
  computeAvgItems,
  computeSubscriptionPercent,
  computePromoPercent,
  computeSplit,
} from "../metrics-registry";
import {
  buildOrderWhere,
  buildKpiOrderWhere,
  type OrderFilterParams,
} from "../filters/build-order-where";
import {
  getRevenueAggregate,
  getRevenueByDay,
  getOrdersByStatus,
  getPurchaseTypeSplit,
  getTopProducts,
  getTopLocations,
  getPromoOrderCount,
  getFulfilledCount,
  getCategoryBreakdown,
  getCoffeeByWeight,
  getSalesTable,
} from "../queries/order-aggregates";

export type GetSalesParams = {
  compare: CompareMode;
  orderType?: "ALL" | "ONE_TIME" | "SUBSCRIPTION";
  statuses?: OrderStatus[];
  productId?: string;
  categoryId?: string;
  promoCode?: string;
  location?: string;
  amountOp?: "=" | ">=" | "<=";
  amountCents?: number;
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: "asc" | "desc";
} & ({ period: PeriodPreset } | { customFrom: string; customTo: string });

export async function getSalesAnalytics(
  params: GetSalesParams
): Promise<SalesResponse> {
  const range = "customFrom" in params
    ? resolveRange({ customFrom: params.customFrom, customTo: params.customTo })
    : resolveRange({ period: params.period });
  const compRange = getComparisonRange(range, params.compare);

  // Base params (period only) — KPIs and charts are unaffected by table filters
  const baseParams: OrderFilterParams = { range };

  // Table params include user-applied filters (orderType, status, amount, etc.)
  const tableFilterParams: OrderFilterParams = {
    range,
    orderType: params.orderType,
    statuses: params.statuses,
    productId: params.productId,
    categoryId: params.categoryId,
    promoCode: params.promoCode,
    location: params.location,
    amountOp: params.amountOp,
    amountCents: params.amountCents,
  };

  const kpiWhere = buildKpiOrderWhere(baseParams);
  const allWhere = buildOrderWhere(baseParams);
  const tableWhere = buildOrderWhere(tableFilterParams);

  // Run all queries in parallel
  const [
    revenueAgg,
    revenueByDay,
    ordersByStatus,
    purchaseTypeSplit,
    topProducts,
    topLocations,
    promoCount,
    fulfilledCount,
    categoryBreakdown,
    coffeeByWeight,
    table,
    comparisonKpis,
    comparisonByDay,
  ] = await Promise.all([
    getRevenueAggregate(kpiWhere),
    getRevenueByDay(kpiWhere, range),
    getOrdersByStatus(allWhere),
    getPurchaseTypeSplit(kpiWhere),
    getTopProducts(kpiWhere, 10),
    getTopLocations(kpiWhere, 10),
    getPromoOrderCount(kpiWhere),
    getFulfilledCount(allWhere),
    getCategoryBreakdown(kpiWhere),
    getCoffeeByWeight(kpiWhere),
    getSalesTable({
      where: tableWhere,
      page: params.page ?? 0,
      pageSize: params.pageSize ?? 25,
      sort: params.sort ?? "createdAt",
      dir: params.dir ?? "desc",
    }),
    compRange ? getComparisonSalesKpis(compRange, baseParams) : Promise.resolve(null),
    compRange
      ? getRevenueByDay(buildKpiOrderWhere({ ...baseParams, range: compRange }), compRange)
      : Promise.resolve(null),
  ]);

  const totalOrders = ordersByStatus.reduce((sum, s) => sum + s.count, 0);

  // Build KPIs
  const kpis: SalesKpis = {
    revenue: revenueAgg.revenue,
    netRevenue: computeNetRevenue(revenueAgg.revenue, revenueAgg.refunds),
    orders: revenueAgg.orderCount,
    aov: computeAov(revenueAgg.revenue, revenueAgg.orderCount),
    refundAmount: revenueAgg.refunds,
    refundRate: computeRefundRate(revenueAgg.refunds, revenueAgg.revenue),
    fulfillmentRate: computeFulfillmentRate(fulfilledCount, totalOrders),
    avgItemsPerOrder: computeAvgItems(revenueAgg.totalItems, revenueAgg.orderCount),
    subscriptionRevenue: purchaseTypeSplit.subscriptionRevenue,
    oneTimeRevenue: purchaseTypeSplit.oneTimeRevenue,
    subscriptionPercent: computeSubscriptionPercent(
      purchaseTypeSplit.subscriptionRevenue,
      purchaseTypeSplit.subscriptionRevenue + purchaseTypeSplit.oneTimeRevenue
    ),
    promoOrderPercent: computePromoPercent(promoCount, revenueAgg.orderCount),
  };

  const purchaseTypeSplitPayload = computeSplit(
    "Subscription",
    purchaseTypeSplit.subscriptionRevenue,
    "One-time",
    purchaseTypeSplit.oneTimeRevenue
  );

  return {
    period: toDateRangeDTO(range),
    comparison: compRange ? toDateRangeDTO(compRange) : null,
    kpis,
    comparisonKpis,
    revenueByDay,
    comparisonByDay,
    categoryBreakdown,
    ordersByStatus,
    purchaseTypeSplit: purchaseTypeSplitPayload,
    salesByLocation: topLocations.map((l) => ({
      state: l.state,
      city: "",
      orders: l.orders,
      revenue: l.revenue,
    })),
    coffeeByWeight,
    topProducts: topProducts.map((p, i) => ({
      rank: i + 1,
      label: p.name,
      value: p.revenue,
      href: `/admin/products/${p.slug}`,
    })),
    topLocations: topLocations.map((l, i) => ({
      rank: i + 1,
      label: l.state,
      value: l.revenue,
    })),
    table,
  };
}

// ---------------------------------------------------------------------------
// Internal helper: comparison KPIs
// ---------------------------------------------------------------------------

async function getComparisonSalesKpis(
  compRange: DateRange,
  baseParams: OrderFilterParams
): Promise<SalesKpis> {
  const compFilterParams = { ...baseParams, range: compRange };
  const compKpiWhere = buildKpiOrderWhere(compFilterParams);
  const compAllWhere = buildOrderWhere(compFilterParams);

  const [compRev, compPurchaseType, compPromoCount, compFulfilled, compStatusBreakdown] =
    await Promise.all([
      getRevenueAggregate(compKpiWhere),
      getPurchaseTypeSplit(compKpiWhere),
      getPromoOrderCount(compKpiWhere),
      getFulfilledCount(compAllWhere),
      getOrdersByStatus(compAllWhere),
    ]);

  const compTotalOrders = compStatusBreakdown.reduce((sum, s) => sum + s.count, 0);

  return {
    revenue: compRev.revenue,
    netRevenue: computeNetRevenue(compRev.revenue, compRev.refunds),
    orders: compRev.orderCount,
    aov: computeAov(compRev.revenue, compRev.orderCount),
    refundAmount: compRev.refunds,
    refundRate: computeRefundRate(compRev.refunds, compRev.revenue),
    fulfillmentRate: computeFulfillmentRate(compFulfilled, compTotalOrders),
    avgItemsPerOrder: computeAvgItems(compRev.totalItems, compRev.orderCount),
    subscriptionRevenue: compPurchaseType.subscriptionRevenue,
    oneTimeRevenue: compPurchaseType.oneTimeRevenue,
    subscriptionPercent: computeSubscriptionPercent(
      compPurchaseType.subscriptionRevenue,
      compPurchaseType.subscriptionRevenue + compPurchaseType.oneTimeRevenue
    ),
    promoOrderPercent: computePromoPercent(compPromoCount, compRev.orderCount),
  };
}
