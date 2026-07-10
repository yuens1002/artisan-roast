# /review report — npm-major-low-risk

**Branch:** `chore/npm-major-low-risk`
**Generated:** 2026-07-10
**Iterations to reach verified:** 1

## Structural exception

No in-repo plan or ACs doc exists for this work. Per `docs/AGENTIC-WORKFLOW.md`: "Skip for: Docs-only changes, single-line fixes, config tweaks, **dependency updates**." This branch is exactly that category — the "low risk" tier of a major-version-bump backlog scoped with the user via `AskUserQuestion` following the `chore/dependency-maintenance` session (`docs/plans/dependency-maintenance-review.md`, recommendation #2). Step 0's role-discovery falls back to the de-facto owning role: **`/devops`**. No project-local override exists; the global baseline applies.

## Verdict

**Clear.** Scope narrowed live during implementation when one package turned out not to be the mechanical bump it was assessed as — handled the same way prior sessions handled similar surprises (revert, document, defer).

## Deliverables ↔ Code

| Item | Implementation | Status |
|---|---|---|
| `uuid` 13→14 | `package.json` | ✓ shipped |
| `@types/node` 25→26 | `package.json` | ✓ shipped |
| `markdownlint-cli2` 0.21→0.23 | `package.json` | ✓ shipped |
| `sharp` 0.34→0.35 | `package.json` | ✓ shipped |
| `archiver` + `@types/archiver` 7→8 | — | **not shipped**, see below |

### Code changes not tied to any deliverable

None.

### Deviation from scope

`archiver`/`@types/archiver` were in the original "low risk" tier based on a 1-file usage footprint, but `archiver@8.0.0` turned out to rewrite its entire API surface — the factory function `archiver("zip", opts)` this codebase uses in `app/api/admin/export/route.ts` no longer exists; v8 exports ES classes (`ZipArchive`, `TarArchive`, `JsonArchive`) instead. Caught by `tsc --noEmit` immediately (`TS1192: Module has no default export`), not by manual review — the type error was the signal, not a changelog read. Reverted to 7.0.1/7.0.0. Migrating the one call site to the new class-based API is small in isolated scope but is a real code change (not a version bump), so it's deferred to its own follow-up rather than folded into a "low risk" chore.

## ACs ↔ Tests (Gate 3 spot-check)

Not applicable — no `AC-TST-*` rows. Verification:

- `npm run precheck` (typecheck + lint): 0 errors (2 pre-existing warnings, unrelated)
- `npm run test:ci`: 128 suites / 1437 tests passing
- `npm run build`: succeeds
- Usage-footprint check before bumping: `uuid` (1 file, `v4` named import — the most stable part of uuid's API), `sharp` (1 file, `.resize().png().toBuffer()` — standard, stable surface), `markdownlint-cli2` (dev-tooling only, exercised by the Husky pre-commit hook on every commit in this same session)

## Docs drift

None found.

## Recommendations

1. `archiver` 7→8 migration: rewrite `app/api/admin/export/route.ts`'s `archiver("zip", { zlib: { level: 9 } })` call to `new ZipArchive({ zlib: { level: 9 } })` (import `{ ZipArchive }` instead of the default export), then re-verify the export endpoint's ZIP output. Small, single-file change — good candidate for its own short session rather than bundling into a "low risk" batch.
2. Medium/high-risk tiers (`recharts`, `@anthropic-ai/sdk`, `stripe`, `typescript`, `lucide-react`, `eslint`, etc.) remain queued per `docs/plans/dependency-maintenance-review.md`.

## Inputs for /retro

- **Route:** `/devops` → `~/.claude/commands/devops.md`
  **Draft principle:** *"A narrow usage footprint (few call sites) predicts review effort, not API stability — it doesn't mean a major bump is mechanical. Before bulk-installing a batch of 'low risk' major bumps, install and typecheck one at a time (or at minimum, run `tsc --noEmit` immediately after each install) so a real API rewrite surfaces as an isolated, attributable error instead of getting buried in a batch diff."*
  **Triggered by:** `archiver@8.0.0`'s factory-function-to-ES-classes rewrite, caught only because `tsc --noEmit` was run right after the batch install, not because the changelog was read first.
