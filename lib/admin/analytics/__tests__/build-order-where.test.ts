/** @jest-environment node */

import { buildOrderWhere, buildKpiOrderWhere } from "../filters/build-order-where";
import { FIXTURE_RANGE } from "./fixtures";

describe("buildOrderWhere", () => {
  const baseParams = { range: FIXTURE_RANGE };

  it("builds base where with date range [from, to)", () => {
    const where = buildOrderWhere(baseParams);
    expect(where.createdAt).toEqual({
      gte: FIXTURE_RANGE.from,
      lt: FIXTURE_RANGE.to,
    });
  });

  it("adds status filter when statuses provided", () => {
    const where = buildOrderWhere({
      ...baseParams,
      statuses: ["DELIVERED", "SHIPPED"],
    });
    expect(where.status).toEqual({ in: ["DELIVERED", "SHIPPED"] });
  });

  it("does not add status filter when statuses empty", () => {
    const where = buildOrderWhere({ ...baseParams, statuses: [] });
    expect(where.status).toBeUndefined();
  });

  it("adds promoCode filter", () => {
    const where = buildOrderWhere({ ...baseParams, promoCode: "SPRING10" });
    expect(where.promoCode).toBe("SPRING10");
  });

  it("adds location filter on shippingState", () => {
    const where = buildOrderWhere({ ...baseParams, location: "CA" });
    expect(where.shippingState).toBe("CA");
  });

  it("filters SUBSCRIPTION orders by stripeSubscriptionId not-null", () => {
    const where = buildOrderWhere({
      ...baseParams,
      orderType: "SUBSCRIPTION",
    });
    // Uses indexed stripeSubscriptionId field on Order, not purchaseOption.type
    expect(where.stripeSubscriptionId).toEqual({ not: null });
    // orderType alone should NOT create an items filter
    expect(where.items).toBeUndefined();
  });

  it("filters ONE_TIME orders by stripeSubscriptionId null", () => {
    const where = buildOrderWhere({
      ...baseParams,
      orderType: "ONE_TIME",
    });
    expect(where.stripeSubscriptionId).toBeNull();
    expect(where.items).toBeUndefined();
  });

  it("skips orderType filter entirely when ALL", () => {
    const where = buildOrderWhere({ ...baseParams, orderType: "ALL" });
    expect(where.stripeSubscriptionId).toBeUndefined();
    expect(where.items).toBeUndefined();
  });

  it("adds productId filter via items.some → variant", () => {
    const where = buildOrderWhere({ ...baseParams, productId: "prod-1" });
    expect(where.items).toEqual({
      some: {
        purchaseOption: {
          variant: { productId: "prod-1" },
        },
      },
    });
  });

  it("adds categoryId filter via items.some → variant → product → categories", () => {
    const where = buildOrderWhere({ ...baseParams, categoryId: "cat-1" });
    expect(where.items).toEqual({
      some: {
        purchaseOption: {
          variant: {
            product: {
              categories: { some: { categoryId: "cat-1" } },
            },
          },
        },
      },
    });
  });

  it("combines orderType (stripeSubscriptionId) + productId (items) independently", () => {
    const where = buildOrderWhere({
      ...baseParams,
      orderType: "ONE_TIME",
      productId: "prod-1",
    });
    // orderType → flat field on Order
    expect(where.stripeSubscriptionId).toBeNull();
    // productId → nested items filter (no purchaseOption.type mixing)
    expect(where.items).toEqual({
      some: {
        purchaseOption: {
          variant: { productId: "prod-1" },
        },
      },
    });
  });
});

describe("buildKpiOrderWhere", () => {
  it("excludes CANCELLED and FAILED from status", () => {
    const where = buildKpiOrderWhere({ range: FIXTURE_RANGE });
    expect(where.status).toEqual({ notIn: ["CANCELLED", "FAILED"] });
  });

  it("preserves other filters alongside status exclusion", () => {
    const where = buildKpiOrderWhere({
      range: FIXTURE_RANGE,
      location: "CA",
      promoCode: "TEST",
    });
    expect(where.shippingState).toBe("CA");
    expect(where.promoCode).toBe("TEST");
    expect(where.status).toEqual({ notIn: ["CANCELLED", "FAILED"] });
  });
});
