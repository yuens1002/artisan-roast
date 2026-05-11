/**
 * Pure formatters for plan rendering.
 *
 * No React imports; no DOM access. Each function takes typed input and
 * returns a string (or null when nothing should render). Unit-tested in
 * `__tests__/formatters.test.ts`. PlanPageClient and its card components
 * import these instead of inlining transforms — separation of concerns:
 * components project data → DOM; formatters compute the strings.
 *
 * Drift discipline: when a SDK type adds a new field that affects rendered
 * copy (e.g. quotas.cadence), add the formatter here, unit-test it, and
 * have the component call it. Tests catch regressions on the formatter
 * side; component tests catch wiring regressions.
 */
import type { HydratedPlan, UsagePool } from "artisan-roast-sdk/plans";

// ---------------------------------------------------------------------------
// Price formatters
// ---------------------------------------------------------------------------

/** Price in cents → "$XX" (no decimals). Always uses USD symbol today;
 *  multi-currency support is a known gap (see architecture.md §9.4). */
export function formatPriceDisplay(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(0)}`;
}

/** Plan.interval → "/mo" | "/yr". */
export function formatIntervalLabel(interval: HydratedPlan["interval"]): string {
  return interval === "year" ? "/yr" : "/mo";
}

/** True when the plan has an active sale right now.
 *  Drives whether the renderer shows the sale price + crossed-out regular price.
 *  - `salePrice` must be set, AND
 *  - if `saleEndsAt` is set, it must be in the future.
 *  When `saleEndsAt` is absent (label-only sales, no expiry), `salePrice`
 *  alone is enough. */
export function isSaleActive(plan: HydratedPlan): boolean {
  if (plan.salePrice == null) return false;
  if (plan.saleEndsAt && new Date(plan.saleEndsAt) <= new Date()) return false;
  return true;
}

/** Composes saleLabel + saleEndsAt into the small text below the price.
 *  Returns null when the sale is not active (no label set OR sale ended). */
export function formatPriceLabel(plan: HydratedPlan): string | null {
  if (!plan.saleLabel && !plan.saleEndsAt) return null;
  if (plan.saleEndsAt && new Date(plan.saleEndsAt) <= new Date()) return null;
  const parts: string[] = [];
  if (plan.saleLabel) parts.push(plan.saleLabel);
  if (plan.saleEndsAt) {
    const ends = new Date(plan.saleEndsAt).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    parts.push(`offer ends ${ends}`);
  }
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Date formatters
// ---------------------------------------------------------------------------

/** ISO date → "Month D, YYYY" (e.g. "May 11, 2026").
 *  Used for `deprovisionAt` on CancelledCard. */
export function formatDeprovisionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** ISO date → "Mon D, YYYY" (e.g. "May 11, 2026").
 *  Used for `deactivatedAt` on InactiveCard. */
export function formatDeactivatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Pool formatters
// ---------------------------------------------------------------------------

/** UsagePool total = limit + (purchased ?? 0). */
export function computePoolTotal(pool: UsagePool): number {
  return pool.limit + (pool.purchased ?? 0);
}

/** UsagePool → "{used} / {total} {countLabel}" for the count display.
 *  countLabel concatenated as-is; if empty, no trailing space. */
export function formatPoolCount(pool: UsagePool): string {
  const total = computePoolTotal(pool);
  const suffix = pool.countLabel ? ` ${pool.countLabel}` : "";
  return `${pool.used} / ${total}${suffix}`;
}

// ---------------------------------------------------------------------------
// Days remaining (CancelledState)
// ---------------------------------------------------------------------------

/** Singular/plural projection. Returns null when days <= 0 (no line shown). */
export function formatDaysRemaining(days: number): string | null {
  if (days <= 0) return null;
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}
