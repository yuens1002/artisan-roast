import { validateLicense } from "@/lib/license";
import { fetchPlans, filterPlansByVisibility } from "@/lib/plans";
import { IS_HOSTED, getTrialStatus } from "@/lib/hosted";
import { PlanPageClient } from "./PlanPageClient";
import type { Plan } from "@/lib/plan-types";

export default async function PlanPage() {
  const license = await validateLicense();

  let plans: Plan[];
  try {
    plans = await fetchPlans();
  } catch {
    plans = [];
  }

  // Visibility: hosted plans render whenever the customer is in any hosted
  // scenario — trial (HOSTED_TRIAL_ID set) OR paid hosted (license.tier).
  // The two paths converge once converted; direct-subscribe customers never
  // had HOSTED_TRIAL_ID set but still need to see the active House Blend card.
  const isHostedView = IS_HOSTED || license.tier === "HOSTED";
  const visiblePlans = filterPlansByVisibility(plans, isHostedView);

  // Trial status only when there's a trial record to fetch.
  const trialStatus = IS_HOSTED ? await getTrialStatus() : null;

  // Trial card visibility rule: show when trial is ACTIVE, EXPIRED, or CANCELLED.
  // Hide on CONVERTED, on direct-subscribe (no trial record), and on self-hosted.
  const showTrialCard =
    trialStatus?.status === "ACTIVE" ||
    trialStatus?.status === "EXPIRED" ||
    trialStatus?.status === "CANCELLED";
  const renderedPlans = visiblePlans.filter((p) => {
    if (p.slug === "house-blend-trial") return showTrialCard;
    return true;
  });

  return (
    <PlanPageClient
      license={license}
      plans={renderedPlans}
      trialStatus={trialStatus}
      extendUrl={process.env.PLATFORM_EXTEND_URL ?? ""}
      subscribeUrl={process.env.PLATFORM_SUBSCRIBE_URL ?? ""}
    />
  );
}
