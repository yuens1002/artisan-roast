<!-- markdownlint-disable MD036 -->
# Provider Plan SDK Alignment — Scenario Walkthrough Log

Manual verification of all 11 dev scenarios against `/admin/support/plans`.
Log all findings here during the walkthrough. Batch-implement once all scenarios are complete (or per user direction).

**Dev scenario keys:** `.dev-scenario-keys` in platform repo.
**Resolver:** `artisan-roast-platform/app/api/plans/resolved/route.ts`
**Renderer:** `ecomm-ai-app/app/admin/support/plans/PlanPageClient.tsx`

---

## Scenarios

### ✅ Scenario 1 — FREE (dev-free)

**Tier:** FREE | **Expected state:** ACTIVE (free plan)

**Findings — FIXED:**

- Missing "Free" price display on ACTIVE card → added price block to `ActiveCard`
- Missing "Forever" sale label → split `saleLabelActive` from `saleActive` in resolver; `free` plan has `saleLabel = "Forever"`, `saleEndsAt = null`
- Missing "View Terms" ghost CTA → added to `free` resolver `state.actions`

---

### ✅ Scenario 2 — PRO (dev-pro)

**Tier:** PRO | **Expected state:** ACTIVE (Priority Support active, pools live)

**Findings — FIXED:**

- Pool count label (`{used} / {total} {countLabel}`) was `text-muted-foreground` → removed muted class in `PoolBar`
- 3-dot menu was missing; old layout put pool CTAs in 3-dot (gated on `poolCtaActions.length > 0`) → redesigned `ActiveCard` bottom row: ghost text links + pool CTAs inline left, 3-dot with management actions (`menuActions`) right, gated on `menuActions.length > 0`
- 1:1 sessions pool had no CTA → added `book-session` cta to `one-on-one` pool in `priority-support` PRO resolver; URL from `details.sla.sessionBooking` with fallback to `https://artisanroast.app/support/book`

**Observations (not bugs — data gaps):**

- Pool counts show 0/0 — `dev-pro` seed customer has no credit entries in DB; `getAvailableCredits` returns zeros. Expected for fresh seed. Consider seeding realistic credit values (e.g. 3 tickets used of 5, 0 sessions used of 1) so the progress bar renders meaningfully.

---

### ⏭ Scenario 3 — HOSTED / PENDING_VERIFICATION — SKIP

**Reason:** Customer has no store URL at this stage and cannot reach the plans page. Not a state we need to account for.

---

### ⏭ Scenario 4 — HOSTED / PROVISIONING — SKIP

**Reason:** Same as S3 — store not yet provisioned.

---

### 🔴 Scenario 5 — House Blend Trial (Active, no card) — dev-hosted-active-no-card

**Plain desc:** Customer just started the hosted trial. 14 days active, no billing card on file yet.
**Expected:** House Blend Trial (TRIAL) + House Blend (NONE). No Community Roast.

**Findings:**

- Community Roast showing — P5
- Badge should be "Trial Active" not "Trial" — P12 (update)
- Pool shows 0/0 — P6; bar should start empty and fill as days elapse
- Trial end date raw ISO — P7
- CTA label should be "Add Billing" (not "Add Card to Extend") with credit-card iconBefore — P10 (update), P13
- "Subscribe Now" secondary CTA should NOT appear for no-card state — P14
- House Blend NONE missing Subscribe CTA — P4
- House Blend benefits copy wrong — P8

---

### 🔴 Scenario 6 — House Blend Trial (Active, card on file) — dev-hosted-active-card

**Plain desc:** Customer added a billing card during the trial, extending it to 30 days. Trial is still running.
**Expected:** House Blend Trial ("Trial Extended") + House Blend (NONE). No Community Roast.

**Findings:**

- Community Roast showing — P5
- Badge "Trial (Card Added)" → should be "Trial Extended" — P11
- 0/0 pool days, raw ISO date — P6, P7
- Missing "Subscribe Now" primary CTA — P4
- "No billing needed — add card to extend to 30 days" benefit copy stale (card IS on file) — P8 (DB)
- "Cancel Trial" ghost label ✅ confirmed correct
- No "Add Billing" CTA — correct, card already added

---

### 🆕 Scenario 7 — House Blend Trial (Converting) — dev-hosted-converting

**Plain desc:** Customer clicked Subscribe, Stripe payment is processing. Plan activation in flight.
**Expected:** Full-screen or overlay modal with spinner + animated status, auto-closes on provisioned.

**Feature: Conversion status modal — P15**

- Auto-open when `plan.state.status === "CONVERTING"` on plans page load
- Spinner + two-phase animated text:
  - Phase 1: "Processing payment..." (dot dot dot animation)
  - Phase 2: "Brewing House Blend..." (dot dot dot) — when payment confirmed, plan activating
