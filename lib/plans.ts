/**
 * Plans Module — Fetches available subscription plans from the platform.
 *
 * Public endpoint, no auth required. Cached for 24 hours.
 * Falls back to self-hosted plans on error so Community + Priority Support are always visible.
 */

import type { HydratedPlan, Plan } from "artisan-roast-sdk/plans";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_URL = (
  process.env.PLATFORM_URL || "https://manage.artisanroast.app"
).replace(/\/+$/, "");

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let cached: { data: Plan[]; expiresAt: number } | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fetch available plans from the platform. Cached 24h. */
export async function fetchPlans(): Promise<Plan[]> {
  // Dev mock override
  if (process.env.MOCK_LICENSE_TIER) {
    return MOCK_PLANS;
  }

  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const response = await fetch(`${PLATFORM_URL}/api/plans`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("Plans fetch failed:", response.status);
      return SELF_HOSTED_FALLBACK_PLANS;
    }

    const raw = (await response.json()) as { plans: (Omit<Plan, "visibility"> & { visibility: Plan["visibility"] | null })[] };
    const rawPlans = raw.plans || [];
    if (rawPlans.length === 0) {
      console.warn("Plans API returned empty list — using full mock fallback");
      return MOCK_PLANS;
    }
    // Normalize null visibility from legacy DB rows → "self-hosted"
    const plans: Plan[] = rawPlans.map((p) => ({
      ...p,
      visibility: p.visibility ?? "self-hosted",
    }));
    cached = { data: plans, expiresAt: Date.now() + CACHE_TTL };
    return plans;
  } catch (error) {
    console.error("Plans fetch error:", error);
    return SELF_HOSTED_FALLBACK_PLANS;
  }
}

/** Clear plans cache. */
export function invalidatePlansCache(): void {
  cached = null;
}

