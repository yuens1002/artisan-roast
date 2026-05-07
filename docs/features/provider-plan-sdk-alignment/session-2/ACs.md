# Session 2 ACs — sdk-type-alignment

**Repo:** `ecomm-ai-app` | **Branch:** `feat/sdk-type-alignment`

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-FN-1 | `lib/plan-types.ts` deleted | Code review | File does not exist at `lib/plan-types.ts` | | PASS — `ls lib/plan-types.ts` → "No such file"; confirmed deleted in commit 78979c6d | |
| AC-FN-2 | All Plan/ConfirmActionConfig imports point to SDK | `grep -r "from.*plan-types"` | 0 results | | PASS — grep returns 0 results across entire codebase | |
| AC-FN-3 | MOCK_HYDRATED_PLANS exported from `lib/plans.ts` | Code review `lib/plans.ts` | Exported const typed as `HydratedPlan[]`, built from SDK SCENARIOS | | PASS — exported as `getMockHydratedPlans(): HydratedPlan[]` (function form to avoid Turbopack static analysis of dynamic require); uses `require("artisan-roast-sdk").SCENARIOS` | |
| AC-FN-4 | filterPlansByVisibility is generic `<T extends Plan>` | Code review `lib/plans.ts` | Signature is `function filterPlansByVisibility<T extends Plan>(plans: T[], isHosted: boolean): T[]` | | PASS — `lib/plans.ts:82` has exact signature `export function filterPlansByVisibility<T extends Plan>(plans: T[], isHosted: boolean): T[]` | |
| AC-FN-5 | benefits rendered from BenefitsBlock.activeItems | Code review `PlanPageClient.tsx` + `PlanDetailClient.tsx` | No `.benefits.map(` — all access via `.benefits?.activeItems` or `.benefits.activeItems` | | PASS — grep for `.benefits.map(` returns 0 results; all access points use `.benefits?.activeItems` | |
| AC-FN-6 | null visibility normalized at fetch boundary | Code review `fetchPlans()` in `lib/plans.ts` | `visibility: null` → `"self-hosted"` coercion present before cache assignment | | PASS — `lib/plans.ts:59` maps with `visibility: p.visibility ?? "self-hosted"` before assigning to `cached` | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-REG-1 | TypeScript clean | `npm run typecheck` | 0 errors | | PASS — `npm run typecheck` → 0 errors | |
| AC-REG-2 | All tests pass | `npm run test:ci` | All pass, 0 failures | | PASS — 113 suites, 1311 tests, 0 failures | |
| AC-REG-3 | Precheck passes | `npm run precheck` | 0 errors | | PASS — 0 errors, 1 pre-existing incompatible-library warning (unrelated) | |
