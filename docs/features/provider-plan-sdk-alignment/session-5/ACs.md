# Session 5 — Acceptance Criteria

**Branch:** `feat/plan-scenario-corrections` (store) / `feat/plan-resolver-corrections` (platform)  
**Feature:** `docs/features/provider-plan-sdk-alignment/plan.md`

---

## How the page is driven

The plan page is 100% resolver-driven. `fetchResolvedPlans()` in `lib/plans.ts` calls `${PLATFORM_URL}/api/plans/resolved` with the LICENSE_KEY bearer token and returns `HydratedPlan[]`. `page.tsx` passes this directly to `PlanPageClient` — no hardcoding, no mock data in the store.

**Verification screenshots** use live platform data via dev-scenario license keys. No mock data.  
**Known non-parity:** P8 DB update (remove "Everything in Community Roast" from house-blend benefits) is a prerequisite — if not yet applied, that item will appear in HO screenshots.

---

## Platform DB changes (applied before verification)

These DB changes affect resolver output and must be applied before running UI ACs:

| Change | What |
|--------|------|
| All plan active badges | `badgeIcon = "CircleCheckBig"` on all ACTIVE state badges |
| Priority Support | `details.benefits.inactiveHeader = "Get back"` |
| Trial badges | No "Trial" prefix — resolver returns "Active", "Extended", "Expired" (see FN-7) |
| Community plan | NONE state for PRO tier — resolver returns NONE instead of ACTIVE |
| P8 | Remove "Everything in Community Roast" from house-blend `details.benefits.activeItems` |

---

## Plan Card UI Schematic

All possible elements on a single plan card. Labels [A]–[L] referenced in ACs below.

```text
┌──────────────────────────────────────────────────────────────┐
│ HEADER                                                        │
│  [A] Plan Name            [B] (◉) Badge text      [C] ⋮     │
│  [D] Subtitle                                                 │
├──────────────────────────────────────────────────────────────┤
│ BODY                                                          │
│                                                               │
│  [E] PRICING ─────────────────────────────────────────────   │
│      [E1] Sale label                                          │
│      [E2] $XX [E4] /mo   ~~[E3] $YY~~ (regular, no /mo)     │
│                                                               │
│  [F] POOL BAR  (repeats once per pool; any state) ────────── │
│      [F1]○ [F2] Pool Label          [F3] N/M [F4] unit       │
│      ████████████░░░░░░░░  (fill = used / limit)             │
│      [F5] textDesc  (optional — plain text below bar)        │
│                                                               │
│      Pool examples:                                           │
│        slug="tickets"    → Priority Tickets bar               │
│        slug="one-on-one" → 1:1 Sessions bar                  │
│        slug="trial-days" → Trial Days bar (icon: calendar)   │
│                                                               │
│  [H] STATE INFO ───────────────────────────────────────────  │
│      state.statusInfo.descText  (amber on EXPIRED)           │
│      CANCELLED: also shows days remaining as second line     │
│                                                               │
│  [I] BENEFITS LIST ─────────────────────────────────────── │
│      [I0] Header (optional — activeHeader / inactiveHeader)  │
│      ✓ item 1   ✓ item 2   ✓ item 3                          │
│      (activeItems on NONE/TRIAL/EXPIRED;                     │
│       inactiveItems on INACTIVE, fallback to activeItems)    │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ FOOTER / CTA ROW                                              │
│  [K] (◉) Ghost text (◉)        [L] (◉) Label text (◉)       │
└──────────────────────────────────────────────────────────────┘

[B] Badge: optional icon (◉) before badge text — from state.badgeIcon.
    CircleCheckBig on ACTIVE; circle-slash on INACTIVE; clock on TRIAL; alert-circle on EXPIRED.

[C] 3-dot dropdown — ACTIVE state only, when pool.cta actions exist:
  ┌───────────────────────────────────┐
  │ [C1] (◉)  CTA label  (◉)         │  ← pool.cta items (iconBefore + label + iconAfter)
  │ [C2] (◉)  CTA label  (◉)         │
  └───────────────────────────────────┘

[K]/[L] CTAs have optional iconBefore (◉) and iconAfter (◉) on either side of the label.
    credit-card iconBefore on "Add Billing"; external-link iconAfter on all external links.
```

### Element presence by state

Pool bars [F] appear in any state where the resolver includes `state.pools[]`.  
`textDesc` [F5] optional on any pool in any state.  
Benefits header [I0] optional — shown when `activeHeader` / `inactiveHeader` is set on the plan.