- Poll `/api/plans/resolved` every ~5s during CONVERTING; close modal + refresh plans when status changes to CONVERTED (or show error if DEPROVISIONED/EXPIRED)
- Store-side: new `ConversionModal` component, triggered by `state.status === "CONVERTING"` in `PlanPageClient`
- Platform-side: no changes needed — resolver already returns CONVERTING state correctly

---

### 🔴 Scenario 8 — House Blend Trial (Expired, no card) — dev-hosted-expired

**Plain desc:** Customer's 14-day trial ended without ever adding a billing card. The only path forward is to add billing (extend to 30 days); they cannot subscribe directly without a card on file.
**Expected:** House Blend Trial (EXPIRED) + House Blend (NONE). No Community Roast.
**Design clarification:** EXPIRED = 14-day no-card expiry only. A 30-day card trial hits deprovision directly — there is no "expired after 30 days" state to render.

**Findings:**

- Community Roast showing — P5
- EXPIRED CTA should be "Add Billing" (extendLinkUrl, iconBefore credit-card, iconAfter external-link, primary) — not "Subscribe Now" — P16
- Status desc wrong — should be "Your 14 day trial ended. Add billing to extend up to 30 days." — P17
- Plan benefits should still show on EXPIRED card — P18
- "Cancel Trial" ghost CTA should NOT appear on EXPIRED — (current resolver already omits it ✅)
- Ghost CTA "Delete Trial" should appear on EXPIRED — lets user deprovision immediately — P19
- House Blend NONE missing Subscribe CTA — P4

---

### 🔴 Scenario 9 — House Blend Trial (Cancelled, no card) — dev-hosted-cancelled

**Plain desc:** Customer cancelled the trial before adding a billing card. No-card cancellation = immediate deactivation — no countdown, no grace period.
**Design clarification:** The CANCELLED deprovision countdown only applies when `cardAdded === true` (customer paid to extend to 30 days, then cancelled — they still have paid days remaining). No-card cancelled is a no-op: instance is deactivated immediately, nothing to render.

**Findings:**

- Current renderer shows "Cancelled" badge + "Store will be removed on June 7, 2026" countdown — wrong for no-card state — P20
- Resolver should branch on `hostedTrial.cardAdded`: if `!cardAdded` and `CANCELLED` → return null (same as DEPROVISIONED); if `cardAdded` → CANCELLED state with countdown — P20
- Community Roast showing — P5

---

### 🔴 Scenario 10 — House Blend (Converted, active subscription) — dev-hosted-converted

**Plain desc:** Customer subscribed during or after trial. House Blend is now an active paid subscription.
**Expected:** House Blend ACTIVE card (no trial card). No Community Roast.

**Findings:**

- Community Roast showing — P5
- Pricing ($69/mo, $79, "6mos Launch Special") shown on ACTIVE card — should only appear on NONE/INACTIVE — P21
- "Manage Billing" is inside the 3-dot menu — should be an inline button in the bottom row — P1 (already logged)

---

### ✅ Scenario 11 — House Blend Trial (Deprovisioned) — dev-hosted-deprovisioned

**Plain desc:** Trial fully deprovisioned — store is gone. Nothing should render for hosted plans.
**Expected:** No hosted plan cards at all.

**Findings:**

- Community Roast showing — P5 (self-hosted plan leaking through)
- House Blend NONE showing — house-blend resolver returns NONE for non-CONVERTED states including DEPROVISIONED; should return null — P3/P9 (already logged)
- house-blend-trial correctly returns null for DEPROVISIONED ✅

---

### ⬜ Scenario 12 — House Blend Trial (Cancelled, card on file) — NOT YET SEEDED

**Plain desc:** Customer added a billing card (extended to 30 days), then cancelled. They still have paid days remaining — the instance stays live until trialEndsAt, then deprovisions.
**Expected:** House Blend Trial CANCELLED card with deprovision countdown (daysRemaining).
**Status:** No dev scenario key exists for this state yet. Needs a new seed entry in the platform DB with `status: CANCELLED` and `cardAdded: true`.

**Findings:**

- [ ] TBD — seed first

---

### ⬜ Scenario 13 — House Blend Trial (Payment Failed) — NOT YET DESIGNED

**Plain desc:** Customer clicked Subscribe, Stripe attempted to charge, payment failed (card declined, etc.). What does the customer see?
**Status:** Not a backend state accounted for yet. Needs design + a new `PAYMENT_FAILED` status (or equivalent) on `HostedTrial`, plus a resolver branch and store UI.

**Findings:**

- [ ] TBD — design first

---

### 🔴 Scenario 14 — Priority Support (Inactive) — dev-pro-inactive

