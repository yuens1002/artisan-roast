/** @jest-environment node */

import { getBehaviorFunnel, getTopSearches } from "../queries/activity-queries";
import { FIXTURE_RANGE, EXPECTED } from "./fixtures";

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

type PrismaMock = {
  userActivity: {
    count: jest.Mock;
    groupBy: jest.Mock;
  };
};

jest.mock("@/lib/prisma", () => {
  const prismaMock: PrismaMock = {
    userActivity: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };
  return { prisma: prismaMock };
});

const { prisma } = jest.requireMock("@/lib/prisma") as { prisma: PrismaMock };

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getBehaviorFunnel", () => {
  it("returns 3-step funnel with conversion rates", async () => {
    prisma.userActivity.count
      .mockResolvedValueOnce(EXPECTED.productViews) // PRODUCT_VIEW
      .mockResolvedValueOnce(EXPECTED.addToCart); // ADD_TO_CART

    const result = await getBehaviorFunnel(FIXTURE_RANGE, EXPECTED.kpiOrderCount);
    expect(result).toHaveLength(3);

    expect(result[0].label).toBe("Product Views");
    expect(result[0].value).toBe(EXPECTED.productViews);
    expect(result[0].conversionFromPrevious).toBeUndefined();

    expect(result[1].label).toBe("Add to Cart");
    expect(result[1].value).toBe(EXPECTED.addToCart);
    expect(result[1].conversionFromPrevious).toBeCloseTo(
      EXPECTED.addToCart / EXPECTED.productViews
    );

    expect(result[2].label).toBe("Orders");
    expect(result[2].value).toBe(EXPECTED.kpiOrderCount);
    expect(result[2].conversionFromPrevious).toBeCloseTo(
      EXPECTED.kpiOrderCount / EXPECTED.addToCart
    );
  });

  it("handles zero views gracefully", async () => {
    prisma.userActivity.count
      .mockResolvedValueOnce(0) // views
      .mockResolvedValueOnce(0); // carts

    const result = await getBehaviorFunnel(FIXTURE_RANGE, 0);
    expect(result[1].conversionFromPrevious).toBe(0);
    expect(result[2].conversionFromPrevious).toBe(0);
  });
});

describe("getTopSearches", () => {
  it("returns ranked search queries", async () => {
    prisma.userActivity.groupBy.mockResolvedValue([
      { searchQuery: EXPECTED.topSearch, _count: EXPECTED.topSearchCount },
      { searchQuery: "mug", _count: 1 },
    ]);

    const result = await getTopSearches(FIXTURE_RANGE);
    expect(result).toHaveLength(2);
    expect(result[0].rank).toBe(1);
    expect(result[0].label).toBe(EXPECTED.topSearch);
    expect(result[0].value).toBe(EXPECTED.topSearchCount);
  });

  it("respects limit parameter", async () => {
    prisma.userActivity.groupBy.mockResolvedValue([
      { searchQuery: "a", _count: 3 },
    ]);

    const result = await getTopSearches(FIXTURE_RANGE, 1);
    expect(result).toHaveLength(1);
  });
});
