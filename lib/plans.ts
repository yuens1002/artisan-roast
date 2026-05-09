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
 * Fetch pre-hydrated plans from the platform. Used by the plans page.
 * Returns HydratedPlan[] with state pre-computed from the DB.
 */
export async function fetchResolvedPlans(overrideKey?: string): Promise<HydratedPlan[]> {
  const licenseKey = overrideKey ?? process.env.LICENSE_KEY;
  if (!licenseKey) {
    console.error("LICENSE_KEY not set — cannot fetch resolved plans");
    return [];
  }

  try {
    const response = await fetch(`${PLATFORM_URL}/api/plans/resolved`, {
      headers: { Authorization: `Bearer ${licenseKey}` },
      signal: AbortSignal.timeout(10_000),
      next: overrideKey ? { revalidate: 0 } : { revalidate: 60 },
    });

    if (!response.ok) {
      console.error("Resolved plans fetch failed:", response.status);
      return [];
    }

    const data = (await response.json()) as { plans: HydratedPlan[] };
    return data.plans ?? [];
  } catch (error) {
    console.error("Resolved plans fetch error:", error);
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
