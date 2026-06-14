# /review report — ci-nightly-playwright-node24

**Branch:** `fix/ci-nightly-playwright-node24`
**Generated:** 2026-06-14
**Iterations to reach verified:** 1

## Verdict

Clear — pure CI infrastructure fix, no product code touched. Two root causes diagnosed from live run logs, both patched in the same commit.

## Deliverables ↔ Code

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| Fix playwright hang in `e2e-nightly.yml` | Split `playwright install chromium --with-deps` into `install-deps` (DEBIAN_FRONTEND=noninteractive) + `install chromium`; added `timeout-minutes: 30` | ✓ shipped |
| Fix playwright hang in `qa-nightly.yml` | Same split applied to both `qa` job and `self-heal` job | ✓ shipped |
| Node.js 20 deprecation — all 7 workflows | `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"` added at workflow level to `e2e-nightly.yml`, `qa-nightly.yml`, `plans-capture-nightly.yml`, `build-safe-main.yml`, `spec-drift.yml`, `install-test.yml`, `install-matrix.yml` | ✓ shipped |

### Code changes not tied to any deliverable

- `package.json` / `package-lock.json` / `CHANGELOG.md` — version bump, expected release overhead

## ACs ↔ Tests

No plan doc or ACs — this is an infrastructure patch. Verification is observational: the two stuck nightly runs (27493188747, 27492014808) were cancelled manually; next scheduled runs will confirm the fix.

## Docs drift

None — no architecture or feature docs affected by CI workflow changes.

## Recommendations

None. The fix is structural (separate the install steps) and the timeout is a safety net for any future regressions of the same class.

## Inputs for /retro

- **Owning role:** `/devops`
- **Lesson:** `playwright install chromium --with-deps` is a footgun on GitHub-hosted Ubuntu runners — the apt post-install hook for Chrome can freeze with no output, no timeout, and no signal. The safe pattern is always to split: `install-deps` first (with `DEBIAN_FRONTEND=noninteractive`), then `install chromium`. Add a job-level `timeout-minutes` as a backstop.
