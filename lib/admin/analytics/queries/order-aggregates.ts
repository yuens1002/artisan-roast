/**
 * Reusable order aggregate queries for admin analytics.
 *
 * Shared between dashboard and sales services.
 * All functions accept a Prisma `where` clause built by the filter module.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ChartDataPoint, StatusBreakdownItem } from "../contracts";
import type { DateRange } from "../time";
import { toDateKey, generateDateKeys } from "../time";

// ---------------------------------------------------------------------------
// Revenue + refunds aggregate
// ---------------------------------------------------------------------------

export interface RevenueAggregate {
  revenue: number;
  refunds: number;
  orderCount: number;
  totalItems: number;
}

export async function getRevenueAggregate(
  where: Prisma.OrderWhereInput
): Promise<RevenueAggregate> {
  const [agg, itemAgg] = await Promise.all([
    prisma.order.aggregate({
      where,
      _sum: {
        totalInCents: true,
        refundedAmountInCents: true,
      },
      _count: true,
    }),
    prisma.orderItem.aggregate({
      where: { order: where },
      _sum: { quantity: true },
    }),
  ]);

  return {
    revenue: agg._sum.totalInCents ?? 0,
    refunds: agg._sum.refundedAmountInCents ?? 0,
    orderCount: agg._count,
    totalItems: itemAgg._sum.quantity ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Revenue by day (chart data)
// ---------------------------------------------------------------------------

export async function getRevenueByDay(
  where: Prisma.OrderWhereInput,
  range: DateRange
): Promise<ChartDataPoint[]> {
  const orders = await prisma.order.findMany({
    where,
    select: {
      totalInCents: true,
      createdAt: true,
    },
  });

  // Build a map: date → { revenue, orders }
  const dayMap = new Map<string, { revenue: number; orders: number }>();
  for (const order of orders) {
    const key = toDateKey(order.createdAt);
    const existing = dayMap.get(key) ?? { revenue: 0, orders: 0 };
    existing.revenue += order.totalInCents;
    existing.orders += 1;
    dayMap.set(key, existing);
  }

  // Fill all days in the range (even days with zero data)
  return generateDateKeys(range).map((date) => {
    const data = dayMap.get(date);
    return {
      date,
      primary: data?.revenue ?? 0,
      secondary: data?.orders ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Orders by status
// ---------------------------------------------------------------------------

export async function getOrdersByStatus(
  where: Prisma.OrderWhereInput
): Promise<StatusBreakdownItem[]> {
  const groups = await prisma.order.groupBy({
    by: ["status"],
    where,
    _count: true,
  });

  return groups.map((g) => ({
    status: g.status,
    count: g._count,
  }));
}

// ---------------------------------------------------------------------------
// Subscription vs one-time split
// ---------------------------------------------------------------------------

export interface PurchaseTypeSplitRaw {
  subscriptionRevenue: number;
  oneTimeRevenue: number;
  subscriptionOrders: number;
  oneTimeOrders: number;
}

export async function getPurchaseTypeSplit(
  where: Prisma.OrderWhereInput
): Promise<PurchaseTypeSplitRaw> {
  const items = await prisma.orderItem.findMany({
    where: { order: where },
    select: {
      quantity: true,
      priceInCents: true,
      purchaseOption: {
        select: { type: true },
      },
    },
  });

  let subscriptionRevenue = 0;
  let oneTimeRevenue = 0;
  let subscriptionItems = 0;
  let oneTimeItems = 0;

  for (const item of items) {
    const lineTotal = item.priceInCents * item.quantity;
    if (item.purchaseOption.type === "SUBSCRIPTION") {
      subscriptionRevenue += lineTotal;
      subscriptionItems += 1;
    } else {
      oneTimeRevenue += lineTotal;
      oneTimeItems += 1;
    }
  }

  return {
    subscriptionRevenue,
    oneTimeRevenue,
    subscriptionOrders: subscriptionItems,
    oneTimeOrders: oneTimeItems,
  };
}

// ---------------------------------------------------------------------------
// Top products by revenue
// ---------------------------------------------------------------------------

export interface TopProductRaw {
  name: string;
  slug: string;
  quantity: number;
  revenue: number;
  weightSoldGrams: number;
}

export async function getTopProducts(
  where: Prisma.OrderWhereInput,
  limit = 5
): Promise<TopProductRaw[]> {
  const items = await prisma.orderItem.findMany({
    where: { order: where },
    select: {
      quantity: true,
      priceInCents: true,
      purchaseOption: {
        select: {
          variant: {
            select: {
              weight: true,
              product: {
                select: { name: true, slug: true },
              },
            },
          },
        },
      },
    },
  });

  // Aggregate by product slug
  const productMap = new Map<
    string,
    { name: string; slug: string; quantity: number; revenue: number; weight: number }
  >();

  for (const item of items) {
    const variant = item.purchaseOption.variant;
    const product = variant.product;
    const slug = product.slug;
    const existing = productMap.get(slug) ?? {
      name: product.name,
      slug,
      quantity: 0,
      revenue: 0,
      weight: 0,
    };
    existing.quantity += item.quantity;
    existing.revenue += item.priceInCents * item.quantity;
    existing.weight += (variant.weight ?? 0) * item.quantity;
    productMap.set(slug, existing);
  }

  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((p) => ({
      name: p.name,
      slug: p.slug,
      quantity: p.quantity,
      revenue: p.revenue,
      weightSoldGrams: p.weight,
    }));
}

// ---------------------------------------------------------------------------
// Top locations by revenue
// ---------------------------------------------------------------------------

export interface TopLocationRaw {
  state: string;
  orders: number;
  revenue: number;
}

export async function getTopLocations(
  where: Prisma.OrderWhereInput,
  limit = 5
): Promise<TopLocationRaw[]> {
  const orders = await prisma.order.findMany({
    where: {
      ...where,
      shippingState: { not: null },
    },
    select: {
      shippingState: true,
      totalInCents: true,
    },
  });

  const stateMap = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    const state = order.shippingState!;
    const existing = stateMap.get(state) ?? { orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += order.totalInCents;
    stateMap.set(state, existing);
  }

  return Array.from(stateMap.entries())
    .map(([state, data]) => ({ state, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Promo order count
// ---------------------------------------------------------------------------

export async function getPromoOrderCount(
  where: Prisma.OrderWhereInput
): Promise<number> {
  return prisma.order.count({
    where: {
      ...where,
      promoCode: { not: null },
    },
  });
}

// ---------------------------------------------------------------------------
// Fulfilled order count (for fulfillment rate)
// ---------------------------------------------------------------------------

const FULFILLED_STATUSES = ["DELIVERED", "PICKED_UP", "SHIPPED", "OUT_FOR_DELIVERY"];

export async function getFulfilledCount(
  where: Prisma.OrderWhereInput
): Promise<number> {
  return prisma.order.count({
    where: {
      ...where,
      status: { in: FULFILLED_STATUSES as Prisma.EnumOrderStatusFilter["in"] },
    },
  });
}
