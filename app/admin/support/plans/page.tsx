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

  // Filter the catalog by build mode — disjoint sets between self-hosted and hosted.
  const visiblePlans = filterPlansByVisibility(plans, IS_HOSTED);

  // Hosted-mode trial status drives the Trial card visibility.
  const trialStatus = IS_HOSTED ? await getTrialStatus() : null;

  // Trial card visibility rule: show only when trial is ACTIVE or EXPIRED.
  // Hide on CONVERTED, on direct-subscribe (no trial record), and on self-hosted.
  const showTrialCard =
    trialStatus?.status === "ACTIVE" || trialStatus?.status === "EXPIRED";
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
