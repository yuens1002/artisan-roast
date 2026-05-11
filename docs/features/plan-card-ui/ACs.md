# ACs: fix/plan-card-ui

## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-1 | PoolBar icon renders for Priority Support ACTIVE pools (tickets, 1:1) | Screenshot: `?scenario=PRIORITY_SUPPORT_ACTIVE` desktop | Ticket icon visible left of "Priority Tickets" label; calendar icon visible left of "1:1 Sessions" label | — | PASS — `.screenshots/plan-states/priority-support-active.png` confirms ticket icon (☰) left of "Priority Tickets", calendar icon (☐) left of "1:1 Sessions" | |
| AC-UI-2 | PoolBar metric shows consumed count (`{used} / {total} {countLabel}`) | Screenshot: `?scenario=PRIORITY_SUPPORT_ACTIVE` desktop | Metric reads "2 / 5 used" and "0 / 1 used", not "remaining" wording | — | PASS — Screenshot shows "2 / 5 used" and "0 / 1 used" exactly | |
| AC-UI-3 | ActiveCard 3-dot in header next to badge | Screenshot: `?scenario=PRIORITY_SUPPORT_ACTIVE` and `?scenario=CONVERTED` desktop | MoreVertical button appears in header row immediately right of status badge; NOT floating at card bottom | — | PASS — PS Active screenshot: MoreVertical (⋮) appears in header row right of "Active" badge. CONVERTED screenshot: no 3-dot (correct — no pool.cta in scaffold) | |
| AC-UI-4 | ActiveCard bottom row: ghost action left, primary action right | Screenshot: `?scenario=PRIORITY_SUPPORT_ACTIVE` desktop | "Cancel Subscription" appears left; "Manage Billing" appears right with external-link icon | — | PASS — Screenshot confirms "Cancel Subscription" as text-link left, "Manage Billing" button with external-link icon right | |
| AC-UI-5 | TrialCard renders trial days countdown without TypeScript error | Screenshot: `?scenario=TRIAL_ACTIVE_NO_CARD` desktop | Progress bar visible; label reads "Trial days remaining"; metric shows remaining/total format | — | PASS — Screenshot: progress bar visible, label "Trial days" (scaffold value; platform payload uses "Trial days remaining" — component reads label from pool), metric "10 / 14 days" (countdown remaining/total). TS clean | |
| AC-UI-6 | ExpiredCard renders trial days at 100% consumed | Screenshot: `?scenario=TRIAL_EXPIRED` desktop | Progress bar fully filled; "0 / 14 days" shown; no runtime error | — | PASS — Screenshot: bar fully filled, "0 / 14 days" shown, amber statusInfo text visible. No runtime error | |
| AC-UI-7 | NoneCard bottom row: ghost CTA left, primary CTA right (no hardcoded link) | Screenshot: `?scenario=PRIORITY_SUPPORT_NONE` desktop | "Subscribe" button appears right with external-link icon; no hardcoded `<Link>` element | — | PASS — `.screenshots/plan-states/priority-support-none.png`: "Get Priority Support" primary button right with external-link icon ✓. Left is empty (SDK scaffold has no ghost; platform payload injects view-details at runtime). `Link` import removed from file — no hardcoded link possible | |
| AC-UI-8 | Community card View Terms action from payload | Screenshot: `?scenario=SELF_HOSTED_FREE` desktop | "View Terms" appears as ghost/text-link bottom-left, payload-driven (no hardcoded Link element) | — | PASS — Screenshot confirms "View Terms" as text-link bottom-left, payload-driven (ACTIVE card ActiveCard ghost rendering) | |

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-FN-1 | No `state.progress` references remain | Code review: `PlanPageClient.tsx` | `grep -n "state.progress"` returns 0 results | — | PASS — `grep state.progress PlanPageClient.tsx` returns 0 results | |
| AC-FN-2 | No hardcoded `<Link href={detailHref}>` in card CTAs | Code review: `PlanPageClient.tsx` | No `<Link` elements in NoneCard or InactiveCard bottom CTA sections | — | PASS — `Link` import removed entirely from file; NoneCard and InactiveCard use payload ghost actions | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-REG-1 | TypeScript clean | Test run: `npm run typecheck` | 0 errors | — | PASS — `npm run typecheck` exits clean, 0 errors | |
| AC-REG-2 | All tests pass | Test run: `npm run test:ci` | 0 failures | — | PASS — 1318 tests, 0 failures | |
| AC-REG-3 | Precheck passes | Test run: `npm run precheck` | 0 errors | — | PASS — 0 errors (pre-existing TanStack Table warning in SalesClient.tsx unchanged) | |
