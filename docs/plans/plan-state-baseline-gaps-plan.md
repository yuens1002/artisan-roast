# Plan State Baseline Gaps — Plan

**Branch:** `fix/plan-state-baseline-gaps`
**Base:** `main`

---

## Context

The platform's dev seed has 16 scenario keys (`scripts/dev-scenario-keys.public.json` in
`artisan-roast-platform`). The store's `plan-scenarios.ts` has only 14 — two keys are missing
from `SCENARIO_FIXTURES` and `ALL_KEYS`. Of the 14 that exist, only 13 have been captured in
`e2e/plans/captured/`. Three baseline JSON files are absent.

These gaps are tracked in `docs/appendix/cross-repo/plan-state-testing.md` (platform repo) as
GAP-1 (nightly CI secret — ops step) and GAP-2 (3 missing baselines + 2 missing fixture entries).

A secondary bug: `capture-plan-scenarios.ts`'s `LABEL_TO_ID` (used for env-style
`.dev-scenario-keys` file parsing) has wrong/missing entries. This doesn't affect CI (which uses
`DEV_KEYS_JSON` directly) or the JSON-format local path, but should be corrected.

### Why dev-hosted-converting and dev-hosted-pending are both PENDING at the store level

Both scenarios have DB status `CONVERTING`. `dispatch.ts` line 90 maps all `CONVERTING` records
to lifecycle key `"CONVERTING"` regardless of `cardAdded` — so both produce SDK `status: "PENDING"`.

The DB distinction is `cardAdded`:
- `dev-hosted-pending` (`cardAdded: false`): Stripe Checkout opened, customer hasn't submitted yet
- `dev-hosted-converting` (`cardAdded: true`): Card submitted, Stripe confirmed, platform
  provisioning in flight

Both are valid DB permutations covered by the platform's Layer 1 e2e suite. From the store's
view they're identical — the store only sees `PENDING`. The fixture `[SCENARIOS.PENDING]` is
correct for both.

---

## Commit Schedule

| # | Message | Deliverables | Risk |
|---|---|---|---|
| 0 | `docs: add plan for plan-state-baseline-gaps` | plan doc | — |
| 1 | `fix(plans): add dev-hosted-converting and dev-hosted-pending-verification scenario keys` | D1 | Low |
| 2 | `fix(plans): correct LABEL_TO_ID label-to-key mappings in capture script` | D2 | Low |
| 3 | `chore(plans): capture baselines for 3 missing scenario keys` | D3 | Low — hits prod API |

---

## Acceptance Criteria

**Plan:** `docs/plans/plan-state-baseline-gaps-plan.md`

### Functional (verified by code review)

| AC | What | How | Agent | Pass |
|----|------|-----|-------|------|
| AC-FN-1 | All 16 scenario keys present in `SCENARIO_FIXTURES` and `ALL_KEYS` | Code review: compare keys vs `dev-scenario-keys.public.json` | PASS — `plan-scenarios.ts` lines 74–101 has all 16 keys; `ALL_KEYS` = `SELF_HOSTED_KEYS` (3) + `HOSTED_KEYS` (13) = 16; all match `dev-scenario-keys.public.json` exactly | All 16 keys match; none missing |
| AC-FN-2 | `dev-hosted-converting` maps to `[SCENARIOS.PENDING]` | Code review: `plan-scenarios.ts` entry | PASS — `plan-scenarios.ts` line 93: `"dev-hosted-converting": [SCENARIOS.PENDING]` | `"dev-hosted-converting": [SCENARIOS.PENDING]` |
| AC-FN-3 | `dev-hosted-pending-verification` maps to `[]` | Code review: `plan-scenarios.ts` entry | PASS — `plan-scenarios.ts` line 97: `"dev-hosted-pending-verification": []` | `"dev-hosted-pending-verification": []` |
| AC-FN-4 | All LABEL_TO_ID entries map to correct dev keys, no missing platform labels | Code review: cross-ref with `dev-scenario-keys.public.json` label fields | PASS — `capture-plan-scenarios.ts` lines 51–72: all 16 platform labels present; each maps to the correct dev-key id; no wrong targets found | No wrong target keys; all 16 platform labels have a correct mapping |

### Capture / data (verified by code review)

