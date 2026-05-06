/**
 * Tests for fetchPlans() from lib/plans.ts
 *
 * AC-E2E-9: Platform unreachable → returns self-hosted fallback plans (Community + Priority Support), no crash
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

import type { Plan } from "../plan-types";
import { fetchPlans, filterPlansByVisibility, invalidatePlansCache } from "../plans";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fetchPlans", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidatePlansCache();
  });

  // AC-E2E-9: Network error → self-hosted fallback, no crash
  it("returns self-hosted fallback plans when fetch throws (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("fetch failed"));

    const plans = await fetchPlans();

    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((p) => p.visibility === "self-hosted")).toBe(true);
    expect(plans.map((p) => p.slug)).toContain("free");
    expect(plans.map((p) => p.slug)).toContain("priority-support");
  });

  // AC-E2E-9: Platform returns 500 → self-hosted fallback
  it("returns self-hosted fallback plans when platform returns 500", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const plans = await fetchPlans();

    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((p) => p.visibility === "self-hosted")).toBe(true);
  });

  // AC-E2E-9: Platform returns 503 → self-hosted fallback
  it("returns self-hosted fallback plans when platform returns 503", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    const plans = await fetchPlans();

    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((p) => p.visibility === "self-hosted")).toBe(true);
  });

  // Happy path: platform returns plans
  it("returns plans when platform responds successfully", async () => {
    const mockPlans = [
      {
        slug: "pro",
        name: "Pro",
        description: "Professional plan",
        price: 2900,
        currency: "USD",
        interval: "month" as const,
        features: ["ga", "ai-product-ops"],
        highlight: false,
        details: {
          benefits: ["Google Analytics integration"],
        },
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plans: mockPlans }),
    });

    const plans = await fetchPlans();

    expect(plans).toEqual(mockPlans);
    expect(plans).toHaveLength(1);
    expect(plans[0].slug).toBe("pro");
  });

  // Cache: second call uses cached data
  it("uses cached data on subsequent calls within TTL", async () => {
    const mockPlans = [{ slug: "pro", name: "Pro" }];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plans: mockPlans }),
    });

    await fetchPlans();
    const plans = await fetchPlans();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(plans).toEqual(mockPlans);
  });

  // Empty response: platform returns { plans: [] }
  it("returns empty array when platform returns empty plans list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plans: [] }),
    });

    const plans = await fetchPlans();
    expect(plans).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC-TST-5 — filterPlansByVisibility selects correct plans by IS_HOSTED
// ---------------------------------------------------------------------------

describe("filterPlansByVisibility", () => {
  function makePlan(slug: string, visibility: "self-hosted" | "hosted"): Plan {
    return {
      slug,
      name: slug,
      description: "",
      price: 0,
      currency: "USD",
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
    expect(filtered.map((p) => p.slug)).toEqual([
      "house-blend-trial",
      "house-blend",
    ]);
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
