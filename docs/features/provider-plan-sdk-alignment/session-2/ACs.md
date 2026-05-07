# Session 2 ACs — sdk-type-alignment

**Repo:** `ecomm-ai-app` | **Branch:** `feat/sdk-type-alignment`

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-FN-1 | `lib/plan-types.ts` deleted | Code review | File does not exist at `lib/plan-types.ts` | | | |
| AC-FN-2 | All Plan/ConfirmActionConfig imports point to SDK | `grep -r "from.*plan-types"` | 0 results | | | |
| AC-FN-3 | MOCK_HYDRATED_PLANS exported from `lib/plans.ts` | Code review `lib/plans.ts` | Exported const typed as `HydratedPlan[]`, built from SDK SCENARIOS | | | |
| AC-FN-4 | filterPlansByVisibility is generic `<T extends Plan>` | Code review `lib/plans.ts` | Signature is `function filterPlansByVisibility<T extends Plan>(plans: T[], isHosted: boolean): T[]` | | | |
| AC-FN-5 | benefits rendered from BenefitsBlock.activeItems | Code review `PlanPageClient.tsx` + `PlanDetailClient.tsx` | No `.benefits.map(` — all access via `.benefits?.activeItems` or `.benefits.activeItems` | | | |
| AC-FN-6 | null visibility normalized at fetch boundary | Code review `fetchPlans()` in `lib/plans.ts` | `visibility: null` → `"self-hosted"` coercion present before cache assignment | | | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-REG-1 | TypeScript clean | `npm run typecheck` | 0 errors | | | |
| AC-REG-2 | All tests pass | `npm run test:ci` | All pass, 0 failures | | | |
| AC-REG-3 | Precheck passes | `npm run precheck` | 0 errors | | | |