**Plain desc:** Self-hosted customer whose Priority Support subscription lapsed. Shows INACTIVE card: "Ended on {date}", price with sale, benefits, "Renew" CTA.

**Findings:**

- Resolver returns NONE (Subscribe CTA) — `ctx.tier === "FREE"` falls through to NONE branch; no INACTIVE detection — P22
- `licenseKey.planSlug` and `licenseKey.deactivatedAt` are not in `ResolveCtx` — resolver has no signal to emit INACTIVE — P22
- Expected: INACTIVE badge, "Ended on {deactivatedAt formatted}", price block, inactiveItems benefits, "Renew" CTA

---

### 🔴 Scenario 15 — House Blend (Inactive, post-conversion lapsed) — dev-hosted-inactive

**Plain desc:** HOSTED customer whose House Blend subscription lapsed after converting. Data: `hostedTrial.status === "CANCELLED"`, `cardAdded: true`, `convertedAt` set, `trialEndsAt` in the past.

**Findings:**

- Resolver shows NONE or CANCELLED countdown — no INACTIVE branch in `house-blend` resolver — P23
- Expected: INACTIVE badge, "Ended on {trialEndsAt formatted}", price block, `inactiveItems` benefits, "Renew" CTA
- Detection signal: `hostedTrial.status === "CANCELLED" && hostedTrial.convertedAt !== null && hostedTrial.trialEndsAt <= now`

---

## Pending Changes (logged, not yet implemented)

