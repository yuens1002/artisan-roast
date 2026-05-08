# Plan: fix/plan-card-ui

## Context

Platform data fixes landed in `artisan-roast-platform-wt` commit `ab8932d` (branch `feat/trial-pool-session3`). Those fixes introduced:
- `viewDetailsAction` helper injected into every plan's `state.actions` payload
- Trial-days pool label changed to "Trial days remaining"
- `manage-billing` variant changed to `"primary"`, `cancel` extracted as separate ghost action
- `viewDetailsAction` added for Community (view-terms), Priority Support, and House Blend plans

The store's `PlanPageClient.tsx` has several rendering gaps that need fixing to match the new payload contract.

## Issues to Fix

1. **PoolBar: missing icon + wrong metric** — Shows `{remaining} / {total} remaining` instead of `{used} / {total} {countLabel}`. Pool icon from `pool.icon` not rendered.
2. **ActiveCard: 3-dot menu in wrong location** — Currently at bottom-right; should be in header row next to badge. The 3-dot contains pool CTAs (`pool.cta`). Bottom row becomes ghost-left + primary-right from `state.actions`.
3. **TrialCard: broken `state.progress` reference** — SDK v0.4.0 removed `TrialState.progress`. Replace with `state.pools?.find(p => p.slug === "trial-days")`.
4. **ExpiredCard: same `state.progress` breakage** — Same fix.
5. **NoneCard: hardcoded `<Link>` for View Details** — Platform now injects view-details into `state.actions`. Remove hardcoded link; use first ghost action from payload as left CTA, primary actions as right CTAs.
6. **InactiveCard: hardcoded `<Link>` for View Details** — Same fix.

## Implementation

### PoolBar

```tsx
function PoolBar({ pool }: { pool: SdkUsagePool }) {
  const total = pool.limit + (pool.purchased ?? 0);
  const pct = total > 0 ? (pool.used / total) * 100 : 0;
  const PoolIcon = pool.icon ? resolveIcon(pool.icon) : null;
  // metric: {pool.used} / {total} {pool.countLabel}
  // label row: [PoolIcon] {pool.label}
}
```

### ActiveCard

Header row: `[name/desc] [Badge] [3-dot ▼ with pool CTAs]`
Bottom row: `[ghost actions (text-link style)] [flex-1] [primary actions (Button)]`

### TrialCard / ExpiredCard

```tsx
const trialPool = state.pools?.find((p) => p.slug === "trial-days");
const trialTotal = trialPool ? trialPool.limit + (trialPool.purchased ?? 0) : 0;
const trialRemaining = trialPool ? Math.max(0, trialTotal - trialPool.used) : 0;
const pct = trialPool && trialTotal > 0 ? (trialPool.used / trialTotal) * 100 : 0;
// Display: {trialRemaining} / {trialTotal} {trialPool?.countLabel ?? "days"} (countdown)
```

### NoneCard / InactiveCard

Remove `detailHref` prop. Use `state.actions`:
- First ghost action → left (text-link button)
- Non-ghost actions → right (Button elements)
- Remove `Link` import (no longer needed)

## Files Changed

- `app/admin/support/plans/PlanPageClient.tsx` — all rendering fixes

## Commit Schedule

1. `fix(plan-cards): fix PoolBar icon + metric, move 3-dot to header, fix trial-days pool rendering`
2. `fix(plan-cards): remove hardcoded View Details links; use payload-driven ghost CTAs`
3. `bump version to X.Y.Z`
