# provider-plan-sdk-alignment

Three sequential sessions deleting the local `lib/plan-types.ts` and rewriting the plan card renderer to consume the `artisan-roast-sdk` `HydratedPlan` contract.

## Dependency order

```
Session 1 — SDK repo: Priority Support scaffolds + slug fix (v0.3.2)
  ↓
Session 2 — ecomm: sdk-type-alignment (install SDK, delete plan-types.ts, fix consumers)
  ↓
Session 3 — ecomm: provider-driven-plan-cards (PlanPageClient rewrite, dispatch on state.status)
```

## Session 1 — SDK: Priority Support scaffolds

**Repo:** `artisan-roast-sdk` | **Branch:** `feat/priority-support-scaffolds` | **Produces:** v0.3.2

**File: `src/plans/scaffolds.ts`**

1. Fix `SELF_HOSTED_FREE`: `slug: "community"` → `slug: "free"`
2. Add `PRIORITY_SUPPORT_NONE` — NONE state, subscribe action with `iconAfter: "external-link"`
3. Add `PRIORITY_SUPPORT_ACTIVE` — ACTIVE state, pools with `cta` (Submit Ticket, Book Session), manage-billing + cancel in state.actions
4. Add `PRIORITY_SUPPORT_INACTIVE` — INACTIVE state, inactiveItems, renew action
5. Add `SELF_HOSTED_FREE_WITH_ADDONS` — Community + residual pool credits

Use `mcp__artisan-roast-sdk__scaffold_plan_state` to generate initial shapes; use `mcp__artisan-roast-sdk__validate_plan_payload` to verify each before committing.

**ACs:** `session-1/ACs.md` (tracked in SDK repo; copy here for cross-repo reference)

---

## Session 2 — Store: sdk-type-alignment

**Repo:** `ecomm-ai-app` | **Branch:** `feat/sdk-type-alignment` | **ACs:** `session-2/ACs.md`

**Goal:** Delete `lib/plan-types.ts`. Import all types from SDK. No UI changes.

### Files changed

| File | Change |
|------|--------|
| `package.json` | Add `"artisan-roast-sdk": "file:../artisan-roast-sdk"` |
| `lib/plan-types.ts` | **Delete** |
| `lib/plans.ts` | SDK import, generic filter, MOCK_HYDRATED_PLANS, null→"self-hosted" normalize |
| `lib/__tests__/plans.test.ts` | SDK types in fixtures |
| `app/admin/support/plans/PlanPageClient.tsx` | Compat: SDK imports, benefits.activeItems, actionModals?.find(...) |
| `app/admin/support/plans/page.tsx` | SDK Plan import |
| `app/admin/support/plans/[slug]/PlanDetailClient.tsx` | benefits?.activeItems |
| `app/admin/support/plans/_components/ConfirmActionDialog.tsx` | SDK ConfirmActionConfig import |

### Key invariants

- `filterPlansByVisibility` → generic `<T extends Plan>` to preserve type on HydratedPlan[]
- `fetchPlans()` normalizes `visibility: null` → `"self-hosted"` before caching (SDK type is non-nullable)
- `MOCK_HYDRATED_PLANS` exported, built from SDK SCENARIOS

---

## Session 3 — Store: provider-driven-plan-cards

**Repo:** `ecomm-ai-app` | **Branch:** `feat/provider-driven-plan-cards` | **ACs:** `session-3/ACs.md`

**Goal:** Rewrite `PlanPageClient` to dispatch on `plan.state.status`. No slug checks.

### CTA layout (from product.md spec 2026-05-06)

- `pool.cta` — always inline at bottom CTA row left; never in 3-dot
- `state.actions` on ACTIVE — 3-dot overflow menu right
- `state.actions` on all other states — inline buttons

### Cards per status

| Status | Card behavior |
|--------|--------------|
| NONE | price display + benefits + bottom CTA from state.actions inline |
| ACTIVE | badge + usage bars + pool.cta inline left + state.actions 3-dot right |
| TRIAL | badge + ProgressBar + statusInfo.descText + benefits + state.actions inline |
| EXPIRED | same as TRIAL; statusInfo shown prominently |
| CANCELLED | deprovision countdown from state.deprovisionAt; state.actions inline |
| INACTIVE | "Ended on {deactivatedAt}" subtitle; price+sale; inactiveItems list; state.actions inline |

### Shim

`hydrateFromLicense(plans: Plan[], license: LicenseInfo): HydratedPlan[]` in page.tsx — temporary bridge until Platform Session 2 live endpoint. Marked `// TODO: remove in Session C`.

### Screenshots

All 6 scenarios verified in `.screenshots/provider-plan-sdk-alignment-session3/`.

---

## Verification registration

`.claude/verification-status.json`:
- `feat/sdk-type-alignment` → `{ status: "planned", acs_total: 9 }`
- `feat/provider-driven-plan-cards` → `{ status: "planned", acs_total: 12 }`

## Commit schedule (Session 2)

1. `feat(sdk-align): install artisan-roast-sdk file dep`
2. `feat(sdk-align): delete plan-types.ts + fix all consumers for SDK types`
3. `feat(sdk-align): add MOCK_HYDRATED_PLANS from SDK scaffolds`
4. `bump version to X.Y.Z`

## Commit schedule (Session 3)

1. `feat(plan-cards): rewrite PlanPageClient to dispatch on plan.state.status`
2. `feat(plan-cards): wire page.tsx to pass HydratedPlan[] with local hydration shim`
3. `test(plan-cards): update plan page tests for HydratedPlan props`
4. `bump version to X.Y.Z`
