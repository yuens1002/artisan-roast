/**
 * Unit tests for the pure formatter functions.
 *
 * AC-FMT — see docs/features/provider-plan-sdk-alignment/session-1/ACs.md.
 *
 * These run in jsdom but never touch the DOM. Each formatter is one tiny
 * pure function; tests exercise happy path + the edge cases that have
 * historically caused bugs (singular days, empty countLabel, expired sale).
 */
import type { HydratedPlan, UsagePool } from "artisan-roast-sdk/plans";
import {
  computePoolTotal,
  formatDaysRemaining,
  formatDeactivatedDate,
  formatDeprovisionDate,
  formatIntervalLabel,
  formatPoolCount,
  formatPriceDisplay,
  formatPriceLabel,
} from "../formatters";

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

describe("formatPriceDisplay", () => {
  test("price in cents → $XX", () => {
    expect(formatPriceDisplay(4900)).toBe("$49");
  });
  test("zero", () => {
    expect(formatPriceDisplay(0)).toBe("$0");
  });
  test("rounds down sub-dollar amounts", () => {
    expect(formatPriceDisplay(4999)).toBe("$50"); // toFixed rounds
  });
});

describe("formatIntervalLabel", () => {
  test('month → "/mo"', () => {
    expect(formatIntervalLabel("month")).toBe("/mo");
  });
  test('year → "/yr"', () => {
    expect(formatIntervalLabel("year")).toBe("/yr");
  });
});

describe("formatPriceLabel", () => {
  const base: HydratedPlan = {
    slug: "p", name: "P", description: "x", price: 4900, currency: "USD",
    interval: "month", features: [], details: { benefits: { activeItems: [] } },
    highlight: false, visibility: "self-hosted",
    state: { status: "NONE", actions: [] },
  };

  test("returns null when no saleLabel and no saleEndsAt", () => {
    expect(formatPriceLabel(base)).toBeNull();
  });

  test("returns null when sale has ended", () => {
    const pastDate = new Date(Date.now() - 86400_000).toISOString();
    expect(formatPriceLabel({ ...base, saleLabel: "Sale", saleEndsAt: pastDate })).toBeNull();
  });

  test("composes label-only when no saleEndsAt", () => {
    expect(formatPriceLabel({ ...base, saleLabel: "Launch Special" })).toBe("Launch Special");
  });

  test("composes label + offer-ends when both present", () => {
    const futureDate = new Date("2026-12-31T00:00:00Z").toISOString();
    const out = formatPriceLabel({ ...base, saleLabel: "Launch Special", saleEndsAt: futureDate });
    expect(out).toMatch(/^Launch Special, offer ends \d{2}\/\d{2}\/\d{4}$/);
  });

  test("offer-ends only when no label but future date", () => {
    const futureDate = new Date(Date.now() + 30 * 86400_000).toISOString();
    expect(formatPriceLabel({ ...base, saleEndsAt: futureDate })).toMatch(/^offer ends /);
  });
});

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

describe("formatDeprovisionDate", () => {
  test("ISO → long-form (Month D, YYYY)", () => {
    // Fix to mid-day UTC to avoid TZ-edge variance in en-US output
    const iso = "2026-06-15T12:00:00Z";
    expect(formatDeprovisionDate(iso)).toBe("June 15, 2026");
  });
});

describe("formatDeactivatedDate", () => {
  test("ISO → short-form (Mon D, YYYY)", () => {
    const iso = "2026-04-01T12:00:00Z";
    expect(formatDeactivatedDate(iso)).toBe("Apr 1, 2026");
  });
});

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

const basePool: UsagePool = {
  slug: "x", label: "Tickets", limit: 5, used: 2, countLabel: "used",
};

describe("computePoolTotal", () => {
  test("limit only when no purchased", () => {
    expect(computePoolTotal(basePool)).toBe(5);
  });
  test("limit + purchased", () => {
    expect(computePoolTotal({ ...basePool, purchased: 3 })).toBe(8);
  });
  test("purchased: 0 same as undefined", () => {
    expect(computePoolTotal({ ...basePool, purchased: 0 })).toBe(5);
  });
});

describe("formatPoolCount", () => {
  test("standard count", () => {
    expect(formatPoolCount(basePool)).toBe("2 / 5 used");
  });
  test("with purchased adds to total", () => {
    expect(formatPoolCount({ ...basePool, purchased: 3 })).toBe("2 / 8 used");
  });
  test("empty countLabel — no trailing space", () => {
    expect(formatPoolCount({ ...basePool, countLabel: "" })).toBe("2 / 5");
  });
  test("days suffix", () => {
    expect(formatPoolCount({ ...basePool, used: 4, limit: 14, countLabel: "days" })).toBe("4 / 14 days");
  });
});

// ---------------------------------------------------------------------------
// Days remaining
// ---------------------------------------------------------------------------

describe("formatDaysRemaining", () => {
  test("plural for N > 1", () => {
    expect(formatDaysRemaining(14)).toBe("14 days remaining");
  });
  test('singular "1 day remaining"', () => {
    expect(formatDaysRemaining(1)).toBe("1 day remaining");
  });
  test("returns null at 0", () => {
    expect(formatDaysRemaining(0)).toBeNull();
  });
  test("returns null for negative (defensive)", () => {
    expect(formatDaysRemaining(-3)).toBeNull();
  });
});
