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
// Top customers by spending
// ---------------------------------------------------------------------------

export interface TopCustomerRaw {
  name: string;
  email: string;
  orders: number;
  revenue: number;
}

export async function getTopCustomers(
  where: Prisma.OrderWhereInput,
  limit = 5
): Promise<TopCustomerRaw[]> {
  const orders = await prisma.order.findMany({
    where: {
      ...where,
      customerEmail: { not: null },
    },
    select: {
      customerEmail: true,
      recipientName: true,
      totalInCents: true,
    },
  });

  const customerMap = new Map<
    string,
    { email: string; name: string; orders: number; revenue: number }
  >();

  for (const order of orders) {
    const email = order.customerEmail!;
    const existing = customerMap.get(email) ?? {
      email,
      name: order.recipientName ?? email,
      orders: 0,
      revenue: 0,
    };
    existing.orders += 1;
    existing.revenue += order.totalInCents;
    // Update name if we get a real name (prefer non-email name)
    if (order.recipientName && existing.name === email) {
      existing.name = order.recipientName;
    }
    customerMap.set(email, existing);
  }

  return Array.from(customerMap.values())
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
// Product type split (coffee vs merch revenue)
// ---------------------------------------------------------------------------

export interface ProductTypeSplitRaw {
  coffeeRevenue: number;
  merchRevenue: number;
}

export async function getProductTypeSplit(
  where: Prisma.OrderWhereInput
): Promise<ProductTypeSplitRaw> {
  const items = await prisma.orderItem.findMany({
    where: { order: where },
    select: {
      quantity: true,
      priceInCents: true,
      purchaseOption: {
        select: {
          variant: {
            select: {
              product: {
                select: { type: true },
              },
            },
          },
        },
      },
    },
  });

  let coffeeRevenue = 0;
  let merchRevenue = 0;

  for (const item of items) {
    const lineTotal = item.priceInCents * item.quantity;
    if (item.purchaseOption.variant.product.type === "COFFEE") {
      coffeeRevenue += lineTotal;
    } else {
      merchRevenue += lineTotal;
    }
  }

  return { coffeeRevenue, merchRevenue };
}

// ---------------------------------------------------------------------------
// Fulfilled order count (for fulfillment rate)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Category breakdown by revenue
// ---------------------------------------------------------------------------

export interface CategoryBreakdownRaw {
  category: string;
  kind: "COFFEE" | "MERCH" | "BOTH";
  revenue: number;
  orders: number;
}

export async function getCategoryBreakdown(
  where: Prisma.OrderWhereInput
): Promise<CategoryBreakdownRaw[]> {
  const items = await prisma.orderItem.findMany({
    where: { order: where },
    select: {
      quantity: true,
      priceInCents: true,
      purchaseOption: {
        select: {
          variant: {
            select: {
              product: {
                select: {
                  categories: {
                    select: {
                      category: {
                        select: { name: true, kind: true },
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
  });

  const catMap = new Map<string, { kind: "COFFEE" | "MERCH" | "BOTH"; revenue: number; orders: Set<string> }>();

  for (const item of items) {
    const lineTotal = item.priceInCents * item.quantity;
    const categories = item.purchaseOption.variant.product.categories;
    if (categories.length === 0) continue;
    // Use the first category
    const cat = categories[0].category;
    const existing = catMap.get(cat.name) ?? {
      kind: cat.kind,
      revenue: 0,
      orders: new Set<string>(),
    };
    existing.revenue += lineTotal;
    catMap.set(cat.name, existing);
  }

  return Array.from(catMap.entries())
    .map(([category, data]) => ({
      category,
      kind: data.kind,
      revenue: data.revenue,
      orders: data.orders.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ---------------------------------------------------------------------------
// Coffee products by weight sold
// ---------------------------------------------------------------------------

export interface CoffeeWeightRaw {
  product: string;
  weightSoldGrams: number;
  quantity: number;
}

export async function getCoffeeByWeight(
  where: Prisma.OrderWhereInput
): Promise<CoffeeWeightRaw[]> {
  const items = await prisma.orderItem.findMany({
    where: { order: where },
    select: {
      quantity: true,
      purchaseOption: {
        select: {
          variant: {
            select: {
              weight: true,
              product: {
                select: {
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const productMap = new Map<string, { weight: number; quantity: number }>();

  for (const item of items) {
    const variant = item.purchaseOption.variant;
    if (variant.product.type !== "COFFEE") continue;
    if (!variant.weight) continue;

    const name = variant.product.name;
    const existing = productMap.get(name) ?? { weight: 0, quantity: 0 };
    existing.weight += variant.weight * item.quantity;
    existing.quantity += item.quantity;
    productMap.set(name, existing);
  }

  return Array.from(productMap.entries())
    .map(([product, data]) => ({
      product,
      weightSoldGrams: data.weight,
      quantity: data.quantity,
    }))
    .sort((a, b) => b.weightSoldGrams - a.weightSoldGrams);
}

// ---------------------------------------------------------------------------
// Paginated sales table
// ---------------------------------------------------------------------------

export interface SalesTableParams {
  where: Prisma.OrderWhereInput;
  page: number;
  pageSize: number;
  sort: string;
  dir: "asc" | "desc";
}

export interface SalesTableRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerEmail: string | null;
  customerName: string | null;
  itemCount: number;
  orderType: "ONE_TIME" | "SUBSCRIPTION";
  promoCode: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  refunded: number;
  status: string;
  city: string | null;
  state: string | null;
}

export interface SalesTableResult {
  rows: SalesTableRow[];
  total: number;
  page: number;
  pageSize: number;
}

const SORT_MAP: Record<string, string> = {
  createdAt: "createdAt",
  total: "totalInCents",
  status: "status",
  customerEmail: "customerEmail",
};

export async function getSalesTable(
  params: SalesTableParams
): Promise<SalesTableResult> {
  const orderBy = SORT_MAP[params.sort] ?? "createdAt";

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: params.where,
      orderBy: { [orderBy]: params.dir },
      skip: params.page * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        totalInCents: true,
        discountAmountInCents: true,
        taxAmountInCents: true,
        shippingAmountInCents: true,
        refundedAmountInCents: true,
        promoCode: true,
        status: true,
        customerEmail: true,
        recipientName: true,
        shippingCity: true,
        shippingState: true,
        createdAt: true,
        stripeSubscriptionId: true,
        items: {
          select: { quantity: true },
        },
      },
    }),
    prisma.order.count({ where: params.where }),
  ]);

  const rows: SalesTableRow[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.id.slice(-8).toUpperCase(),
    createdAt: o.createdAt.toISOString(),
    customerEmail: o.customerEmail,
    customerName: o.recipientName,
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
    orderType: o.stripeSubscriptionId ? "SUBSCRIPTION" : "ONE_TIME",
    promoCode: o.promoCode,
    subtotal: o.totalInCents - o.taxAmountInCents - o.shippingAmountInCents,
    discount: o.discountAmountInCents,
    tax: o.taxAmountInCents,
    shipping: o.shippingAmountInCents,
    total: o.totalInCents,
    refunded: o.refundedAmountInCents,
    status: o.status,
    city: o.shippingCity,
    state: o.shippingState,
  }));

  return {
    rows,
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

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
