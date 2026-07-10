# /review report — bump-anthropic-sdk

**Branch:** `chore/bump-anthropic-sdk`
**Generated:** 2026-07-10
**Iterations to reach verified:** 1

## Structural exception

No in-repo plan or ACs doc exists for this work. Per `docs/AGENTIC-WORKFLOW.md`: "Skip for: Docs-only changes, single-line fixes, config tweaks, dependency updates." This is a single-package security-motivated bump, scoped down from the medium-risk tier at the user's explicit request ("just do anthropic-ai/sdk and leave the rest alone... no need to do unnecessary work"). Step 0's role-discovery falls back to the de-facto owning role: **`/devops`**. No project-local override exists; the global baseline applies.

## Verdict

**Clear.** Motivated by an actual moderate `npm audit` finding (`GHSA-p7fg-763f-g4gf`), not just version-freshness. Pre-verified via a dedicated research agent (full changelog read across ~55 releases + grep confirming this codebase doesn't use the affected beta namespace) before any install happened — reversing the order used for `archiver` in an earlier session, where the surprise was caught only after installing.

## Deliverables ↔ Code

| Item | Implementation | Status |
|---|---|---|
| `@anthropic-ai/sdk` 0.82.0 → 0.111.0 | `package.json` (devDependency, used only by `scripts/qa-agent.js` and `scripts/qa-repair-agent.js`) | ✓ shipped |
| CHANGELOG + version bump | `CHANGELOG.md`, `package.json` (0.109.14) | ✓ shipped |

### Code changes not tied to any deliverable

None — no source changes required, confirmed both before installing (changelog research) and after (typecheck/build/test all clean with zero diffs to `scripts/qa-agent.js` or `scripts/qa-repair-agent.js`).

## ACs ↔ Tests (Gate 3 spot-check)

Not applicable — no `AC-TST-*` rows. Verification:

- `npm run precheck` (typecheck + lint): 0 errors
- `npm run test:ci`: 128 suites / 1437 tests passing
- `npm run build`: succeeds
- `npm audit`: the `@anthropic-ai/sdk` advisory is gone (6 moderate → 5 moderate; the remaining 5 are unrelated, pre-existing, and have no sane fix path — see conversation record)
- **Live verification pending**: dispatching `qa-nightly.yml` against this branch to exercise `client.messages.create()` for real against the bumped SDK (the actual runtime surface, not just static analysis) before merge.

## Docs drift

None found.

## Recommendations

None outstanding for this fix. The rest of the medium-risk tier (`recharts`, `react-day-picker`, `puppeteer`, `@vercel/analytics`, `@vercel/speed-insights`) and the blocked `eslint`/`eslint-plugin-react-hooks` items remain queued per the user's explicit choice to isolate only the security-motivated bump this round.

## Inputs for /retro

- **Route:** `/devops` → `~/.claude/commands/devops.md`
  **Draft principle:** *"When a major/minor bump is motivated by a real `npm audit` finding (not just staleness), research the changelog and grep for the affected API surface in this codebase's own usage BEFORE installing — not after, the way `archiver` was handled. For a security-motivated bump the goal is confidence the fix is real and safe, not just 'nothing broke locally'; pair the static check with a live dispatch of whatever workflow actually exercises the changed code path in production-like conditions (here: `qa-nightly.yml`, which runs the exact `client.messages.create()` call site this bump touches) before merging."*
  **Triggered by:** This bump's process — research-before-install, confirmed via a dedicated agent that grepped for `.beta.` usage and read the actual GitHub changelog, then a live workflow dispatch as the final confidence check.
