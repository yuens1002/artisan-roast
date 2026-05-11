/**
 * Plan scenario fixtures — composed from SDK SCENARIOS.
 *
 * Used for:
 *   - The dev `?scenario=<key>` override on /admin/support/plans (manual
 *     iteration without the platform stack running).
 *   - `scripts/screenshot-plan-scenarios.ts` (visual harness).
 *
 * NOT used for renderer correctness tests. Those live in `__tests__/contract/*`
 * and drive their inputs from typed factories — independent of any fixture.
 *
 * NOT used for prod-shape correctness either. That comes from the captured-
 * payload e2e suite (`e2e/plans/`) which replays real prod responses.
 *
 * Drift posture:
 *   - SDK-export references are pinned by `sdk-scaffold-pins.test.ts`.
 *   - Hand-derived constants below are *examples*, not specs. Their content
 *     does not gate any correctness test. They exist so the dev override
 *     and screenshot script have something to render.
 */
import type { HydratedPlan, NoneState, CancelledState } from "artisan-roast-sdk/plans";
import { SCENARIOS } from "artisan-roast-sdk/plans";

// ---------------------------------------------------------------------------
// Hand-derived examples — for combinations the SDK doesn't ship directly.
// Treat these as "one realistic shape", not authoritative.
// ---------------------------------------------------------------------------

const FREE_NONE: HydratedPlan = {
  ...SCENARIOS.SELF_HOSTED_FREE,
  state: {
    status: "NONE",
    actions: [
      { slug: "view-terms", label: "View Terms", url: "/admin/support/terms", variant: "ghost" },
    ],
  } satisfies NoneState,
};

const HB_NONE: HydratedPlan = {
  ...SCENARIOS.CONVERTED,
  state: {
    status: "NONE",
    actions: [
      {
        slug: "subscribe",
        label: "Subscribe Now",
        url: "https://buy.stripe.com/test_subscribe",
        variant: "primary",
        iconAfter: "external-link",
      },
    ],
  } satisfies NoneState,
};

const TRIAL_CANCELLED_WITH_CARD: HydratedPlan = {
  ...SCENARIOS.TRIAL_ACTIVE_CARD_ADDED,
  state: {
    status: "CANCELLED",
    badge: "Cancelled",
    daysRemaining: 14,
    daysLimit: 30,
    deprovisionAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    actions: [],
  } satisfies CancelledState,
};

// ---------------------------------------------------------------------------
// Scenario map — dev-key → HydratedPlan[]
//
// Mirrors the dev license keys seeded in
// artisan-roast-platform/scripts/seed-dev-scenarios.ts.
// ---------------------------------------------------------------------------

export const SCENARIO_FIXTURES = {
  // ── Self-hosted group ──────────────────────────────────────────────────
  "dev-free":         [SCENARIOS.SELF_HOSTED_FREE, SCENARIOS.PRIORITY_SUPPORT_NONE],
  "dev-pro":          [FREE_NONE, SCENARIOS.PRIORITY_SUPPORT_ACTIVE],
  "dev-pro-inactive": [SCENARIOS.SELF_HOSTED_FREE, SCENARIOS.PRIORITY_SUPPORT_INACTIVE],

  // ── Hosted group ───────────────────────────────────────────────────────
  "dev-hosted-active-no-card": [SCENARIOS.TRIAL_ACTIVE_NO_CARD, HB_NONE],
  "dev-hosted-active-card":    [SCENARIOS.TRIAL_ACTIVE_CARD_ADDED, HB_NONE],
  "dev-hosted-expired":        [SCENARIOS.TRIAL_EXPIRED, HB_NONE],
  "dev-hosted-converted":      [SCENARIOS.CONVERTED],
  "dev-hosted-cancelled-card": [TRIAL_CANCELLED_WITH_CARD],
  "dev-hosted-inactive":       [SCENARIOS.INACTIVE],

  // ── Empty (resolver returns no cards) ──────────────────────────────────
  "dev-hosted-cancelled":      [],
  "dev-hosted-pending":        [],
  "dev-hosted-provisioning":   [],
  "dev-hosted-deprovisioned":  [],
} satisfies Record<string, HydratedPlan[]>;

export type ScenarioKey = keyof typeof SCENARIO_FIXTURES;

export const SELF_HOSTED_KEYS: ScenarioKey[] = [
  "dev-free",
  "dev-pro",
  "dev-pro-inactive",
];

export const HOSTED_KEYS: ScenarioKey[] = [
  "dev-hosted-active-no-card",
  "dev-hosted-active-card",
  "dev-hosted-expired",
  "dev-hosted-converted",
  "dev-hosted-cancelled-card",
  "dev-hosted-inactive",
  "dev-hosted-cancelled",
  "dev-hosted-pending",
  "dev-hosted-provisioning",
  "dev-hosted-deprovisioned",
];

export const ALL_KEYS: ScenarioKey[] = [...SELF_HOSTED_KEYS, ...HOSTED_KEYS];
