# Session 3 ACs — provider-driven-plan-cards

**Repo:** `ecomm-ai-app` | **Branch:** `feat/provider-driven-plan-cards`

Screenshots saved to `.screenshots/provider-plan-sdk-alignment-session3/`. One screenshot per scenario at desktop viewport.

## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-1 | Priority Support — NONE card | Screenshot `PRIORITY_SUPPORT_NONE` scenario → `ps-none.png` | CTA button with external-link icon visible; no 3-dot menu | | | |
| AC-UI-2 | Priority Support — ACTIVE card | Screenshot `PRIORITY_SUPPORT_ACTIVE` scenario → `ps-active.png` | Pool CTAs (Submit Ticket, Book Session) in bottom row left; 3-dot menu right | | | |
| AC-UI-3 | Priority Support — INACTIVE card | Screenshot `PRIORITY_SUPPORT_INACTIVE` scenario → `ps-inactive.png` | "Ended on {date}" subtitle; price with sale label; inactiveItems list; Renew CTA | | | |
| AC-UI-4 | Community with add-on credits | Screenshot `SELF_HOSTED_FREE_WITH_ADDONS` scenario → `community-addons.png` | Pool CTAs (Submit Ticket, Book Session) visible on Community card | | | |
| AC-UI-5 | Trial — ACTIVE (no card) | Screenshot `TRIAL_ACTIVE_NO_CARD` scenario → `trial-active-no-card.png` | Progress bar visible; Add Billing CTA inline | | | |
| AC-UI-6 | Trial — EXPIRED | Screenshot `TRIAL_EXPIRED` scenario → `trial-expired.png` | statusInfo.descText shown; Subscribe Now CTA inline | | | |

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-FN-1 | No slug checks in PlanPageClient | `grep -n "plan\.slug" app/admin/support/plans/PlanPageClient.tsx` | 0 results | | | |
| AC-FN-2 | ConfirmActionDialog driven by modalSlug state | Code review `PlanPageClient.tsx` | `openModalSlug` state present; `plan.actionModals?.find(m => m.slug === openModalSlug)` drives dialog | | | |
| AC-FN-3 | hydrateFromLicense shim present in page.tsx | Code review `app/admin/support/plans/page.tsx` | Shim present, labeled `// TODO: remove in Session C` | | | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-REG-1 | TypeScript clean | `npm run typecheck` | 0 errors | | | |
| AC-REG-2 | All tests pass | `npm run test:ci` | All pass, 0 failures | | | |
| AC-REG-3 | Precheck passes | `npm run precheck` | 0 errors | | | |