/**
 * Filter the plan catalog by build-mode visibility.
 *
 * Self-hosted instances see only `visibility: "self-hosted"` plans.
 * Hosted instances see only `visibility: "hosted"` plans.
 * Generic so it works with both Plan[] and HydratedPlan[] without losing type info.
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

// ---------------------------------------------------------------------------
// Mock plans (for MOCK_LICENSE_TIER env var) + self-hosted fallback
// ---------------------------------------------------------------------------

const MOCK_PLANS: Plan[] = [
  {
    slug: "free",
    name: "Community",
    description: "Open-source self-hosted store with community support",
    price: 0,
    currency: "USD",
    interval: "month",
    features: [],
    highlight: false,
    visibility: "self-hosted",
    saleLabel: "Forever",
    details: {
      benefits: {
        activeItems: [
          "Full e-commerce platform",
          "Unlimited products & orders",
          "Community support via GitHub",
          "Self-hosted — you own your data",
        ],
      },
      excludes: [
        "Priority support tickets",
        "1:1 video sessions",
        "AI-powered features",
        "Google Analytics integration",
      ],
    },
  },
  {
    slug: "priority-support",
    name: "Priority Support",
    description: "Dedicated support with guaranteed response times",
    price: 4900,
    currency: "USD",
    interval: "month",
    features: ["priority-support"],
    highlight: true,
    visibility: "self-hosted",
    salePrice: 2900,
    saleEndsAt: "2026-04-25T00:00:00Z",
    saleLabel: "Launch Special",
    details: {
      benefits: {
        activeItems: [
          "Priority email support with 48-hr SLA",
          "5 support tickets per month",
          "1 one-on-one session per month (30 min)",
          "Anonymous GitHub issue tracking & transparency",
        ],
      },
      sla: {
        responseTime: "48 hours",
        availability: "Business days (Mon–Fri)",
      },
      quotas: [
        { icon: "ticket", slug: "tickets", label: "Priority Tickets", limit: 5 },
        { icon: "calendar", slug: "one-on-one", label: "1:1 Sessions", limit: 1 },
      ],
      scope: [
        "Setup & configuration",
        "Troubleshooting",
        "Platform guidance",
      ],
      excludes: [
        "Custom development",
        "Feature requests",
        "Third-party integrations",
      ],
      terms: [
        "Billed monthly, cancel anytime from your billing dashboard",
        "Unused tickets do not roll over to the next billing period",
        "Purchased add-on credits never expire",
      ],
    },
    actionModals: [
      {
        slug: "cancel-subscription",
        heading: "Cancel your subscription?",
        description: "We'll redirect you to Stripe to complete cancellation. Tell us why first — your feedback helps us improve.",
        reasonsLabel: "Reason for cancelling",
        reasons: [
          { value: "too-expensive", label: "Too expensive" },
          { value: "missing-features", label: "Missing features" },
          { value: "switching", label: "Switching to another platform" },
          { value: "no-longer-needed", label: "Don't need it anymore" },
          { value: "other", label: "Other" },
        ],
        keepLabel: "Keep subscription",
        confirmLabel: "Continue to Stripe",
        confirmIcon: "external-link",
      },
    ],
  },
  {
    slug: "house-blend-trial",
    name: "House Blend Trial",
    description: "14-day free trial of fully managed hosting",
    price: 0,
    currency: "USD",
    interval: "month",
    features: ["hosted-trial"],
    highlight: false,
    visibility: "hosted",
    details: {
      benefits: {
        activeItems: [
          "No billing needed — or add billing to extend your trial up to 30 days",
          "You own your trial data — download a ZIP anytime during the trial",
          "100% feature parity from day 1 — subscribe anytime to assign a custom domain",
          "Cancel anytime during your trial — no contract, no commitment",
        ],
      },
    },
    actionModals: [
      {
        slug: "cancel-trial",
        heading: "Cancel your trial?",
        description: "Your trial will be cancelled and your store deprovisioned. Tell us why before you go — your feedback helps us improve.",
        reasonsLabel: "Reason for cancelling",
        reasons: [
          { value: "too-expensive", label: "Too expensive" },
          { value: "missing-features", label: "Missing features" },
          { value: "switching", label: "Switching to another platform" },
          { value: "no-longer-needed", label: "Don't need it anymore" },
          { value: "other", label: "Other" },
        ],
        keepLabel: "Keep trial",
        confirmLabel: "Cancel trial",
      },
    ],
  },
  {
    slug: "house-blend",
    name: "House Blend",
    description: "Fully managed hosting with custom domain and priority support",
    price: 4900,
    currency: "USD",
    interval: "month",
    features: ["hosted"],
    highlight: true,
    visibility: "hosted",
    details: {
      benefits: {
        activeItems: [
          "Fully managed hosting — we run the infrastructure",
          "Custom domain on your store",
          "Automatic backups and security updates",
          "5 priority support tickets, 48-hr SLA",
        ],
      },
      sla: {
        responseTime: "48 hours",
        availability: "Business days (Mon–Fri)",
      },
      quotas: [
        { icon: "ticket", slug: "tickets", label: "Priority Tickets", limit: 5 },
      ],
      scope: [
        "Hosting infrastructure",
        "Custom domain configuration",
        "Setup & configuration support",
        "Troubleshooting",
      ],
      terms: [
        "Billed monthly, cancel anytime from your billing dashboard",
        "Unused support tickets do not roll over to the next billing period",
        "Custom domain assignment held while subscription is active",
      ],
    },
    actionModals: [
      {
        slug: "cancel-subscription",
        heading: "Cancel your subscription?",
        description: "We'll redirect you to Stripe to complete cancellation. Tell us why first — your feedback helps us improve.",
        reasonsLabel: "Reason for cancelling",
        reasons: [
          { value: "too-expensive", label: "Too expensive" },
          { value: "missing-features", label: "Missing features" },
          { value: "switching", label: "Switching to another platform" },
          { value: "no-longer-needed", label: "Don't need it anymore" },
          { value: "other", label: "Other" },
        ],
        keepLabel: "Keep subscription",
        confirmLabel: "Continue to Stripe",
        confirmIcon: "external-link",
      },
    ],
  },
];

const SELF_HOSTED_FALLBACK_PLANS: Plan[] = MOCK_PLANS.filter(
  (p) => p.visibility === "self-hosted"
);

/** Dev mock set for MOCK_LICENSE_TIER-based HydratedPlan rendering. */
export function getMockHydratedPlans(): HydratedPlan[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SCENARIOS } = require("artisan-roast-sdk") as { SCENARIOS: Record<string, HydratedPlan> };
  return [
    SCENARIOS.SELF_HOSTED_FREE,
    SCENARIOS.PRIORITY_SUPPORT_NONE,
    SCENARIOS.TRIAL_ACTIVE_NO_CARD,
    SCENARIOS.CONVERTED,
  ].filter(Boolean) as HydratedPlan[];
}
