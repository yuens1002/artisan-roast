# /review report — dependency-maintenance

**Branch:** `chore/dependency-maintenance`
**Generated:** 2026-07-10
**Iterations to reach verified:** 1

## Structural exception

No in-repo plan or ACs doc exists for this work. Per `docs/AGENTIC-WORKFLOW.md`: "Skip for: Docs-only changes, single-line fixes, config tweaks, **dependency updates**." This branch is exactly that category — a user-requested npm + GitHub Actions maintenance sweep with no feature deliverables list. Step 0's role-discovery falls back to the de-facto owning role for this kind of change: **`/devops`** (CI/CD, dependency, and infra maintenance). No project-local `.claude/commands/devops.md` override exists in this repo, so the global baseline at `~/.claude/commands/devops.md` is the reference.

## Verdict

**Clear.** The change is a bounded dependency + CI-version maintenance sweep, not new product behavior — verified via the existing test suite (not new tests) plus live dispatch of every `workflow_dispatch`-capable workflow against this branch before merge, which is a stronger signal than a typical chore PR gets.

## Deliverables ↔ Code

No deliverables list exists (see Structural exception). The de-facto scope, as agreed with the user via `AskUserQuestion` mid-session:

| Scope item | Implementation | Status |
|---|---|---|
| Safe npm patch/minor bumps + audit fix | `package.json`, `package-lock.json` | ✓ shipped |
| GitHub Actions pinned-version bumps (7 workflow files) | `.github/workflows/*.yml` | ✓ shipped |
| `install-matrix.yml` Node 22→24 fix | `.github/workflows/install-matrix.yml` | ✓ shipped |
| CHANGELOG + version bump | `CHANGELOG.md`, `package.json` | ✓ shipped |

Three packages the bump would have carried (`stripe`, `eslint-plugin-react-hooks`, `@playwright/test`) were explicitly reverted after breaking typecheck / lint / CI in verification — each documented in the CHANGELOG entry and the commit history rather than silently dropped.

### Code changes not tied to any deliverable

None. Scope stayed within the user-confirmed bounds (excluded: major version bumps, deferred to a separate session per explicit user choice).

## ACs ↔ Tests (Gate 3 spot-check)

Not applicable — no `AC-TST-*` rows exist for this branch. Verification instead relied on:

- `npm run precheck` (typecheck + lint): 0 errors
- `npm run test:ci`: 128 suites / 1437 tests passing
- `npm run build`: succeeds
- Live dispatch of all 5 `workflow_dispatch`-capable workflows against `chore/dependency-maintenance` (Install Matrix, Install Verification, Plans Resolver Drift, E2E Nightly, Nightly QA Verification) — caught a real regression (`@playwright/test` 1.61.1 breaking the nightly `install_browser()` workaround) that `npm run precheck`/`test:ci`/`build` could not have caught, since it only manifests inside the GitHub Actions runner's Playwright bootstrap step.

## Docs drift

- `docs/BUILD_DEPLOYMENT_GUIDE.md:185-189` — illustrative example workflow snippet shows `actions/checkout@v4`, `actions/setup-node@v4`, `node-version: "20"`. This was already stale before this branch (no real workflow in the repo used these values even pre-maintenance; all were already on `setup-node@v6.4.0` / Node 24 except `install-matrix.yml`, which this PR fixed). Not caused by this PR, but now doubly stale against the post-maintenance state (`actions/checkout@v7.0.0`, Node 24 everywhere). Flagged for a follow-up docs touch-up, not blocking.

## Recommendations

1. Update `docs/BUILD_DEPLOYMENT_GUIDE.md`'s example workflow snippet to match current pinned versions (or note it's illustrative-only and versions will drift by design).
2. Follow-up session: review the major-version bumps intentionally excluded from this pass (`@anthropic-ai/sdk`, `stripe`, `typescript`, `eslint`, `recharts`, `lucide-react`, and others surfaced in `npm outdated`).
3. Follow-up session: fix the 53 pre-existing `react-hooks/set-state-in-effect` / `react-hooks/refs` findings that `eslint-plugin-react-hooks@7.1.1` would surface, then re-attempt that bump.
4. Low-priority CI hardening: `qa-nightly.yml`'s "Reset QA state" step only clears `Order`/`SiteSettings`/`User`, never `Product`. Under normal nightly cadence this is invisible (nothing else seeds products in the QA env between runs), but it surfaced during this session's validation: dispatching `install-test.yml` (which does a full `prisma migrate reset --force` + real QA redeploy, and the redeploy's `vercel-build` auto-seeds one demo product via `scripts/build-resilient.js` when it finds the products table empty) followed by `qa-nightly.yml` left a stray product that failed `AC-IS-2`. Consider adding `DELETE FROM "Product"` to `qa-nightly.yml`'s reset step for robustness against this class of interaction. Not caused by this PR's changes; pre-existing gap, reproducible on `main` today under the same trigger sequence.
5. Separately, `scripts/qa-enrich-issue.js` has a pre-existing shell-escaping bug: the `gh issue comment` body embeds literal `\n` sequences that `/bin/sh` chokes on ("Syntax error: word unexpected"), so Category B/C self-heal enrichment comments silently fail to post. Worth a small fix in a future CI-tooling pass.

## Inputs for /retro

- **Route:** `/devops` → `~/.claude/commands/devops.md` (no project-local override)
  **Draft principle:** *"Before accepting a `npm update`-driven bump of a package that a CI workaround script depends on by internal/undocumented path (e.g. reaching into `node_modules/<pkg>/lib/server/...` rather than the package's public API), grep the workflow files for hardcoded `require(...)`/internal-path references to that package and verify the path still exists post-bump — or dispatch the workflow against the branch before merge. A semver-compliant minor bump can still break an internal-path dependency because internal file layout isn't covered by semver guarantees."*
  **Triggered by:** `@playwright/test` 1.58.2→1.61.1 restructuring `playwright-core`'s internal registry module path, breaking `e2e-nightly.yml`/`qa-nightly.yml`'s `install_browser()` yauzl-bypass script — caught only because this session manually dispatched the nightly workflows before merge, which is not the default practice for a routine dependency bump.

- **Route:** `/devops` → `~/.claude/commands/devops.md`
  **Draft principle:** *"When a workflow's environment-reset step only clears a subset of tables/state (e.g. `qa-nightly.yml` clearing `Order`/`SiteSettings`/`User` but not `Product`), document the assumption inline (a comment naming what's NOT cleared and why it's normally safe) so a future manual dispatch alongside a sibling workflow that repopulates that state doesn't read as a code regression."*
  **Triggered by:** The `AC-IS-2` false-failure this session traced to `install-test.yml` + `qa-nightly.yml` colliding on shared QA state.
