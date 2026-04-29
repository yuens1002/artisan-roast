# Hosting Extension — Trial UI · ACs

**Branch:** `feat/hosted-store-s2`
**Plan:** [`docs/features/hosting-extension/trial-ui-plan.md`](../features/hosting-extension/trial-ui-plan.md)
**Architecture:** [`docs/features/hosting-extension/ARCHITECTURE.md`](../features/hosting-extension/ARCHITECTURE.md)
**Iterations:** 0 (initial)

---

## Column definitions

| Column | Filled by | When |
|---|---|---|
| **Agent** | Verification sub-agent | During `/ac-verify` — PASS/FAIL with brief evidence |
| **QC** | Main thread agent | After reading sub-agent report — confirms or overrides |
| **Reviewer** | Human (reviewer) | During manual review — final approval per AC |

Screenshots saved to `.screenshots/hosting-extension-trial-ui/` (gitignored).

---

## Test fixture setups

UI ACs use one of seven fixture lifecycle states. Each runs against a mock service on `localhost:3001` returning the `TrialStatus` JSON shape documented in [`ARCHITECTURE.md`](../features/hosting-extension/ARCHITECTURE.md#integration-contract).

**Setup A — Self-hosted (Community current):** no `HOSTED_TRIAL_ID`, no Priority Support active.

**Setup B — Self-hosted (Priority Support active):** no `HOSTED_TRIAL_ID`, Priority Support license active.

**Setup C — Trial · active · no-card:**

```bash
HOSTED_TRIAL_ID=test-trial-active
PLATFORM_API_URL=http://localhost:3001
PLATFORM_EXTEND_URL=https://buy.stripe.com/test_extend_link
PLATFORM_SUBSCRIBE_URL=https://buy.stripe.com/test_subscribe_link
LICENSE_KEY=test-license-key
```

Mock returns `TrialStatus` with `status: "ACTIVE"`, `cardAdded: false`, `daysRemaining` < `daysLimit: 14`.

**Setup D — Trial · active · card-added:** same env. Mock returns `cardAdded: true`, `daysLimit: 30`.

**Setup E — Trial · expired (grace period):** same env. Mock returns `status: "EXPIRED"`, `daysRemaining: 0`, `deprovisionAt` in the future.

**Setup F — Hosted Paid · converted from trial:** same env. Mock returns `status: "CONVERTED"` with `plan` + `support.pools` populated.

**Setup G — Hosted Paid · direct-subscribe:** `HOSTED_TRIAL_ID` unset (no trial record); HOSTED-tier license configured. Mock service returns license with Priority Tickets pool populated.

---

## UI Acceptance Criteria

### Self-hosted plan-page states

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-1a | Self-hosted plans page renders Community + Priority Support cards (Setup A) | Screenshot: navigate to `/admin/support/plans` | Two cards visible: Community (active · "Current Plan" badge) + Priority Support (none / Subscribe). No House Blend cards in DOM | | | |
| AC-UI-1b | Community card flips to `inactive` when Priority Support is active (Setup B) | Screenshot: same path with Setup B | Community card present with inactive-style appearance (no "Current Plan" badge); Priority Support card in `active` state with usage bars + Manage CTA | | | |
| AC-UI-2a | Priority Support `none` state — pricing + Subscribe (Setup A) | Screenshot: same path | Priority Support card shows price, benefits list, [Subscribe] primary button | | | |
| AC-UI-2b | Priority Support `active` state — usage + Manage (Setup B) | Screenshot: same path | "Active" badge, renewal date, support pools UsageBar, [Manage] action | | | |

### Hosted plan-page states (cards visibility)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-3 | Hosted plans page hides Community + Priority Support; shows House Blend Trial + House Blend (Setup C) | Screenshot: `/admin/support/plans` | No Community or Priority Support cards in DOM. House Blend Trial in `active` state + House Blend in `none` state visible | | | |
| AC-UI-4 | House Blend Trial card hidden on CONVERTED (Setup F) | Screenshot: same path | No House Blend Trial card in DOM. Only House Blend (active) visible | | | |
| AC-UI-5 | House Blend Trial card hidden on direct-subscribe (Setup G) | Screenshot: same path | No House Blend Trial card in DOM. Only House Blend (active) visible — visually identical to Setup F | | | |
| AC-UI-6 | Plans page renders correctly when status fetch fails | Screenshot: with mock returning 500 (or `PLATFORM_API_URL` pointing to nothing) | Page does NOT crash; Trial card shows error fallback ("Trial info unavailable") or omits gracefully; House Blend card still renders | | | |

### House Blend Trial card — sub-states

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-7 | Trial card uses Clock icon (not CheckCircle2) | Screenshot: any of Setups C/D/E showing Trial card | Lucide `Clock` icon visible on the card; differs visually from the converted Hosted card's CheckCircle2 | | | |
| AC-UI-8 | Trial card "Active Trial" badge (Setup C) | Screenshot: Setup C Trial card | Badge text reads "Active Trial" | | | |
| AC-UI-9 | Trial card "Extended Trial" badge (Setup D) | Screenshot: Setup D Trial card | Badge text reads "Extended Trial" (no "pending" wording) | | | |
| AC-UI-10 | Trial card "Expired" badge (Setup E) | Screenshot: Setup E Trial card | Badge text reads "Expired" | | | |
| AC-UI-11 | Trial card tagline rendered | Code review: TrialPlanCard component | Tagline copy reads "Risk-free for 14 days — full hosting, no card, no commitment." | | | |
| AC-UI-12 | Trial-days status bar — direct format (Setup C) | Screenshot: Trial card with Setup C | Status bar reads in direct format ("X days remaining" or "X / 14 remaining"); progress bar reflects remaining proportion | | | |
| AC-UI-13 | Trial-days status bar limit changes 14 → 30 when card added (Setups C → D) | Screenshot: side-by-side Setups C and D Trial cards | Setup C bar shows out of 14; Setup D shows out of 30 (extended) | | | |
| AC-UI-14 | Trial card 4-bullet benefits list rendered | Screenshot: Trial card | Four bullet items visible with the agreed copy: no-billing-needed, own-your-data, feature-parity, cancel-anytime | | | |

### House Blend Trial card — actions

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-15 | Trial card actions layout (no-card, Setup C) | Screenshot: Trial card bottom row | Bottom-left: "Cancel" text-link only (no Details — Trial has no detail page). Bottom-right: [Add Billing] primary button enabled | | | |
| AC-UI-16 | Add Billing CTA disabled when card-added (Setup D) | Screenshot: Setup D Trial card actions row | [Add Billing] button visibly disabled with explanatory tooltip on hover; "Cancel" still available | | | |
| AC-UI-17 | Add Billing CTA opens `PLATFORM_EXTEND_URL` in new tab (Setup C) | Interactive: click [Add Billing] | Browser opens `PLATFORM_EXTEND_URL` value in new tab | | | |
| AC-UI-18 | Trial card has no Details button | Code review: TrialPlanCard render | No `Details` action element in the trial card's actions area; only Cancel text-link + Add Billing button | | | |

### House Blend card — during trial (`none` state)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-19 | House Blend card renders with name + tagline + benefits (Setup C) | Screenshot: House Blend card | Card shows "House Blend" name, tagline, benefits list. **Benefits list includes "5 priority support tickets, 48-hr SLA"** bullet | | | |
| AC-UI-20 | House Blend card actions layout | Screenshot: House Blend card bottom row | Bottom-left: [Details] button. Bottom-right: [Subscribe Now] primary button | | | |
| AC-UI-21 | Subscribe Now CTA always visible regardless of card-added (Setups C and D) | Screenshot: side-by-side Setups C/D House Blend cards | [Subscribe Now] CTA present in both states | | | |
| AC-UI-22 | Subscribe Now opens `PLATFORM_SUBSCRIBE_URL` in new tab | Interactive: click [Subscribe Now] | Browser opens `PLATFORM_SUBSCRIBE_URL` in new tab | | | |
| AC-UI-23 | Details button opens House Blend detail page | Interactive: click [Details] on House Blend card | Navigates to `/admin/support/plans/house-blend`; detail page renders without errors | | | |

### House Blend card — after conversion (`active` state)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-24 | House Blend card converts to `active` state (Setup F) | Screenshot: House Blend card with Setup F | CheckCircle2 icon, "Active" badge, renewal date, [Manage billing] action | | | |
| AC-UI-25 | Priority Tickets status bar present on active Hosted card | Screenshot: active House Blend card | UsageBar visible with priority-tickets pool data ("X / 5 used" or similar) | | | |
| AC-UI-26 | Manage billing opens Stripe Portal in new tab | Interactive: click [Manage billing] | Calls `POST /api/billing/portal`; opens returned URL in new tab | | | |

### Cancel modal

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-27 | Cancel modal opens from Trial card (no-card, Setup C) | Interactive: click "Cancel" text-link on Trial card | Modal opens with "Cancel your trial?" heading | | | |
| AC-UI-28 | Cancel modal includes reason dropdown | Screenshot: open Cancel modal | Dropdown labeled "Reason for cancelling" (or similar); curated options visible | | | |
| AC-UI-29 | "Other" reveals textarea | Interactive: select "Other" from reason dropdown | Textarea appears below; max length ~500 chars; placeholder hint visible | | | |
| AC-UI-30 | Cancel modal — card-added variant (Setup D) | Interactive: click "Cancel" on Setup D Trial card | Modal heading reads "Cancel your subscription?"; primary button reads "Continue to Stripe →" | | | |
| AC-UI-31 | Cancel modal — card-added → opens Stripe Portal | Interactive: select reason → click "Continue to Stripe →" (Setup D) | Calls `POST /api/billing/portal`; opens URL in new tab | | | |
| AC-UI-32 | Cancel modal — Hosted Paid (Manage Billing → cancel intent) | Interactive: trigger cancel from Hosted card flow (Setup F) | Same reason-capture UX as states 27-31; Stripe Portal opens after reason saved | | | |

### Download Your Data

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-33 | Download Your Data card visible on Data Privacy tab — all build modes | Screenshot: `/admin/support/terms` Data Privacy tab in Setups A and C and F | Card with "Download Your Data" heading and [Download ZIP] button visible in all setups (not gated on hosted) | | | |

### Mobile responsiveness

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-34 | Plans page renders cleanly at mobile (≤768px) — Setup C | Screenshot: 375px viewport | No horizontal overflow; cards stack vertically; status bar + buttons remain tappable | | | |
| AC-UI-35 | Plans page renders cleanly at mobile — Setup A (regression) | Screenshot: 375px viewport with Setup A | Self-hosted layout pixel-identical to current main at 375px (regression) | | | |

---

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-FN-1 | `IS_HOSTED` evaluates from `HOSTED_TRIAL_ID` env | Code review: `lib/hosted.ts` | Constant truthy when env set, falsy otherwise; mirrors `IS_DEMO` shape | | | |
| AC-FN-2 | `getTrialStatus()` calls upstream with revalidate | Code review: `lib/hosted.ts` | Server-side fetch to `${PLATFORM_API_URL}/api/trial/hosted/${HOSTED_TRIAL_ID}/status` with `next: { revalidate: 60 }`; returns `null` on error (does not throw) | | | |
| AC-FN-3 | Plans catalog filters by visibility discriminator | Code review: `lib/plans.ts` + `PlanPageClient.tsx` | Each MOCK_PLAN entry has `visibility: "self-hosted" \| "hosted"`; PlanPageClient filters by `IS_HOSTED` before rendering | | | |
| AC-FN-4 | Trial card visibility rule | Code review: `PlanPageClient.tsx` | Trial card render is conditional on `trialStatus?.status === "ACTIVE" \|\| "EXPIRED"`; hidden for CONVERTED and null status | | | |
| AC-FN-5 | Add Billing disabled state binds to card-added | Code review: TrialPlanCard | Disabled prop / className wired to the `cardAdded` field of `TrialStatus` | | | |
| AC-FN-6 | Subscribe Now and Manage billing call documented endpoints | Code review: TrialPlanCard / HostedPlanCard | Subscribe Now opens `PLATFORM_SUBSCRIBE_URL`; Manage billing fires `POST ${PLATFORM_API_URL}/api/billing/portal` with `Authorization: Bearer ${LICENSE_KEY}` and opens returned `url` | | | |
| AC-FN-7 | Cancel modal reason capture submits upstream | Code review: CancelTrialDialog | Form submission posts reason + optional textarea content to documented endpoint; failure surfaces a toast and keeps modal open. (No-card variant in this body of work mocks the call client-side — wiring identical, only fetch destination changes once endpoint ships) | | | |
| AC-FN-8 | Export endpoint returns ZIP with correct headers | Interactive: `curl -I http://localhost:4000/api/admin/export` (logged in) | `Content-Type: application/zip` and `Content-Disposition: attachment; filename="*.zip"` | | | |
| AC-FN-9 | Export ZIP includes data + media + manifest | Interactive: `curl -o /tmp/x.zip http://localhost:4000/api/admin/export && unzip -l /tmp/x.zip` | At minimum: `data/products.json`, `data/orders.json`, `data/users.json`, `data/siteSettings.json`, `media/` directory, `manifest.json` | | | |
| AC-FN-10 | Export endpoint requires admin auth | Interactive: `curl http://localhost:4000/api/admin/export` (no session) | 401 or 403; no ZIP body | | | |

---

## Test Coverage Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-TST-1 | `getTrialStatus()` returns parsed JSON on 200 | Test run: `npm run test:ci` | Mock `fetch` returns valid status JSON; assert function returns the same shape | | | |
| AC-TST-2 | `getTrialStatus()` returns null on 5xx / network error | Test run: `npm run test:ci` | Mock `fetch` returns 500; assert function returns `null` without throwing | | | |
| AC-TST-3 | `getTrialStatus()` returns null when env unset | Test run: `npm run test:ci` | Test with `HOSTED_TRIAL_ID` unset; assert null + no fetch call | | | |
| AC-TST-4 | `IS_HOSTED` reflects env presence | Test run: `npm run test:ci` | Two tests with env set/unset; assert constant value | | | |
| AC-TST-5 | Plan catalog filter selects correct plans by `IS_HOSTED` | Test run: `npm run test:ci` | Test renders / filters with each (IS_HOSTED, status) pair; asserts only expected plans pass the filter | | | |

---

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-REG-1 | All existing tests pass | Test run: `npm run test:ci` | All test suites pass; no new failures introduced | | | |
| AC-REG-2 | Precheck passes clean | Test run: `npm run precheck` | 0 TypeScript errors, 0 ESLint errors | | | |
| AC-REG-3 | Self-hosted plans page pixel-identical to main (Setup A) | Screenshot diff: side-by-side current `main` vs branch at `/admin/support/plans` | No visual difference at desktop / tablet / mobile breakpoints | | | |
| AC-REG-4 | Self-hosted Data Privacy tab adds only Download card | Screenshot diff: `/admin/support/terms` Data Privacy tab between main and branch with Setup A | Only the Download Your Data card is new; rest of the tab unchanged | | | |
| AC-REG-5 | Existing Priority Support flows still functional (Setup B) | Screenshot: `/admin/support` and `/admin/support/plans` with Setup B | Priority Support active card renders with usage bars + Manage; Submit Ticket flow still works | | | |

---

## Agent Notes

{Sub-agent writes iteration-specific notes here: blockers, evidence references, screenshots taken.}

## QC Notes

{Main thread writes fix notes here: what failed, what was changed, re-verification results.}

## Reviewer Feedback

{Human writes review feedback here. Items marked for revision go back into the iteration loop.}