| Element | NONE | ACTIVE | TRIAL | EXPIRED | CANCELLED | INACTIVE |
|---------|:----:|:------:|:-----:|:-------:|:---------:|:--------:|
| A — plan name | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| B — status badge | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| C — 3-dot header (pool CTAs) | — | ✓* | — | — | — | — |
| D — subtitle | description | description | description | description | — | "Ended on…" |
| E — pricing block | ✓ | — | — | — | — | ✓ |
| F — pool bar(s) | — | ✓ | ✓ | ✓ | — | — |
| H — state info text | — | — | ✓ | ✓ | ✓ | — |
| I — benefits (+ optional I0 header) | ✓ | — | ✓ | ✓ | — | ✓ |
| K — ghost CTA | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| L — primary/secondary CTA | ✓ | ✓ | ✓ | ✓ | — | ✓ |

*C only present when pools contain at least one `.cta`

---

## Scenario → Resolver → Cards

`null` = resolver excludes this plan. Card count = non-null resolvers.

| Dev key | Tier / Trial | `free` | `priority-support` | `house-blend-trial` | `house-blend` | Cards |
|---------|-------------|--------|-------------------|---------------------|---------------|:-----:|
| `dev-free` | FREE | ACTIVE | NONE | null | null | 2 |
| `dev-pro` | PRO | NONE | ACTIVE | null | null | 2 |
| `dev-pro-inactive` | FREE + lapsed PRO | ACTIVE | INACTIVE | null | null | 2 |
| `dev-hosted-active-no-card` | HOSTED / ACTIVE no card | null | null | TRIAL | NONE | 2 |
| `dev-hosted-active-card` | HOSTED / ACTIVE card | null | null | TRIAL | NONE | 2 |
| `dev-hosted-converting` | HOSTED / CONVERTING | null | null | CONVERTING | NONE | 2 |
| `dev-hosted-expired` | HOSTED / EXPIRED | null | null | EXPIRED | NONE | 2 |
| `dev-hosted-cancelled` | HOSTED / CANCELLED no card | null | null | null | null | 0 |
| `dev-hosted-converted` | HOSTED / CONVERTED | null | null | null | ACTIVE | 1 |
| `dev-hosted-cancelled-card` | HOSTED / CANCELLED card | null | null | CANCELLED | null | 1 |
| `dev-hosted-inactive` | HOSTED / INACTIVE | null | null | null | INACTIVE | 1 |
| `dev-hosted-pending` | HOSTED / PENDING_VERIFICATION | null | null | null | null | 0 |
| `dev-hosted-provisioning` | HOSTED / PROVISIONING | null | null | null | null | 0 |
| `dev-hosted-deprovisioned` | HOSTED / DEPROVISIONED | null | null | null | null | 0 |

---

## Acceptance Criteria

> **Verification:** Screenshot at desktop viewport — set `LICENSE_KEY` in `.env.local` to the scenario dev key and reload.  
> **Pass column** references schematic labels. State what is present; absence is implied by the element presence table.

---

### Self-Hosted Plan Group

Plans on page: **Community Roast** (`free`) + **Priority Support** (`priority-support`)

| AC | Scenario | Dev key | Cards | Pass | Agent | QC | Reviewer |
|----|----------|---------|:-----:|------|-------|----|----------|
| AC-UI-SH-1 | S1 — FREE | `dev-free` | 2 | **Card 1 · Community / ACTIVE:** A="Community Roast", B=CircleCheckBig+"Current Plan", D=plan description, K="View Terms". **Card 2 · Priority Support / NONE:** A="Priority Support", D=plan description, E1="1st 6mos Launch Special", E2=$39/mo (not crossed), E3=$49 crossed (no /mo), I=activeItems list, K="View Details" ghost, L="Subscribe"+external-link iconAfter | | | |
| AC-UI-SH-2 | S2 — PRO | `dev-pro` | 2 | **Card 1 · Community / NONE:** A="Community Roast", D=plan description, I=activeItems list, K="View Terms". **Card 2 · Priority Support / ACTIVE:** A="Priority Support", B=CircleCheckBig+"Active", C=3-dot in header; click to confirm C1="Submit Ticket"+external-link iconAfter, C2=calendar iconBefore+"Book Session"+external-link iconAfter; D=plan description, F×2: F[tickets] "Priority Tickets" F3=0/5 F4="tickets", F[one-on-one] "1:1 Sessions" F3=0/1 F4="sessions", K="View Details", L="Manage Billing"+external-link iconAfter | | | |
| AC-UI-SH-3 | S14 — PRO Inactive | `dev-pro-inactive` | 2 | **Card 1 · Community / ACTIVE:** same as SH-1 Card 1. **Card 2 · Priority Support / INACTIVE:** A="Priority Support", B=circle-slash+"Inactive", D="Ended on {Month D, YYYY}", E1="1st 6mos Launch Special", E2=$39/mo (not crossed), E3=$49 crossed (no /mo), I0="Get back", I=inactiveItems (fallback: activeItems), K="View Details" ghost, L="Renew"+external-link iconAfter | | | |

