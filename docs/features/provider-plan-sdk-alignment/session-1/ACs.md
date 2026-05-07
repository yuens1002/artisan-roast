# Session 1 ACs — SDK: Priority Support scaffolds

**Repo:** `artisan-roast-sdk` | **Branch:** `feat/priority-support-scaffolds`

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-FN-1 | PRIORITY_SUPPORT_NONE validates | `mcp__artisan-roast-sdk__validate_plan_payload(SCENARIOS.PRIORITY_SUPPORT_NONE)` | returns `{ valid: true }` | | | |
| AC-FN-2 | PRIORITY_SUPPORT_ACTIVE validates; both pools have cta | Code review `src/plans/scaffolds.ts` + `validate_plan_payload` | pools[].cta present on tickets + one-on-one; passes HydratedPlanSchema | | | |
| AC-FN-3 | PRIORITY_SUPPORT_INACTIVE validates | `mcp__artisan-roast-sdk__validate_plan_payload(SCENARIOS.PRIORITY_SUPPORT_INACTIVE)` | returns `{ valid: true }` | | | |
| AC-FN-4 | SELF_HOSTED_FREE_WITH_ADDONS validates | `mcp__artisan-roast-sdk__validate_plan_payload(SCENARIOS.SELF_HOSTED_FREE_WITH_ADDONS)` | returns `{ valid: true }` | | | |
| AC-FN-5 | SELF_HOSTED_FREE slug fixed | Code review `scaffolds.ts` | `SCENARIOS.SELF_HOSTED_FREE.slug === "free"` | | | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-REG-1 | All existing scenarios still validate; TypeScript clean | `npm run build` in SDK repo | 0 TypeScript errors | | | |
