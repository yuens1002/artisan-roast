/** @jest-environment node */

import {
  getRevenueAggregate,
  getRevenueByDay,
  getOrdersByStatus,
  getTopProducts,
  getTopLocations,
  getPromoOrderCount,
  getFulfilledCount,
  getPurchaseTypeSplit,
  getCategoryBreakdown,
  getCoffeeByWeight,
  getSalesTable,
} from "../queries/order-aggregates";
import {
  ORDERS,
  ORDER_ITEMS,
  FIXTURE_RANGE,
  EXPECTED,
} from "./fixtures";

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

type PrismaMock = {
  order: {
    aggregate: jest.Mock;
    findMany: jest.Mock;
    groupBy: jest.Mock;
    count: jest.Mock;
  };
  orderItem: {
    aggregate: jest.Mock;
    findMany: jest.Mock;
  };
};

jest.mock("@/lib/prisma", () => {
  const prismaMock: PrismaMock = {
    order: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    orderItem: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return { prisma: prismaMock };
});

const { prisma } = jest.requireMock("@/lib/prisma") as { prisma: PrismaMock };

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getRevenueAggregate", () => {
  it("returns summed revenue, refunds, and counts from fixture data", async () => {
    prisma.order.aggregate.mockResolvedValue({
      _sum: {
        totalInCents: EXPECTED.kpiRevenue,
        refundedAmountInCents: EXPECTED.kpiRefunds,
      },
      _count: EXPECTED.kpiOrderCount,
    });
    prisma.orderItem.aggregate.mockResolvedValue({
      _sum: { quantity: EXPECTED.totalItems },
    });

    const result = await getRevenueAggregate({});
    expect(result.revenue).toBe(EXPECTED.kpiRevenue);
    expect(result.refunds).toBe(EXPECTED.kpiRefunds);
    expect(result.orderCount).toBe(EXPECTED.kpiOrderCount);
    expect(result.totalItems).toBe(EXPECTED.totalItems);
  });

  it("handles null sums (no matching orders)", async () => {
    prisma.order.aggregate.mockResolvedValue({
      _sum: { totalInCents: null, refundedAmountInCents: null },
      _count: 0,
    });
    prisma.orderItem.aggregate.mockResolvedValue({
      _sum: { quantity: null },
    });

    const result = await getRevenueAggregate({});
    expect(result.revenue).toBe(0);
    expect(result.refunds).toBe(0);
    expect(result.totalItems).toBe(0);
  });
});

describe("getRevenueByDay", () => {
  it("fills all 7 days even with sparse order data", async () => {
    // Only return orders for 3 of the 7 days
    const sparseOrders = ORDERS.filter(
      (o) => o.status !== "CANCELLED"
    ).map((o) => ({
      totalInCents: o.totalInCents,
      createdAt: o.createdAt,
    }));

    prisma.order.findMany.mockResolvedValue(sparseOrders);

    const result = await getRevenueByDay({}, FIXTURE_RANGE);
    expect(result.length).toBe(7);
    // Every entry has a date
    expect(result.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))).toBe(true);
    // Days with no orders have primary=0
    const emptyDays = result.filter((d) => d.primary === 0);
    expect(emptyDays.length).toBeGreaterThan(0);
  });

  it("groups same-day orders correctly", async () => {
    prisma.order.findMany.mockResolvedValue([
      { totalInCents: 5000, createdAt: new Date("2026-03-01T10:00:00Z") },
      { totalInCents: 3000, createdAt: new Date("2026-03-01T20:00:00Z") },
    ]);

    const result = await getRevenueByDay({}, FIXTURE_RANGE);
    const march1 = result.find((d) => d.date === "2026-03-01");
    expect(march1?.primary).toBe(8000);
    expect(march1?.secondary).toBe(2); // 2 orders
  });
});

describe("getOrdersByStatus", () => {
  it("returns status breakdown from groupBy", async () => {
    prisma.order.groupBy.mockResolvedValue([
      { status: "DELIVERED", _count: 2 },
      { status: "SHIPPED", _count: 1 },
      { status: "CANCELLED", _count: 1 },
      { status: "PENDING", _count: 1 },
    ]);

    const result = await getOrdersByStatus({});
    expect(result).toHaveLength(4);
    expect(result.find((s) => s.status === "DELIVERED")?.count).toBe(2);
  });
});