> **SH-2 note:** Pool usage counts (0/5, 0/1) reflect a fresh dev seed with no prior activity. Actual counts may differ if the scenario DB has been used.

---

### Hosted Plan Group

Plans on page: **House Blend Trial** (`house-blend-trial`) + **House Blend** (`house-blend`)

| AC | Scenario | Dev key | Cards | Pass | Agent | QC | Reviewer |
|----|----------|---------|:-----:|------|-------|----|----------|
| AC-UI-HO-1 | S5 — TRIAL, no card | `dev-hosted-active-no-card` | 2 | **Card 1 · HB Trial / TRIAL:** A="House Blend Trial", B=clock+"Active", D=plan description, F[trial-days]: F1=calendar icon, F2="Trial Days", F3=N/14, F4="days used"; H="Trial ends {Month D, YYYY}" (formatted, not ISO); I=activeItems; K="Cancel Trial" ghost; L=credit-card icon+"Add Billing"+external-link icon. **Card 2 · House Blend / NONE:** A="House Blend", D=plan description, E1=sale label, E2=sale price/mo (not crossed), E3=regular price crossed (no /mo); I=activeItems; K="View Details" ghost; L="Subscribe Now"+external-link iconAfter | | | |
| AC-UI-HO-2 | S6 — TRIAL, card added | `dev-hosted-active-card` | 2 | **Card 1 · HB Trial / TRIAL:** A="House Blend Trial", B=clock+"Extended", D=plan description, F[trial-days]: F1=calendar icon, F2="Trial Days", F3=N/30, F4="days used"; H="Trial ends {Month D, YYYY}"; I=activeItems; K="Cancel Trial" ghost; L="Subscribe Now"+external-link iconAfter. **Card 2 · House Blend / NONE:** same as HO-1 Card 2 | | | |
| AC-UI-HO-3 | S8 — EXPIRED | `dev-hosted-expired` | 2 | **Card 1 · HB Trial / EXPIRED:** A="House Blend Trial", B=alert-circle+"Expired", D=plan description, F[trial-days]: F1=calendar icon, F2="Trial Days", F3=14/14 (bar fully filled), F4="days used"; H="Your 14 day trial ended. Add billing to extend up to 30 days." (amber); I=activeItems below H; K="Delete Trial" ghost; L=credit-card icon+"Add Billing"+external-link icon. **Card 2 · House Blend / NONE:** same as HO-1 Card 2 | | | |
| AC-UI-HO-4 | S10 — CONVERTED | `dev-hosted-converted` | 1 | **Card · House Blend / ACTIVE:** A="House Blend", B=CircleCheckBig+"Active", C=3-dot in header if pools have cta, D=plan description, F=pool bar(s) from state.pools (F2=label, F3=N/M, F4=countLabel); K="View Details" ghost; L="Manage Billing"+external-link iconAfter | | | |
| AC-UI-HO-5 | S12 — CANCELLED, card on file | `dev-hosted-cancelled-card` | 1 | **Card · HB Trial / CANCELLED:** A="House Blend Trial", B="Cancelled", H="Store will be removed on {Month D, YYYY}" (two lines: removal date + N days remaining) | | | |
| AC-UI-HO-6 | S15 — HOSTED Inactive | `dev-hosted-inactive` | 1 | **Card · House Blend / INACTIVE:** A="House Blend", B=circle-slash+"Inactive", D="Ended on {Month D, YYYY}", E1=sale label, E2=sale price/mo (not crossed), E3=regular price crossed (no /mo); I0="Get back" (from inactiveHeader); I=inactiveItems (or activeItems fallback); K="View Details" ghost; L="Subscribe Now"+external-link iconAfter | | | |

> **Future session:** S7 (CONVERTING / `dev-hosted-converting`) — ConversionModal + CONVERTING resolver state. Not covered in this session.

---

### Functional ACs

