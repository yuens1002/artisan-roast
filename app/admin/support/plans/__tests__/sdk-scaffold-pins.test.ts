/**
 * SDK SCAFFOLD pins.
 *
 * Snapshots every SDK SCENARIO the fixture imports. When `npm i artisan-roast-sdk@…`
 * changes a SCAFFOLD's value (badge text, benefit copy, action labels, etc.),
 * the snapshot diff surfaces it. Reviewer accepts (`-u`) intentional changes
 * or rejects regressions.
 *
 * This is the loudest signal you can build for SDK→fixture drift. TypeScript
 * already catches required-shape changes; this catches *value* changes that
 * the renderer pulls through verbatim.
 *
 * Date-derived fields are normalised before snapshotting so test runs don't
 * differ from each other (the SDK uses `Date.now()` for several scaffolds).
 */
import { SCENARIOS } from "artisan-roast-sdk/plans";
import type { HydratedPlan } from "artisan-roast-sdk/plans";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const READABLE_DATE_RE = /\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/g;
// Date-only YYYY-MM-DD embedded in a string, e.g. "Renews on 2026-06-11."
// (the SDK's renewalDateStr() produces these). Anchored on word boundaries
// so it doesn't clip the date portion of a full ISO timestamp.
const DATE_ONLY_RE = /\b\d{4}-\d{2}-\d{2}\b/g;

/** Replace runtime-computed dates with stable placeholders so the snapshot
 *  is deterministic across test runs. ISO timestamps → <ISO_DATE>;
 *  "Month D, YYYY" and bare YYYY-MM-DD → <DATE>. */
function normaliseDates(value: unknown): unknown {
  if (typeof value === "string") {
    if (ISO_DATE_RE.test(value)) return "<ISO_DATE>";
    return value
      .replace(READABLE_DATE_RE, "<DATE>")
      .replace(DATE_ONLY_RE, "<DATE>");
  }
  if (Array.isArray(value)) return value.map(normaliseDates);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normaliseDates(v);
    }
    return out;
  }
  return value;
}

describe("SDK SCAFFOLD pins", () => {
  test("all SCENARIOS keys we depend on are exported", () => {
    const expected = [
      "SELF_HOSTED_FREE",
      "SELF_HOSTED_FREE_WITH_ADDONS",
      "PRIORITY_SUPPORT_NONE",
      "PRIORITY_SUPPORT_ACTIVE",
      "PRIORITY_SUPPORT_INACTIVE",
      "TRIAL_ACTIVE_NO_CARD",
      "TRIAL_ACTIVE_CARD_ADDED",
      "TRIAL_EXPIRED",
      "PENDING",
      "CONVERTED",
      "DIRECT_SUBSCRIBE",
      "INACTIVE",
    ] as const;
    for (const key of expected) {
      expect(SCENARIOS[key]).toBeDefined();
    }
  });

  test("SCAFFOLDS shape is pinned", () => {
    const pinned: Record<string, HydratedPlan> = {};
    for (const key of Object.keys(SCENARIOS).sort()) {
      pinned[key] = normaliseDates(SCENARIOS[key]) as HydratedPlan;
    }
    expect(pinned).toMatchSnapshot();
  });
});
