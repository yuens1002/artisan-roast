# Session 4 — plan-card-corrections: ACs

**Branch:** `feat/plan-card-corrections`
**Prerequisite:** SDK `feat/usagepool-extension` (v0.3.3) merged + dep bumped in store

---

## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-1 | Pool icons render on PRIORITY_SUPPORT_ACTIVE | Screenshot: `PRIORITY_SUPPORT_ACTIVE` scenario | Icons visible before "Priority Tickets" and "1:1 Sessions" pool labels | | | |
| AC-UI-2 | Pool count renders with unit label | Screenshot: `PRIORITY_SUPPORT_ACTIVE` scenario | Count displays as `{used} / {limit} {countLabel}` (e.g. "2 / 5 used") | | | |
| AC-UI-3 | Trial pools render on TRIAL_ACTIVE_NO_CARD | Screenshot: `TRIAL_ACTIVE_NO_CARD` scenario | Trial-days pool visible with icon, label "Trial remaining", count (e.g. "5 / 14 days") | | | |
| AC-UI-4 | Trial pools render on TRIAL_EXPIRED | Screenshot: `TRIAL_EXPIRED` scenario | Trial-days pool with filled bar; `statusInfo.descText` above bar | | | |
| AC-UI-5 | TRIAL_EXPIRED: 2-CTA left/right layout | Screenshot: `TRIAL_EXPIRED` scenario | End Trial (ghost) left · Extend Trial (primary) right; no overflow menu | | | |
| AC-UI-6 | TRIAL_ACTIVE_CARD_ADDED: cancel-trial visible | Screenshot: `TRIAL_ACTIVE_CARD_ADDED` scenario | Cancel action visible; no add-billing action | | | |
| AC-UI-7 | CONVERTED billing action visible | Screenshot: `CONVERTED` scenario | At least one billing management action rendered | | | |
| AC-UI-8 | Community description corrected | Screenshot: `SELF_HOSTED_FREE` scenario | "Self hosted with community support" visible | | | |
| AC-UI-9 | SELF_HOSTED_FREE_WITH_ADDONS pool icons | Screenshot: `SELF_HOSTED_FREE_WITH_ADDONS` scenario | Icons visible on both pools | | | |

---

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-FN-1 | No `ProgressBar` renderer in PlanPageClient | Code review: `app/admin/support/plans/PlanPageClient.tsx` | No `ProgressBar` component or `progress:` binding — trial/expired pools use pool renderer | | | |
| AC-FN-2 | CTA layout rule: 1 CTA inline | Code review: `app/admin/support/plans/PlanPageClient.tsx` | Single-action states render one inline `<Button>` with no menu | | | |
| AC-FN-3 | CTA layout rule: 2 CTAs left/right | Code review: `app/admin/support/plans/PlanPageClient.tsx` | Two-action states render secondary/ghost left + primary right in a flex row | | | |
| AC-FN-4 | CTA layout rule: 3+ CTAs in menu | Code review: `app/admin/support/plans/PlanPageClient.tsx` | Three-or-more-action states render all actions inside a `DropdownMenu` | | | |
| AC-FN-5 | No slug checks in PlanPageClient | `grep -n "plan\.slug" app/admin/support/plans/PlanPageClient.tsx` | 0 results | | | |
| AC-FN-6 | Shim NONE state passes actions through | Code review: `page.tsx` `hydrateFromLicense` | NONE-state plans return non-empty `state.actions` from scaffold data | | | |
| AC-FN-7 | Shim TRIAL_EXPIRED produces correct shape | Code review: `page.tsx` `hydrateFromLicense` | Returns trial-days pool + `[extend-trial, end-trial]` actions | | | |

---

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-REG-1 | TypeScript clean | `npm run typecheck` | 0 errors | | | |
| AC-REG-2 | Tests pass | `npm run test:ci` | All pass | | | |
| AC-REG-3 | Precheck passes | `npm run precheck` | 0 errors | | | |
