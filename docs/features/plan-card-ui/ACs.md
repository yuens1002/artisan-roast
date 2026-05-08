# ACs: fix/plan-card-ui

## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-UI-1 | PoolBar icon renders for Priority Support ACTIVE pools (tickets, 1:1) | Screenshot: `?scenario=PRIORITY_SUPPORT_ACTIVE` desktop | Ticket icon visible left of "Priority Tickets" label; calendar icon visible left of "1:1 Sessions" label | | | |
| AC-UI-2 | PoolBar metric shows consumed count (`{used} / {total} {countLabel}`) | Screenshot: `?scenario=PRIORITY_SUPPORT_ACTIVE` desktop | Metric reads "2 / 5 used" and "0 / 1 used", not "remaining" wording | | | |
| AC-UI-3 | ActiveCard 3-dot in header next to badge | Screenshot: `?scenario=PRIORITY_SUPPORT_ACTIVE` and `?scenario=CONVERTED` desktop | MoreVertical button appears in header row immediately right of status badge; NOT floating at card bottom | | | |
| AC-UI-4 | ActiveCard bottom row: ghost action left, primary action right | Screenshot: `?scenario=PRIORITY_SUPPORT_ACTIVE` desktop | "Cancel Subscription" appears left; "Manage Billing" appears right with external-link icon | | | |
| AC-UI-5 | TrialCard renders trial days countdown without TypeScript error | Screenshot: `?scenario=TRIAL_ACTIVE_NO_CARD` desktop | Progress bar visible; label reads "Trial days remaining"; metric shows remaining/total format (e.g. "12 / 14 days") | | | |
| AC-UI-6 | ExpiredCard renders trial days at 100% consumed | Screenshot: `?scenario=TRIAL_EXPIRED` desktop | Progress bar fully filled; "0 / 14 days" shown; no runtime error | | | |
| AC-UI-7 | NoneCard bottom row: ghost CTA left, primary CTA right (no hardcoded link) | Screenshot: `?scenario=PRIORITY_SUPPORT_NONE` desktop | "View Details" appears as text-link left; "Subscribe" button appears right with external-link icon | | | |
| AC-UI-8 | Community card View Terms action from payload | Screenshot: `?scenario=SELF_HOSTED_FREE` desktop | "View Terms" appears as ghost/text-link bottom-left, payload-driven (no hardcoded Link element) | | | |

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-FN-1 | No `state.progress` references remain | Code review: `PlanPageClient.tsx` | `grep -n "state.progress"` returns 0 results | | | |
| AC-FN-2 | No hardcoded `<Link href={detailHref}>` in card CTAs | Code review: `PlanPageClient.tsx` | No `<Link` elements in NoneCard or InactiveCard bottom CTA sections | | | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-REG-1 | TypeScript clean | Test run: `npm run typecheck` | 0 errors | | | |
| AC-REG-2 | All tests pass | Test run: `npm run test:ci` | 0 failures | | | |
| AC-REG-3 | Precheck passes | Test run: `npm run precheck` | 0 errors | | | |
