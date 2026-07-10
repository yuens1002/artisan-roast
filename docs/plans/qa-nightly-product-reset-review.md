# /review report — qa-nightly-product-reset

**Branch:** `fix/qa-nightly-product-reset`
**Generated:** 2026-07-10
**Iterations to reach verified:** 1

## Structural exception

No in-repo plan or ACs doc exists for this work. Per `docs/AGENTIC-WORKFLOW.md`: "Skip for: Docs-only changes, single-line fixes, config tweaks, dependency updates." This is a single-file CI config fix (one workflow step), surfaced during the `chore/dependency-maintenance` session's live CI validation and documented as a recommendation in that PR's `/review` report (`docs/plans/dependency-maintenance-review.md`, recommendation #4). Step 0's role-discovery falls back to the de-facto owning role: **`/devops`**. No project-local `.claude/commands/devops.md` override exists; the global baseline applies.

## Verdict

**Clear.** Root cause confirmed against the Prisma schema, fix verified live against a real reproduction of the failure (not just a plausible-looking diff).

## Deliverables ↔ Code

| Item | Implementation | Status |
|---|---|---|
| Clear `Product` (and its non-cascading dependents) in `qa-nightly.yml`'s reset step | `.github/workflows/qa-nightly.yml:139-146` | ✓ shipped |
| CHANGELOG + version bump | `CHANGELOG.md`, `package.json` (0.109.12) | ✓ shipped |

### Code changes not tied to any deliverable

None.

## ACs ↔ Tests (Gate 3 spot-check)

Not applicable — no `AC-TST-*` rows; this is a workflow-YAML change with no app-level test surface. Verification instead:

- `npm run precheck` passed via the pre-commit hook (0 errors) — confirms no accidental app-code touch.
- YAML syntax validated with `js-yaml` (UTF-8, since the default Windows codepage chokes on the file's emoji).
- **Live reproduction + fix verification**: dispatched `install-test.yml` against `main` (full `prisma migrate reset --force` + real QA redeploy), which reliably left one stray demo product via `vercel-build`'s seed-on-empty behavior — then dispatched `qa-nightly.yml` against this branch. `AC-IS-2` passed: "URL is /admin/products; empty state message ... is displayed; 0 products shown." This is materially stronger verification than a static diff review, since it reproduces the exact failure mode from the prior PR and confirms the fix against it, not just a schema read.

## Root-cause check (schema)

`Product` has six inbound relations. Four cascade (`ProductVariant`, `ProductTag`, `Review`, `AddOnLink.primaryProduct`); two do not:

- `CategoriesOnProducts.product` — no `onDelete` specified (defaults to restrict/no-action in Postgres)
- `AddOnLink.addOnProduct` — explicit `onDelete: Restrict`

A bare `DELETE FROM "Product"` would have hit a foreign-key violation the moment the seeded product had a category assigned (which the minimal seed always assigns). The fix clears `CategoriesOnProducts` and `AddOnLink` first, in FK-safe order.

## Docs drift

None found — no other doc claims the QA reset step's exact scope.

## Recommendations

1. None outstanding for this fix. Two items from the prior PR's review report remain open and are unaffected by this change: (a) `scripts/qa-enrich-issue.js`'s shell-escaping bug that silently drops self-heal enrichment comments, (b) `docs/BUILD_DEPLOYMENT_GUIDE.md`'s stale example workflow snippet.

## Inputs for /retro

- **Route:** `/devops` → `~/.claude/commands/devops.md`
  **Draft principle:** *"When a reset/teardown SQL script targets a table with inbound foreign keys, check the schema for `onDelete` behavior on each inbound relation before writing the `DELETE` — cascading relations are covered automatically, but `Restrict`/default (no-action) relations must be cleared explicitly, in dependency order, or the delete fails at runtime rather than at review time."*
  **Triggered by:** This fix — `CategoriesOnProducts` and `AddOnLink.addOnProduct` both restrict rather than cascade on `Product`, which a plain `DELETE FROM "Product"` would not have surfaced until it actually ran against real data.