| # | Scenario | File | Change needed |
|---|----------|------|---------------|
| P1 | PRO | `PlanPageClient.tsx` | **Revert `ActiveCard` layout to original.** 3-dot belongs at header next to badge, containing pool CTAs only. Management actions (Manage Billing) belong as inline buttons in the bottom row — never in the 3-dot. My layout redesign put them in the wrong places. Original code's gate (`poolCtaActions.length > 0`) is now correct since `one-on-one` pool has a `.cta`. Just restore the header 3-dot + bottom inline management buttons. |
| P2 | PRO | `route.ts` + `PlanPageClient.tsx` | **Book Session CTA icon.** Use `iconBefore: pool.icon` (the calendar icon) on the `book-session` CTA instead of `iconAfter: "external-link"`. Also add `iconBefore` rendering support to the pool CTA button in `PlanPageClient.tsx` (currently only `iconAfter` is handled in that render path). |
| P3 | S3–S4 | `route.ts` | **`house-blend` hidden for early statuses.** Resolver should return null for PENDING_VERIFICATION, PROVISIONING, and DEPROVISIONED — same null conditions as `house-blend-trial`. House Blend should only render when trial is in ACTIVE, CONVERTING, EXPIRED, CANCELLED, or CONVERTED. |
| P5 | S3–S11 (HOSTED) | `route.ts` | **Community Roast shown for HOSTED customers.** `free` resolver has no tier check. Plans with `visibility: "self-hosted"` should be excluded for HOSTED customers — add a post-filter in the route handler (or a tier guard in the `free` resolver returning null when `ctx.tier === "HOSTED"`). |
| P4 | S5+ | `route.ts` | **"Add Billing" CTA missing from House Blend Trial card.** `extendLinkUrl` is null (no Stripe extend link seeded). Also affects "Subscribe Now" on House Blend NONE — same root cause: dev scenario has no Stripe payment links seeded. Constant across all HOSTED scenarios. |
| P10 | S5+ | `route.ts` | **"Add Card to Extend" CTA needs credit-card icon before label.** Add `iconBefore: "credit-card"` to the `add-card` action in the `house-blend-trial` resolver. |
| P11 | S6 | `route.ts` | **Badge text wrong when card on file.** `house-blend-trial` resolver emits `badge: "Trial (Card Added)"`. Should be `"Trial Extended"` when `hostedTrial.cardAdded === true`. |
| P6 | S5+ (TRIAL) | `route.ts` | **Trial pool missing — shows 0/0 days.** `house-blend-trial` resolver emits `pools: []`. Add a `trial-days` UsagePool: `{ slug: "trial-days", label: "Trial days remaining", limit: 14, used: daysElapsed, countLabel: "days" }`. Compute remaining from `trialEndsAt - now`; total = 14. |
| P7 | S5+ (TRIAL) | `route.ts` | **Trial end date shown as raw ISO string.** `statusInfo.descText` uses `trialEndsAt.toISOString()`. Format as readable date e.g. "Trial ends May 22, 2026". |
| P8 | S5+ | DB | **House Blend benefits copy wrong.** Remove "Everything in Community Roast"; review "5 priority support tickets/month, 48-hr SLA" wording. DB update to `house-blend` plan's `details.benefits.activeItems`. |
| P9 | S3–S11 (HOSTED) | `route.ts` | **`house-blend` hidden for early statuses.** Resolver should return null for PENDING_VERIFICATION, PROVISIONING, and DEPROVISIONED — same null conditions as `house-blend-trial`. |
| P12 | S5 | `route.ts` | **Badge text "Trial Active"** (not "Trial") when no card on file and trial is ACTIVE. |
| P13 | S5 | `route.ts` | **CTA label "Add Billing"** (same as P10 — confirm label rename applies to both ACTIVE and EXPIRED states). |
| P14 | S5 | `route.ts` | **Remove "Subscribe Now" secondary CTA** from no-card ACTIVE state — only "Add Billing" primary should show. |
| P16 | S8 | `route.ts` | **EXPIRED state CTA — "Add Billing" not "Subscribe Now".** Use `extendLinkUrl` (not `subscribeLinkUrl`), `iconBefore: "credit-card"`, `iconAfter: "external-link"`, `variant: "primary"`, `label: "Add Billing"`. Design rationale: 14-day expired means no card — the only path is adding billing to extend; direct subscribe without card is not the flow. |
| P17 | S8 | `route.ts` | **EXPIRED status desc.** Change from "Your trial has ended. Subscribe to restore access." → "Your 14 day trial ended. Add billing to extend up to 30 days." |
| P18 | S8 | `PlanPageClient.tsx` | **Plan benefits visible on EXPIRED card.** Currently `pools: []` on EXPIRED state. `ExpiredCard` (or generic EXPIRED renderer) should render `plan.details.benefits.activeItems` below the status info, same as TRIAL card. |
| P19 | S8 | `route.ts` | **Ghost CTA "Delete Trial" on EXPIRED.** Add `{ slug: "delete-trial", label: "Delete Trial", endpoint: "/api/trial/delete", variant: "ghost" }` to EXPIRED state actions. This lets the user immediately deprovision rather than waiting for the auto-deprovision window. Pair with a confirm modal (new `delete-trial` entry in `actionModals`). |
| P20 | S9 | `route.ts` | **No-card CANCELLED = no-op, return null.** Resolver currently always returns CANCELLED state with countdown. Branch on `hostedTrial.cardAdded`: if `!cardAdded` → return null (immediate deprovision, nothing to render); if `cardAdded` → CANCELLED state with `daysRemaining` countdown (customer has paid days remaining). |
| P21 | S10 | `PlanPageClient.tsx` | **Pricing must not show on ACTIVE card.** Price block (sale price, regular price, sale label) is only for NONE and INACTIVE states. Remove from `ActiveCard` renderer. |
| P23 | S15 | `route.ts` | **INACTIVE branch for `house-blend` resolver.** Add branch: if `hostedTrial.status === "CANCELLED" && hostedTrial.convertedAt !== null && hostedTrial.trialEndsAt <= now` → return INACTIVE state with `badge: "Inactive"`, `badgeIcon: "circle-slash"`, `deactivatedAt: hostedTrial.trialEndsAt.toISOString()`, price block, `inactiveItems` benefits, and "Renew" CTA using `subscribeLinkUrl`. |
| P22 | S14 | `route.ts` | **INACTIVE branch for `priority-support` resolver.** (1) Add `planSlug: licenseKey.planSlug \| null` and `licenseDeactivatedAt: licenseKey.deactivatedAt \| null` to `ResolveCtx`. (2) Populate from `licenseKey` in the route handler. (3) Add resolver branch: if `ctx.planSlug === "priority-support" && ctx.licenseDeactivatedAt` → return INACTIVE state with `badge: "Inactive"`, `badgeIcon: "circle-slash"`, `deactivatedAt: ctx.licenseDeactivatedAt.toISOString()`, price block, `inactiveItems` benefits, and `{ slug: "renew", label: "Renew", url: checkoutUrl, variant: "primary", iconAfter: "external-link" }` action. |

---

## Completed Changes

| # | Scenario | File | Change |
|---|----------|------|--------|
| 1 | FREE | `route.ts` | Added "Free" price + "Forever" sale label + "View Terms" action to `free` resolver |
| 2 | FREE | `PlanPageClient.tsx` | Added price block to `ActiveCard` (shows Free / sale price / regular price) |
| 3 | PRO | `PlanPageClient.tsx` | Removed `text-muted-foreground` from `PoolBar` count span |
| 4 | PRO | `PlanPageClient.tsx` | Redesigned `ActiveCard` bottom row: ghost + pool CTAs inline left, 3-dot for management right |
| 5 | PRO | `route.ts` | Added `book-session` CTA to `one-on-one` pool in PRO branch of `priority-support` resolver |