describe("getPurchaseTypeSplit", () => {
  it("separates subscription and one-time revenue from fixture items", async () => {
    prisma.orderItem.findMany.mockResolvedValue(ORDER_ITEMS);

    const result = await getPurchaseTypeSplit({});
    expect(result.subscriptionRevenue).toBe(EXPECTED.subscriptionRevenue);
    expect(result.oneTimeRevenue).toBe(EXPECTED.oneTimeRevenue);
  });
});

describe("getTopProducts", () => {
  it("ranks products by revenue and limits to N", async () => {
    prisma.orderItem.findMany.mockResolvedValue(ORDER_ITEMS);

    const result = await getTopProducts({}, 2);
    expect(result.length).toBeLessThanOrEqual(2);
    expect(result[0].slug).toBe(EXPECTED.topProductSlug);
    expect(result[0].revenue).toBe(EXPECTED.topProductRevenue);
    // Second product is less revenue
    if (result.length > 1) {
      expect(result[1].revenue).toBeLessThanOrEqual(result[0].revenue);
    }
  });

  it("includes weight for coffee products", async () => {
    prisma.orderItem.findMany.mockResolvedValue(ORDER_ITEMS);

    const result = await getTopProducts({});
    const coffee = result.find((p) => p.slug === "ethiopian-yirgacheffe");
    // item-1: 340*2 + item-4: 340*1 + item-6: 340*1 = 1360
    expect(coffee?.weightSoldGrams).toBe(1360);
  });

  it("reports 0 weight for merch products", async () => {
    prisma.orderItem.findMany.mockResolvedValue(ORDER_ITEMS);

    const result = await getTopProducts({});
    const merch = result.find((p) => p.slug === "artisan-mug");
    expect(merch?.weightSoldGrams).toBe(0);
  });
});

describe("getTopLocations", () => {
  it("ranks states by revenue", async () => {
    prisma.order.findMany.mockResolvedValue(
      ORDERS.filter((o) => o.shippingState).map((o) => ({
        shippingState: o.shippingState,
        totalInCents: o.totalInCents,
      }))
    );

    const result = await getTopLocations({});
    expect(result[0].state).toBe("CA");
    expect(result[0].orders).toBe(EXPECTED.caOrders);
    expect(result[0].revenue).toBe(EXPECTED.caRevenue);
  });
});

describe("getPromoOrderCount", () => {
  it("counts orders with promoCode", async () => {
    prisma.order.count.mockResolvedValue(EXPECTED.promoOrderCount);
    const result = await getPromoOrderCount({});
    expect(result).toBe(EXPECTED.promoOrderCount);
  });
});

describe("getFulfilledCount", () => {
  it("counts fulfilled orders", async () => {
    prisma.order.count.mockResolvedValue(EXPECTED.fulfilledCount);
    const result = await getFulfilledCount({});
    expect(result).toBe(EXPECTED.fulfilledCount);
  });
});

// ---------------------------------------------------------------------------
// New sales-specific queries
// ---------------------------------------------------------------------------

describe("getCategoryBreakdown", () => {
  const categoryItems = [
    {
      quantity: 2,
      priceInCents: 6000,
      purchaseOption: {
        variant: {
          product: {
            categories: [{ category: { name: "Single Origin", kind: "COFFEE" } }],
          },
        },
      },
    },
    {
      quantity: 1,
      priceInCents: 3000,
      purchaseOption: {
        variant: {
          product: {
            categories: [{ category: { name: "Single Origin", kind: "COFFEE" } }],
          },
        },
      },
    },
    {
      quantity: 1,
      priceInCents: 12000,
      purchaseOption: {
        variant: {
          product: {
            categories: [{ category: { name: "Accessories", kind: "MERCH" } }],
          },
        },
      },
    },
  ];

  it("aggregates revenue by category", async () => {
    prisma.orderItem.findMany.mockResolvedValue(categoryItems);

    const result = await getCategoryBreakdown({});
    expect(result).toHaveLength(2);
    // Single Origin: 6000*2 + 3000*1 = 15000
    expect(result[0].category).toBe("Single Origin");
    expect(result[0].revenue).toBe(15000);
    expect(result[0].kind).toBe("COFFEE");
  });

  it("sorts by revenue descending", async () => {
    prisma.orderItem.findMany.mockResolvedValue(categoryItems);

    const result = await getCategoryBreakdown({});
    for (let i = 1; i < result.length; i++) {
      expect(result[i].revenue).toBeLessThanOrEqual(result[i - 1].revenue);
    }
  });

  it("skips items with no categories", async () => {
    prisma.orderItem.findMany.mockResolvedValue([
      {
        quantity: 1,
        priceInCents: 5000,
        purchaseOption: {
          variant: { product: { categories: [] } },
        },
      },
    ]);

    const result = await getCategoryBreakdown({});
    expect(result).toHaveLength(0);
  });
});