| AC | What | How | Agent | Pass |
|----|------|-----|-------|------|
| AC-CAP-1 | `e2e/plans/captured/` contains 16 JSON files | Code review: `ls e2e/plans/captured/*.json \| wc -l` | PASS — Glob returned 16 files: `dev-free`, `dev-pro`, `dev-pro-inactive`, `dev-hosted-active-no-card`, `dev-hosted-active-card`, `dev-hosted-expired`, `dev-hosted-converted`, `dev-hosted-cancelled-card`, `dev-hosted-inactive`, `dev-hosted-cancelled`, `dev-hosted-pending`, `dev-hosted-converting`, `dev-hosted-initial-provisioning`, `dev-hosted-pending-verification`, `dev-hosted-provisioning`, `dev-hosted-deprovisioned` | 16 |
| AC-CAP-2 | `dev-hosted-initial-provisioning.json` matches expected shape | Code review: read file | PASS — file contains `{ "plans": [], "resolvedAt": "<NORMALISED_AT_CAPTURE>" }` | `{ plans: [] }` |
| AC-CAP-3 | `dev-hosted-converting.json` matches expected shape | Code review: read file | PASS — file contains `plans[0].state.status === "PENDING"` with `statusInfo.descText: "Confirming your payment…"` and `actions: []` | `{ plans: [{ state: { status: "PENDING" } }] }` |
| AC-CAP-4 | `dev-hosted-pending-verification.json` matches expected shape | Code review: read file | PASS — file contains `{ "plans": [], "resolvedAt": "<NORMALISED_AT_CAPTURE>" }` | `{ plans: [] }` |

### Regression (verified by test suite)

| AC | What | How | Agent | Pass |
|----|------|-----|-------|------|
| AC-REG-1 | Test suite unaffected | Test run: `npm run test:ci` | PASS — recorded from main thread: 127 suites / 1435 tests pass | All tests pass |
| AC-REG-2 | TypeScript + ESLint clean | Test run: `npm run precheck` | PASS — recorded from main thread: 0 errors, 2 pre-existing warnings | 0 errors |

---

## Deliverables

| # | What | File |
|---|---|---|
| D1 | Add `dev-hosted-converting` + `dev-hosted-pending-verification` to `SCENARIO_FIXTURES` + `HOSTED_KEYS` | `app/admin/support/plans/_fixtures/plan-scenarios.ts` |
| D2 | Fix 4 LABEL_TO_ID bugs: wrong key for PENDING_VERIFICATION; missing entries for `dev-hosted-pending`, `dev-hosted-initial-provisioning`, and wrong label for `dev-hosted-provisioning` | `scripts/capture-plan-scenarios.ts` |
| D3 | Run `plans:capture` → commit 3 new baseline JSON files | `e2e/plans/captured/*.json` |

---

## Implementation Details

### Commit 1: Add missing scenario keys (D1)

**Files:**

- `app/admin/support/plans/_fixtures/plan-scenarios.ts` — add to `SCENARIO_FIXTURES`:
  - `"dev-hosted-converting": [SCENARIOS.PENDING]` — both CONVERTING substates map to PENDING
  - `"dev-hosted-pending-verification": []` — PENDING_VERIFICATION returns no plans
  - Add both to `HOSTED_KEYS`

### Commit 2: Fix LABEL_TO_ID (D2)

**Files:**

- `scripts/capture-plan-scenarios.ts` — fix `LABEL_TO_ID`:
  - `"HOSTED / PENDING_VERIFICATION — plans page shows nothing"` → was `"dev-hosted-pending"`, correct to `"dev-hosted-pending-verification"`
  - Add `"HOSTED / CONVERTING — PENDING 'Confirming your payment…'"` → `"dev-hosted-pending"`
  - Add `"HOSTED / initial-signup PROVISIONING — plans page shows nothing"` → `"dev-hosted-initial-provisioning"`
  - Fix `"HOSTED / PROVISIONING — plans page shows nothing"` → `"HOSTED / post-payment PROVISIONING — PENDING 'Setting up your store…'"` → `"dev-hosted-provisioning"`

### Commit 3: Capture baselines (D3)

Run locally using the platform's public JSON (no secret needed):

```bash
DEV_KEYS_FILE=../artisan-roast-platform/scripts/dev-scenario-keys.public.json \
npm run plans:capture
```

Review `git diff e2e/plans/captured/` — confirm 3 new files and no unexpected changes to existing
baselines. Commit.

---

## Verification & Workflow Loop

After plan approval:

1. **Commit plan to branch** — `git commit --no-verify -m "docs: add plan for plan-state-baseline-gaps"`
2. Register `verification-status.json`: `{ status: "planned", acs_total: 10 }`
3. Transition to `"implementing"` when coding begins

After implementation:

1. Transition to `"pending"`
2. Run `npm run precheck`
3. Spawn `/ac-verify` sub-agent — sub-agent fills the **Agent** column
4. Main thread reads report, fills **QC** column
5. If any fail → fix → re-verify ALL ACs
6. When all pass → hand off ACs doc to human → human fills **Reviewer** column
