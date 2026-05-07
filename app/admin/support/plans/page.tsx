import { validateLicense } from "@/lib/license";
import { fetchPlans, filterPlansByVisibility, getMockHydratedPlans } from "@/lib/plans";
import { IS_HOSTED, getTrialStatus } from "@/lib/hosted";
import { PlanPageClient } from "./PlanPageClient";
import type { HydratedPlan, Plan, UsagePool as SdkUsagePool, PlanAction } from "artisan-roast-sdk/plans";
import type { LicenseInfo } from "@/lib/license-types";
import type { TrialStatus } from "@/lib/hosted";

// ---------------------------------------------------------------------------
// TODO: remove in Session C — replaced by GET /api/plans/resolved
// ---------------------------------------------------------------------------

function hydrateFromLicense(
  plans: Plan[],
  license: LicenseInfo,
  trialStatus: TrialStatus | null,
  extendUrl: string,
  subscribeUrl: string,
): HydratedPlan[] {
  return plans.map((plan): HydratedPlan => {
    // House Blend Trial — map from TrialStatus
    if (plan.slug === "house-blend-trial" && trialStatus) {
      if (trialStatus.status === "ACTIVE") {
        const cardAdded = trialStatus.cardAdded;
        const actions: PlanAction[] = [];
        if (!cardAdded && extendUrl) {
          actions.push({ slug: "add-billing", label: "Add Billing", url: extendUrl, variant: "primary" });
        }
        if (cardAdded && extendUrl) {
          actions.push({ slug: "manage-billing", label: "Manage Billing", url: extendUrl, iconAfter: "external-link", variant: "secondary" });
        }
        const cancelModalSlug = cardAdded ? "cancel-stripe" : "cancel-trial";
        if (plan.actionModals?.find((m) => m.slug === cancelModalSlug)) {
          actions.push({ slug: "cancel", label: "Cancel Trial", variant: "ghost", modalSlug: cancelModalSlug });
        }
        return {
          ...plan,
          state: {
            status: "TRIAL",
            badge: cardAdded ? "Extended Trial" : "Active Trial",
            badgeIcon: "clock",
            progress: {
              icon: "clock",
              label: "Trial days",
              value: trialStatus.daysRemaining,
              total: trialStatus.daysLimit,
              countLabel: "remaining",
            },
            deprovisionAt: trialStatus.deprovisionAt,
            actions,
          },
        };
      }
      if (trialStatus.status === "EXPIRED") {
        const expireDate = new Date(trialStatus.deprovisionAt).toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        });
        return {
          ...plan,
          state: {
            status: "EXPIRED",
            badge: "Expired",
            badgeIcon: "clock",
            progress: { icon: "clock", label: "Trial days", value: 0, total: trialStatus.daysLimit, countLabel: "remaining" },
            deprovisionAt: trialStatus.deprovisionAt,
            statusInfo: { descIcon: "alert-circle", descText: `Trial ended. Store will be removed on ${expireDate}.` },
            actions: subscribeUrl ? [{ slug: "subscribe", label: "Subscribe Now", url: subscribeUrl, variant: "primary", iconAfter: "external-link" }] : [],
          },
        };
      }
      if (trialStatus.status === "CANCELLED") {
        return {
          ...plan,
          state: {
            status: "CANCELLED",
            badge: "Cancelled",
            daysRemaining: trialStatus.daysRemaining,
            daysLimit: trialStatus.daysLimit,
            deprovisionAt: trialStatus.deprovisionAt,
            actions: [],
          },
        };
      }
    }

    // Active paid plan
    if (license.plan?.slug === plan.slug) {
      const pools: SdkUsagePool[] = license.support.pools
        .filter((p) => p.limit > 0 || p.purchased > 0)
        .map((p) => ({ slug: p.slug, label: p.label, limit: p.limit, used: p.used, purchased: p.purchased }));
      const actions: PlanAction[] = license.availableActions
        .filter((a) => a.slug !== "upgrade-pro" && a.slug !== "add-features")
        .map((a) => ({
          slug: a.slug,
          label: a.label,
          url: a.url,
          iconAfter: a.icon,
          variant: a.variant === "outline" ? ("secondary" as const) : (a.variant as PlanAction["variant"]),
        }));
      return { ...plan, state: { status: "ACTIVE", badge: "Active", badgeIcon: "check-circle-2", pools, actions } };
    }

    // Lapsed plan
    if (license.lapsed?.planSlug === plan.slug) {
      return {
        ...plan,
        state: {
          status: "INACTIVE",
          badge: "Inactive",
          badgeIcon: "circle-slash",
          deactivatedAt: license.lapsed.deactivatedAt,
          actions: license.lapsed.renewUrl
            ? [{ slug: "renew", label: "Renew", url: license.lapsed.renewUrl, variant: "primary", iconAfter: "external-link" }]
            : [],
        },
      };
    }

    // Community (free, no active paid plan)
    if (plan.price === 0 && !license.plan) {
      const pools: SdkUsagePool[] = license.support.pools
        .filter((p) => p.purchased > 0)
        .map((p) => ({ slug: p.slug, label: p.label, limit: p.limit, used: p.used, purchased: p.purchased }));
      const actions: PlanAction[] = license.availableActions
        .filter((a) => a.slug !== "upgrade-pro" && a.slug !== "add-features")
        .map((a) => ({
          slug: a.slug,
          label: a.label,
          url: a.url,
          iconAfter: a.icon,
          variant: a.variant === "outline" ? ("secondary" as const) : (a.variant as PlanAction["variant"]),
        }));
      return { ...plan, state: { status: "ACTIVE", badge: "Current Plan", badgeIcon: "check-circle-2", pools, actions } };
    }

    // None — not subscribed
    return { ...plan, state: { status: "NONE", actions: [] } };
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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

  // Live path
  let rawPlans: Plan[];
  try {
    rawPlans = await fetchPlans();
  } catch {
    rawPlans = [];
  }

  const visiblePlans = filterPlansByVisibility(rawPlans, isHostedView);
  const trialStatus = IS_HOSTED ? await getTrialStatus() : null;

  const showTrialCard =
    trialStatus?.status === "ACTIVE" ||
    trialStatus?.status === "EXPIRED" ||
    trialStatus?.status === "CANCELLED";

  const filteredPlans = visiblePlans.filter((p) => {
    if (p.slug === "house-blend-trial") return showTrialCard;
    return true;
  });

  // TODO: remove in Session C — replaced by GET /api/plans/resolved
  const hydratedPlans = hydrateFromLicense(
    filteredPlans,
    license,
    trialStatus,
    process.env.PLATFORM_EXTEND_URL ?? "",
    process.env.PLATFORM_SUBSCRIBE_URL ?? "",
  );

  return <PlanPageClient license={license} plans={hydratedPlans} />;
}