describe("getCoffeeByWeight", () => {
  const weightItems = [
    {
      quantity: 2,
      purchaseOption: {
        variant: {
          weight: 340,
          product: { name: "Ethiopian Yirgacheffe", type: "COFFEE" },
        },
      },
    },
    {
      quantity: 1,
      purchaseOption: {
        variant: {
          weight: 340,
          product: { name: "Ethiopian Yirgacheffe", type: "COFFEE" },
        },
      },
    },
    {
      quantity: 1,
      purchaseOption: {
        variant: {
          weight: null,
          product: { name: "Artisan Mug", type: "MERCH" },
        },
      },
    },
  ];

  it("aggregates weight by coffee product, excludes merch", async () => {
    prisma.orderItem.findMany.mockResolvedValue(weightItems);

    const result = await getCoffeeByWeight({});
    expect(result).toHaveLength(1);
    expect(result[0].product).toBe("Ethiopian Yirgacheffe");
    // 340*2 + 340*1 = 1020
    expect(result[0].weightSoldGrams).toBe(1020);
    expect(result[0].quantity).toBe(3);
  });

  it("returns empty for non-coffee orders", async () => {
    prisma.orderItem.findMany.mockResolvedValue([
      {
        quantity: 1,
        purchaseOption: {
          variant: {
            weight: null,
            product: { name: "T-Shirt", type: "MERCH" },
          },
        },
      },
    ]);

    const result = await getCoffeeByWeight({});
    expect(result).toHaveLength(0);
  });
});

describe("getSalesTable", () => {
  const mockOrders = [
    {
      id: "cuid123456789abc",
      totalInCents: 15000,
      discountAmountInCents: 0,
      taxAmountInCents: 1200,
      shippingAmountInCents: 500,
      refundedAmountInCents: 0,
      promoCode: null,
      status: "DELIVERED",
      customerEmail: "user@example.com",
      recipientName: "John Doe",
      shippingCity: "Los Angeles",
      shippingState: "CA",
      createdAt: new Date("2026-03-01T10:00:00Z"),
      stripeSubscriptionId: null,
      items: [{ quantity: 2 }, { quantity: 1 }],
    },
  ];

  it("returns paginated rows with correct shape", async () => {
    prisma.order.findMany.mockResolvedValue(mockOrders);
    prisma.order.count.mockResolvedValue(1);

    const result = await getSalesTable({
      where: {},
      page: 0,
      pageSize: 25,
      sort: "createdAt",
      dir: "desc",
    });

    expect(result.rows).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(0);
    expect(result.pageSize).toBe(25);

    const row = result.rows[0];
    expect(row.total).toBe(15000);
    expect(row.itemCount).toBe(3); // 2 + 1
    expect(row.orderType).toBe("ONE_TIME"); // no stripeSubscriptionId
    expect(row.customerEmail).toBe("user@example.com");
    expect(row.state).toBe("CA");
  });

  it("identifies subscription orders by stripeSubscriptionId", async () => {
    prisma.order.findMany.mockResolvedValue([
      { ...mockOrders[0], stripeSubscriptionId: "sub_123" },
    ]);
    prisma.order.count.mockResolvedValue(1);

    const result = await getSalesTable({
      where: {},
      page: 0,
      pageSize: 25,
      sort: "createdAt",
      dir: "desc",
    });

    expect(result.rows[0].orderType).toBe("SUBSCRIPTION");
  });

  it("calculates subtotal correctly", async () => {
    prisma.order.findMany.mockResolvedValue(mockOrders);
    prisma.order.count.mockResolvedValue(1);

    const result = await getSalesTable({
      where: {},
      page: 0,
      pageSize: 25,
      sort: "createdAt",
      dir: "desc",
    });

    // subtotal = totalInCents - taxAmountInCents - shippingAmountInCents
    // 15000 - 1200 - 500 = 13300
    expect(result.rows[0].subtotal).toBe(13300);
  });
});
