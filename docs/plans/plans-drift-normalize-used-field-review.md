# /review report — plans-drift-normalize-used-field

**Branch:** `chore/plans-drift-normalize-used-field`
**Generated:** 2026-06-13
**Type:** Tooling patch — no plan doc, no ACs

## Verdict

Clear — single focused change, no ACs to verify. Root cause (time-advancing `used` counter) confirmed via artifact diff on issue #425. Fix is consistent with the existing `resolvedAt` normalization pattern.

## Deliverables ↔ Code

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| Normalize `used` fields at capture time | `scripts/capture-plan-scenarios.ts` — `normalizeTimeDependentFields()` helper added; applied before `resolvedAt` override in `captureOne()` | ✓ shipped |
| Backfill existing baselines | 5 captured JSON files updated: `dev-hosted-active-card`, `dev-hosted-active-no-card`, `dev-hosted-expired`, `dev-hosted-converted`, `dev-pro` | ✓ shipped |

### Code changes not tied to any deliverable

None — CHANGELOG + package.json are version-bump overhead only.

## Regression risk

Low. `normalizeTimeDependentFields` is a pure recursive mapper applied only at capture time. It does not affect runtime code paths. The `used` field is masked in baselines only; real schema regressions (missing fields, renamed slugs) still produce a diff.