| AC | Scope | What | How | Pass | Agent | QC | Reviewer |
|----|-------|------|-----|------|-------|----|----------|
| AC-FN-1 | Platform | `free` resolver tier guards | Code review: `route.ts` free resolver | HOSTED → null (first guard); PRO → NONE state; FREE → ACTIVE state | | | |
| AC-FN-2 | Platform | CANCELLED no-card → null (house-blend-trial) | Code review: `route.ts` house-blend-trial CANCELLED branch | `if (!hostedTrial.cardAdded) return null` before countdown logic | | | |
| AC-FN-3 | Platform | house-blend: null for non-INACTIVE CANCELLED | Code review: `route.ts` house-blend resolver | After INACTIVE branch, any remaining CANCELLED status returns null (before NONE branch) | | | |
| AC-FN-4 | Platform | house-blend INACTIVE branch | Code review: `route.ts` house-blend resolver | INACTIVE fires on `CANCELLED && convertedAt !== null && trialEndsAt <= now` | | | |
| AC-FN-5 | Platform | priority-support INACTIVE + ResolveCtx | Code review: `route.ts` — `ResolveCtx` + priority-support resolver | `ResolveCtx` has `planSlug` + `licenseDeactivatedAt`; INACTIVE fires when `planSlug === "priority-support" && licenseDeactivatedAt` | | | |
| AC-FN-6 | Platform | priority-support pool CTAs | Code review: `route.ts` priority-support PRO branch | tickets pool has `cta: { slug: "submit-ticket", label: "Submit Ticket", iconAfter: "external-link" }`; one-on-one pool has `cta: { slug: "book-session", label: "Book Session", iconBefore: "calendar", iconAfter: "external-link" }` | | | |
| AC-FN-7 | Platform | trial-days pool for ACTIVE/TRIAL/EXPIRED | Code review: `route.ts` house-blend-trial ACTIVE/TRIAL/EXPIRED branches | All three branches include `{ slug: "trial-days", icon: "calendar", countLabel: "days used", limit: 14 or 30, used: <computed> }` in pools | | | |
| AC-FN-8 | Platform | house-blend: null for provisioning states | Code review: `route.ts` house-blend resolver | Returns null for `PENDING_VERIFICATION`, `PROVISIONING`, `DEPROVISIONED` | | | |
| AC-FN-9 | Platform | CONVERTING resolver emits "CONVERTING" | Code review: `route.ts` house-blend-trial | Separate branch for `trialStatus === "CONVERTING"` returns `status: "CONVERTING"` — **AC-UI coverage deferred to future session** | | | |
| AC-FN-10 | Store | Benefits header rendered when present | Code review: `PlanPageClient.tsx` | `activeHeader` rendered above list items when `plan.details.benefits.activeHeader` is set (NONE/TRIAL/EXPIRED cards); `inactiveHeader` rendered in InactiveCard | | | |
| AC-FN-11 | Store | Demo guard on external URL actions | Code review: `PlanPageClient.tsx` `handleAction` | When `IS_DEMO`, external URL branch (`!action.url.startsWith("/")`) calls `handleSubscribe(plan.slug)` instead of `window.open` — routes through `startCheckout` demo bypass (`?demo=success` redirect + toast) | | | |

---

### Regression ACs

| AC | Scope | What | How | Pass | Agent | QC | Reviewer |
|----|-------|------|-----|------|-------|----|----------|
| AC-REG-1 | Platform | TypeScript clean | `npm run typecheck` in `artisan-roast-platform` | 0 errors | | | |
| AC-REG-2 | Store | TypeScript clean | `npm run typecheck` in `ecomm-ai-app` | 0 errors | | | |
| AC-REG-3 | Store | Tests pass | `npm run test:ci` in `ecomm-ai-app` | All pass | | | |
| AC-REG-4 | Store | Precheck passes | `npm run precheck` in `ecomm-ai-app` | 0 errors | | | |

---

## SDK prerequisite

`UsagePool.textDesc` is **not currently in the SDK type definition**. Must be added as `textDesc?: string` before pool textDesc can be rendered. This is a blocking SDK change — tracked for the next SDK session.

---

## Future sessions

| Item | Notes |
|------|-------|
| S7 CONVERTING UI | ConversionModal non-dismissable overlay; requires CONVERTING resolver state (AC-FN-9 covers resolver side) |
| ConversionModal component | `_components/ConversionModal.tsx` — polls on `router.refresh()` every 5s, closes when no plan has `status === "CONVERTING"` |

---

**Total: 24 ACs** — 9 UI (3 self-hosted · 6 hosted) · 11 FN · 4 REG + 1 SDK prerequisite
