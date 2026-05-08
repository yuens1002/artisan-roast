import { validateLicense } from "@/lib/license";
import {
  fetchPlans,
  filterPlansByVisibility,
  getMockHydratedPlans,
  getResolvedPlans,
} from "@/lib/plans";
import { IS_HOSTED } from "@/lib/hosted";
import { PlanPageClient } from "./PlanPageClient";
import type { HydratedPlan, Plan } from "artisan-roast-sdk/plans";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const license = await validateLicense();
  const params = await searchParams;

  const isHostedView = IS_HOSTED || license.tier === "HOSTED";

  // Dev mock path — MOCK_PLAN_SCENARIO (env) or ?scenario= (query) selects a single scenario
  if (process.env.MOCK_LICENSE_TIER) {
    const scenarioKey = process.env.MOCK_PLAN_SCENARIO ?? params.scenario;
    let hydratedPlans: HydratedPlan[];
    if (scenarioKey) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SCENARIOS } = require("artisan-roast-sdk") as { SCENARIOS: Record<string, HydratedPlan> };
      hydratedPlans = scenarioKey in SCENARIOS ? [SCENARIOS[scenarioKey]!] : filterPlansByVisibility(getMockHydratedPlans(), isHostedView);
    } else {
      hydratedPlans = filterPlansByVisibility(getMockHydratedPlans(), isHostedView);
    }
    return <PlanPageClient license={license} plans={hydratedPlans} />;
  }

  // Live path — prefer resolved plans endpoint (per-license hydration, 60s TTL)
  const resolvedPlans = await getResolvedPlans();
  if (resolvedPlans) {
    return <PlanPageClient license={license} plans={resolvedPlans} />;
  }

  // Fallback — no LICENSE_KEY or resolved endpoint unavailable; use catalog + local hydration
  let rawPlans: Plan[];
  try {
    rawPlans = await fetchPlans();
  } catch {
    rawPlans = [];
  }

  const visiblePlans = filterPlansByVisibility(rawPlans, isHostedView);
  const hydratedPlans: HydratedPlan[] = visiblePlans.map((plan) => ({
    ...plan,
    state: { status: "NONE" as const, actions: [] },
  }));

  return <PlanPageClient license={license} plans={hydratedPlans} />;
}
