/**
 * Tests for fetchPlans() and filterPlansByVisibility() from lib/plans.ts
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

import type { Plan } from "artisan-roast-sdk/plans";
import { fetchPlans, filterPlansByVisibility } from "../plans";

describe("fetchPlans", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array when fetch throws (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("fetch failed"));
    const plans = await fetchPlans();
    expect(plans).toHaveLength(0);
  });

  it("returns empty array when platform returns 500", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const plans = await fetchPlans();
    expect(plans).toHaveLength(0);
  });

  it("returns plans when platform responds successfully", async () => {
    const mockPlans = [
      {
        slug: "free",
        name: "Community",
        description: "Open-source self-hosted store",
        price: 0,
        currency: "usd",
        interval: "month" as const,
        features: [] as string[],
        highlight: false,
        visibility: null,
        details: { benefits: { activeItems: ["Full e-commerce platform"] } },
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plans: mockPlans }),
    });

    const plans = await fetchPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0]!.slug).toBe("free");
    // null visibility normalized to "self-hosted" at fetch boundary
    expect(plans[0]!.visibility).toBe("self-hosted");
  });

  it("returns empty array when platform returns empty list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plans: [] }),
    });
    const plans = await fetchPlans();
    expect(plans).toHaveLength(0);
  });
});

describe("filterPlansByVisibility", () => {
  function makePlan(slug: string, visibility: "self-hosted" | "hosted"): Plan {
    return {
      slug,
      name: slug,
      description: "",
      price: 0,
      currency: "usd",
      interval: "month",
      features: [],
      highlight: false,
      visibility,
      details: {},
    };
  }

  const catalog: Plan[] = [
    makePlan("free", "self-hosted"),
    makePlan("priority-support", "self-hosted"),
    makePlan("house-blend-trial", "hosted"),
    makePlan("house-blend", "hosted"),
  ];

  it("returns only self-hosted plans when isHosted=false", () => {
    const filtered = filterPlansByVisibility(catalog, false);
    expect(filtered.map((p) => p.slug)).toEqual(["free", "priority-support"]);
  });

  it("returns only hosted plans when isHosted=true", () => {
    const filtered = filterPlansByVisibility(catalog, true);
    expect(filtered.map((p) => p.slug)).toEqual(["house-blend-trial", "house-blend"]);
  });

  it("returns empty array when catalog is empty", () => {
    expect(filterPlansByVisibility([], true)).toEqual([]);
    expect(filterPlansByVisibility([], false)).toEqual([]);
  });

  it("does not mutate the input catalog", () => {
    const before = catalog.length;
    filterPlansByVisibility(catalog, true);
    expect(catalog.length).toBe(before);
  });
});
