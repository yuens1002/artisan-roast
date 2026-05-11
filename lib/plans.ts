import type { HydratedPlan, Plan } from "artisan-roast-sdk/plans";
import { SCENARIOS } from "artisan-roast-sdk/plans";

const PLATFORM_URL = (
  process.env.PLATFORM_URL || "https://manage.artisanroast.app"
).replace(/\/+$/, "");

/**
 * Self-hosted fallback catalog. Returned by `fetchPlans()` when the provider
 * is unreachable so that plan-detail / terms pages (which call `notFound()`
 * when a plan slug isn't in the array) don't 404 during transient outages.
 *
 * Sourced from SDK SCENARIOS — the SDK's canonical examples of the self-hosted
 * plans. State stripped (fetchPlans returns Plan[], not HydratedPlan[]).
 */
function toPlan({ state, ...rest }: HydratedPlan): Plan {
  void state;
  return rest;
}

const SELF_HOSTED_FALLBACK_PLANS: Plan[] = [
  toPlan(SCENARIOS.SELF_HOSTED_FREE),
  toPlan(SCENARIOS.PRIORITY_SUPPORT_NONE),
];

/**
 * Fetch raw plan catalog from the provider. Used by detail/terms pages
 * that only need plan metadata, not resolved state.
 *
 * On unreachable provider / non-2xx / parse error, returns the self-hosted
 * fallback so plan-detail pages don't turn transient outages into 404s.
 */
export async function fetchPlans(): Promise<Plan[]> {
  try {
    const response = await fetch(`${PLATFORM_URL}/api/plans`, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error("[plans.fetch.failed]", { reason: "non-2xx", status: response.status, scope: "fetchPlans" });
      return SELF_HOSTED_FALLBACK_PLANS;
    }

    const raw = (await response.json()) as {
      plans: (Omit<Plan, "visibility"> & { visibility: Plan["visibility"] | null })[];
    };
    return (raw.plans ?? []).map((p) => ({
      ...p,
      visibility: p.visibility ?? "self-hosted",
    }));
  } catch (error) {
    console.error("[plans.fetch.failed]", { reason: "fetch-error", errorClass: (error as Error).name, scope: "fetchPlans" });
    return SELF_HOSTED_FALLBACK_PLANS;
  }
}

/**
 * Fetch pre-hydrated plans from the provider. Used by the plans page.
 * Returns HydratedPlan[] with state pre-computed from the provider's data.
 *
 * Observability — see docs/features/provider-plan-sdk-alignment/architecture.md §9.3:
 *   - `[plans.fetch.failed]` on fetch error / non-2xx / parse failure.
 *   - `[plans.empty.unexpected]` when license is valid but plans array is empty.
 * These surface in host logs; they are the runtime "did something break?" signal.
 */
export async function fetchResolvedPlans(overrideKey?: string): Promise<HydratedPlan[]> {
  const licenseKey = overrideKey ?? process.env.LICENSE_KEY;
  if (!licenseKey) {
    // Expected for Free-tier / unlicensed instances (.env.example marks
    // LICENSE_KEY optional). Don't emit error-level noise; reserve
    // [plans.fetch.failed] for cases where a license IS present but the
    // resolver call still fails.
    return [];
  }

  const url = `${PLATFORM_URL}/api/plans/resolved`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${licenseKey}` },
      signal: AbortSignal.timeout(10_000),
      next: overrideKey ? { revalidate: 0 } : { revalidate: 60 },
    });

    if (!response.ok) {
      console.error("[plans.fetch.failed]", {
        reason: "non-2xx",
        status: response.status,
        url,
      });
      return [];
    }

    let data: { plans?: HydratedPlan[] };
    try {
      data = (await response.json()) as { plans?: HydratedPlan[] };
    } catch (parseError) {
      console.error("[plans.fetch.failed]", {
        reason: "parse-error",
        errorClass: (parseError as Error).name,
        url,
      });
      return [];
    }

    const plans = data.plans ?? [];

    if (!Array.isArray(data.plans)) {
      console.error("[plans.fetch.failed]", {
        reason: "missing-plans-array",
        url,
      });
      return [];
    }

    if (plans.length === 0) {
      // Valid license + empty payload is suspicious but not fatal. Surface
      // it so monitoring can spot resolver regressions silently emptying
      // pages for real customers.
      console.warn("[plans.empty.unexpected]", { url });
    }

    return plans;
  } catch (error) {
    console.error("[plans.fetch.failed]", {
      reason: "fetch-error",
      errorClass: (error as Error).name,
      url,
    });
    return [];
  }
}

/**
 * Filter plan catalog by visibility.
 * Generic so it works with Plan[] and HydratedPlan[] without losing type info.
 */
export function filterPlansByVisibility<T extends Plan>(
  plans: T[],
  isHosted: boolean
): T[] {
  if (isHosted) {
    return plans.filter((p) => p.visibility === "hosted");
  }
  return plans.filter((p) => p.visibility === "self-hosted");
}
