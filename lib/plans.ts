import type { HydratedPlan, Plan } from "artisan-roast-sdk/plans";

const PLATFORM_URL = (
  process.env.PLATFORM_URL || "https://manage.artisanroast.app"
).replace(/\/+$/, "");

/**
 * Fetch raw plan catalog from the platform. Used by detail/terms pages
 * that only need plan metadata, not resolved state.
 */
export async function fetchPlans(): Promise<Plan[]> {
  try {
    const response = await fetch(`${PLATFORM_URL}/api/plans`, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error("Plans fetch failed:", response.status);
      return [];
    }

    const raw = (await response.json()) as {
      plans: (Omit<Plan, "visibility"> & { visibility: Plan["visibility"] | null })[];
    };
    return (raw.plans ?? []).map((p) => ({
      ...p,
      visibility: p.visibility ?? "self-hosted",
    }));
  } catch (error) {
    console.error("Plans fetch error:", error);
    return [];
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
    console.error("[plans.fetch.failed]", {
      reason: "no-license-key",
      url: `${PLATFORM_URL}/api/plans/resolved`,
    });
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
