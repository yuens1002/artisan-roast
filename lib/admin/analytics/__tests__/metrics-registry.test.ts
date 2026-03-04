import {
  computeDelta,
  computeNetRevenue,
  computeAov,
  computeRefundRate,
  computeFulfillmentRate,
  computeSubscriptionPercent,
  computePromoPercent,
  computeAvgItems,
  computeConversionRate,
  computeSplit,
} from "../metrics-registry";

describe("computeDelta", () => {
  it("computes positive change", () => {
    const d = computeDelta(112, 100);
    expect(d.direction).toBe("up");
    expect(d.value).toBeCloseTo(0.12);
  });

  it("computes negative change", () => {
    const d = computeDelta(90, 100);
    expect(d.direction).toBe("down");
    expect(d.value).toBeCloseTo(0.1);
  });

  it("returns flat for tiny change", () => {
    expect(computeDelta(100, 100).direction).toBe("flat");
  });

  it("returns flat when both zero", () => {
    expect(computeDelta(0, 0).direction).toBe("flat");
  });

  it("caps at 100% when previous is 0 and current is positive", () => {
    const d = computeDelta(500, 0);
    expect(d.direction).toBe("up");
    expect(d.value).toBe(1);
  });

  it("handles null previous", () => {
    const d = computeDelta(100, null);
    expect(d.direction).toBe("up");
  });
});

describe("revenue metrics", () => {
  it("computeNetRevenue subtracts refunds", () => {
    expect(computeNetRevenue(10000, 500)).toBe(9500);
  });

  it("computeAov divides correctly", () => {
    expect(computeAov(30000, 3)).toBe(10000);
  });

  it("computeAov returns 0 for no orders", () => {
    expect(computeAov(0, 0)).toBe(0);
  });

  it("computeRefundRate as ratio", () => {
    expect(computeRefundRate(1000, 10000)).toBeCloseTo(0.1);
  });

  it("computeRefundRate zero revenue", () => {
    expect(computeRefundRate(0, 0)).toBe(0);
  });
});

describe("fulfillment and mix", () => {
  it("computeFulfillmentRate", () => {
    expect(computeFulfillmentRate(80, 100)).toBeCloseTo(0.8);
  });

  it("computeSubscriptionPercent", () => {
    expect(computeSubscriptionPercent(3000, 10000)).toBeCloseTo(0.3);
  });

  it("computePromoPercent", () => {
    expect(computePromoPercent(5, 100)).toBeCloseTo(0.05);
  });

  it("computeAvgItems", () => {
    expect(computeAvgItems(15, 5)).toBeCloseTo(3);
  });
});

describe("computeConversionRate", () => {
  it("returns ratio", () => {
    expect(computeConversionRate(10, 1000)).toBeCloseTo(0.01);
  });

  it("handles zero opportunities", () => {
    expect(computeConversionRate(0, 0)).toBe(0);
  });
});

describe("computeSplit", () => {
  it("builds balanced split", () => {
    const split = computeSplit("Sub", 6000, "One-time", 4000);
    expect(split.left.percent).toBeCloseTo(0.6);
    expect(split.right.percent).toBeCloseTo(0.4);
    expect(split.left.label).toBe("Sub");
  });

  it("handles zero total", () => {
    const split = computeSplit("A", 0, "B", 0);
    expect(split.left.percent).toBe(0);
    expect(split.right.percent).toBe(0);
  });
});
