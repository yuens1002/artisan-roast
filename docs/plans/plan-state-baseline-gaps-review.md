# /review report — plan-state-baseline-gaps

**Branch:** `fix/plan-state-baseline-gaps`
**Generated:** 2026-06-12
**Iterations to reach verified:** 1

## Verdict

Minor — one in-repo docs drift (README.md refresh command references the deprecated env-style format after D2 switched the canonical approach to the public JSON); fix before merge.

## Deliverables ↔ Code

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| D1 — add 2 missing keys to `plan-scenarios.ts` | `app/admin/support/plans/_fixtures/plan-scenarios.ts`: SCENARIO_FIXTURES lines 93+97, HOSTED_KEYS lines 111-112 | ✓ shipped |
| D2 — fix 4 LABEL_TO_ID bugs in capture script | `scripts/capture-plan-scenarios.ts` lines 51–72: 4 corrections + 3 additions | ✓ shipped |
| D3 — capture 3 missing baselines | `e2e/plans/captured/`: 3 new JSON files; `dev-pro-inactive.json` legitimately refreshed (deactivatedAt advances each re-seed) | ✓ shipped |

### Code changes not tied to any deliverable

- `.claude/verification-status.json` — workflow state tracking, expected overhead
- `docs/plans/plan-state-baseline-gaps-plan.md` — plan doc, expected
- `e2e/plans/captured/dev-pro-inactive.json` one-line diff — expected side effect of running `plans:capture` (deactivatedAt = `now - 30d`, advances on every re-seed); not a regression

## ACs ↔ Tests (Gate 3 spot-check)

No `AC-TST-*` ACs in this plan — all ACs are FN/CAP/REG categories. REG ACs use the existing test suite unchanged. Step 2 is N/A.

## Docs drift

**In-repo — Minor:**

`e2e/plans/captured/README.md` — the "Refresh discipline" example still uses the old env-style path:

```bash
DEV_KEYS_FILE=../artisan-roast-platform/.dev-scenario-keys \
```

D2 fixes `LABEL_TO_ID` (the env-style parser) and the capture script's own header already documents both formats. The README should reference the public JSON path instead — it's committed, cross-platform, and doesn't require a gitignored local file:

```bash
DEV_KEYS_FILE=../artisan-roast-platform/scripts/dev-scenario-keys.public.json \
```

**Out-of-scope — needs companion PR in platform repo:**

`docs/appendix/cross-repo/plan-state-testing.md` (in `artisan-roast-platform`) still lists GAP-2 as open. GAP-2 is now closed by this branch. Platform-repo companion update needed after merge.

## Recommendations

1. **Fix `e2e/plans/captured/README.md`** — update the refresh command to use `scripts/dev-scenario-keys.public.json` instead of the gitignored `.dev-scenario-keys` env-style file. One-line change; commit as `docs: update capture README refresh command to use public JSON`.
2. **Platform companion PR** — after merge, update `docs/appendix/cross-repo/plan-state-testing.md` in `artisan-roast-platform` to mark GAP-2 closed and note that the public JSON format is the canonical local capture path.

## Inputs for /retro

**Structural exception — no existing role skill files found:**
Neither `~/.claude/commands/devops.md` nor `~/.claude/commands/test-engineer.md` exist. If this review surfaces a lesson worth persisting, it would need a new skill file. Both de-facto roles are named here so `/retro` knows the routing intent.

- **De-facto owning role:** `/devops` — owns capture scripts, CI workflows, and baseline data files
- **De-facto supporting role:** `/test-engineer` — owns `plan-scenarios.ts` (fixture map consumed by the screenshot harness and the `?scenario=` dev override)

**No lessons surfaced that warrant a new skill file.** The README drift is a one-off maintenance gap, not a pattern that would recur across features. The LABEL_TO_ID bug was pre-existing and is now fixed structurally (public JSON format is documented as canonical). No principle addition would have prevented it; the fix is the documentation update.
