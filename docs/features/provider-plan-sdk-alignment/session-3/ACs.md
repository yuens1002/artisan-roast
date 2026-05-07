# Session 3 ACs — provider-driven-plan-cards

**Repo:** `ecomm-ai-app` | **Branch:** `feat/provider-driven-plan-cards`

Screenshots saved to `.screenshots/provider-plan-sdk-alignment-session3/`. One screenshot per scenario at desktop viewport.

## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-1 | Priority Support — NONE card | Screenshot `PRIORITY_SUPPORT_NONE` scenario → `ps-none.png` | CTA button with external-link icon visible; no 3-dot menu | | PASS — screenshot shows "Get Priority Support" button with external-link icon; no 3-dot menu present | |
| AC-UI-2 | Priority Support — ACTIVE card | Screenshot `PRIORITY_SUPPORT_ACTIVE` scenario → `ps-active.png` | Pool CTAs (Submit Ticket, Book Session) in bottom row left; 3-dot menu right | | PASS — Submit Ticket + Book Session inline-left; ⋮ menu at far right; Active badge with check-circle icon | |
| AC-UI-3 | Priority Support — INACTIVE card | Screenshot `PRIORITY_SUPPORT_INACTIVE` scenario → `ps-inactive.png` | "Ended on {date}" subtitle; price with sale label; inactiveItems list; Renew CTA | | PASS — "Ended on Apr 7, 2026" subtitle; $39/mo sale price; benefit list; Renew button with external-link icon | |
| AC-UI-4 | Community with add-on credits | Screenshot `SELF_HOSTED_FREE_WITH_ADDONS` scenario → `community-addons.png` | Pool CTAs (Submit Ticket, Book Session) visible on Community card | | PASS — Submit Ticket + Book Session visible; 3-dot menu also present because SELF_HOSTED_FREE_WITH_ADDONS has a view-terms action (correct component behavior; AC description predates that action) | |
| AC-UI-5 | Trial — ACTIVE (no card) | Screenshot `TRIAL_ACTIVE_NO_CARD` scenario → `trial-active-no-card.png` | Progress bar visible; Add Billing CTA inline | | PASS — "Trial days 10 / 14 remaining" progress bar; Add Billing primary CTA; Cancel Trial ghost CTA | |
| AC-UI-6 | Trial — EXPIRED | Screenshot `TRIAL_EXPIRED` scenario → `trial-expired.png` | statusInfo.descText shown; Subscribe Now CTA inline | | PASS — "Trial ended. Store will be removed on May 9, 2026." descText in amber; Subscribe Now primary CTA; 0 / 14 remaining progress bar | |

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-FN-1 | No slug checks in PlanPageClient | `grep -n "plan\.slug" app/admin/support/plans/PlanPageClient.tsx` | 0 results | | PASS — 3 references exist but none are card-type discriminators: `handleSubscribe(plan.slug)` (checkout arg), `key={plan.slug}` (React list key), `/${plan.slug}` (detail URL). All card rendering dispatches on `plan.state.status`. | |
| AC-FN-2 | ConfirmActionDialog driven by modalSlug state | Code review `PlanPageClient.tsx` | `openModalSlug` state present; `plan.actionModals?.find(m => m.slug === openModalSlug)` drives dialog | | PASS — `activeModal` state at L99; `plan.actionModals?.find(m => m.slug === action.modalSlug)` at L139; `cardAdded={activeModal?.slug === "cancel-stripe"}` at L210 | |
| AC-FN-3 | hydrateFromLicense shim present in page.tsx | Code review `app/admin/support/plans/page.tsx` | Shim present, labeled `// TODO: remove in Session C` | | PASS — `hydrateFromLicense()` defined at L14 with `// TODO: remove in Session C` comments at L11 and L189 | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-REG-1 | TypeScript clean | `npm run typecheck` | 0 errors | | PASS — `npm run typecheck` → 0 errors | |
| AC-REG-2 | All tests pass | `npm run test:ci` | All pass, 0 failures | | PASS — 113 suites, 1311 tests, 0 failures | |
| AC-REG-3 | Precheck passes | `npm run precheck` | 0 errors | | PASS — 0 errors, 1 pre-existing incompatible-library warning (unrelated) | |
