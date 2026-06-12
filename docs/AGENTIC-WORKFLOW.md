# Agentic Feature Workflow

A formalized, sub-agent-driven workflow for autonomous feature development with human-in-the-loop review gates.

## Overview

```text
INITIATE ──► PLAN ──► IMPLEMENT ──► VERIFY (sub-agent) ──► HUMAN REVIEW ──► RELEASE
  │            │                         │                      │
  │  branch    │   structured ACs        │   pass/fail report   │  pass → /release
  │  preflight │   become contract       │                      │  fail → back to IMPLEMENT
  │            └─────────────────────────┘──────────────────────┘
  └── register "planning"
```

The main thread (implementation agent) orchestrates. Verification is delegated to a sub-agent to protect context and enable parallelism. The human reviews a consolidated report and approves or rejects.

## When to Use This Workflow

**Use for:** Feature branches with UI or functional changes that benefit from structured verification.

**Skip for:** Docs-only changes, single-line fixes, config tweaks, dependency updates.

**Trigger:** The main thread decides when to invoke verification — it is NOT automatic on every code change. Typically invoked once after implementation is complete, then again after each fix iteration.

## Phase 0: Initiate Workflow

**Run before entering plan mode.** This registers the workflow so hooks are active from the start.

1. **Create feature branch**: `git checkout -b feat/{feature-name}` (skip if already on one)
2. **Dev server verified**: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → expect 200. If not reachable, ask human to start it.
3. **Admin login verified**: Navigate to `/auth/admin-signin`, fill credentials from MEMORY.md, confirm login succeeds. If it fails, STOP — credentials or auth system may need attention.
4. **Register `"planning"` status**: Create entry in `verification-status.json`:

   ```jsonc
   // .claude/verification-status.json → branches["{branch}"]
   {
     "status": "planning",
     "acs_passed": 0,
     "acs_total": 0,
     "tasks": [],
     "notes": "Workflow initiated. Entering plan mode."
   }
   ```

Only after all 4 checks pass does planning begin. The `"planning"` state activates session-start context injection while allowing stops and docs-only commits.

## Phase 1: Plan (with ACs)

Enter plan mode. Explore the codebase, design the approach, and produce a plan that includes a structured **Acceptance Criteria** section.

### AC Format — Structured What/How/Pass

ACs use three actionable columns instead of a vague description. This eliminates ambiguity and gives the sub-agent a concrete contract to verify against.

| Column | Purpose |
|--------|---------|
| **What** | The specific element, state, or behavior to verify (concrete, not vague) |
| **How** | Verification method — `Static` / `Interactive` / `Exercise` / `Code review` / `Test run` + specific steps |
| **Pass** | Explicit condition that must be true. The sub-agent checks THIS, not a vague description |

```markdown
## Acceptance Criteria

### UI (verified by screenshots)

| AC | What | How | Pass |
|----|------|-----|------|
| AC-UI-1 | Page `/admin/products/new` on initial load | Static: viewport screenshot immediately after page load | No red text, no pulsing dots, no "Required field" text, no error-colored elements visible in viewport |
| AC-UI-2 | Edit button in order row Actions column | Static: screenshot of order history table | Edit button visible only on rows where status badge shows "PENDING" |
| AC-UI-3 | Address modal after clicking Edit | Interactive: click Edit button on PENDING row → wait for dialog | Modal visible with address fields pre-populated (non-empty values in street, city, state, zip) |

### Functional (verified by code review + tests)

| AC | What | How | Pass |
|----|------|-----|------|
| AC-FN-1 | PATCH /api/user/orders/[id]/address request body | Code review: `app/api/user/orders/[id]/address/route.ts` → trace schema | Zod schema validates all address fields; invalid input returns 400 |
| AC-FN-2 | Auth guard on PATCH endpoint | Code review: same file → trace session check | Non-owner requests return 403; no session returns 401 |

### Regression (verified by test suite + visual spot-check)

| AC | What | How | Pass |
|----|------|-----|------|
| AC-REG-1 | Existing order history columns | Screenshot: compare with baseline | All original columns (Order #, Date, Status, Total) render unchanged |
| AC-REG-2 | Cancel button on PENDING orders | Screenshot: check Actions column on PENDING row | Cancel button still visible alongside new Edit button |
```

**Rules:**

- **What** must name a specific element, page, or code path — never a vague behavior
- **How** must specify the verification method and exact steps (see method table below)
- **Pass** must be a binary-checkable condition — the sub-agent checks this literally, not interpretively
- ACs are numbered with category prefix for traceability in reports

### How Column — Verification Methods for UI ACs

The **How** column is the verification contract. It tells the sub-agent exactly what method to use and the QC validator (`qc-validator.js`) enforces that evidence matches the method.

| Method | Format | Evidence required |
|--------|--------|-------------------|
| **Screenshot** | `Screenshot: {page/element at breakpoint}` | `.png` file path in Agent/QC columns |
| **Interactive** | `Interactive: {click/hover} → screenshot` | `.png` file path in Agent/QC columns |
| **Exercise** | `Exercise: {form flow} → screenshot` | `.png` file path in Agent/QC columns |
| **Code review** | `Code review: {file}` | `file:line` refs (no screenshot needed) |

**Screenshot method rules:**

- `Screenshot:`, `Interactive:`, and `Exercise:` are the **default** for UI ACs — use these unless the AC genuinely cannot be screenshotted (e.g., server redirect, route registration, build config)
- **At least 50% of UI ACs must use screenshot-based methods.** If all say `Code review:`, the plan is missing visual verification and the QC validator will reject it.
- The sub-agent MUST produce `.png` evidence for screenshot-method ACs. Code-only evidence for a `Screenshot:` How will be flagged by the validator.
- Use `Code review:` only for non-visual ACs (redirects, route config, type definitions)

### Plan Approval

Human reviews the plan and ACs. On approval, ACs become the **verification contract** — the sub-agent will verify exactly these criteria, nothing more, nothing less.

**After approval, the human can step away.** The implement → verify → iterate loop runs autonomously. The human is only needed again at the final review gate (Phase 5).

### ACs Tracking Doc

After plan approval, create the ACs tracking doc from the template (`docs/templates/acs-template.md`) → save as `docs/plans/{feature}-ACs.md`. This doc has three verification columns:

| Column | Filled by | When |
|--------|-----------|------|
| **Agent** | Verification sub-agent | During `/ac-verify` — PASS/FAIL with brief evidence |
| **QC** | Main thread agent | After reading sub-agent report — confirms or overrides |
| **Reviewer** | Human (reviewer) | During manual review — final approval per AC |

## Phase 2: Implement (main thread)

The main thread implements the approved plan (pre-flight checks already passed in Phase 0):

1. Create feature branch
2. Write code per plan
3. Track progress with task list (TaskCreate/TaskUpdate)
4. Run `npm run precheck` after each logical chunk
5. Fix any TS/ESLint errors immediately

**Exit criteria:** All planned code changes complete, precheck passes.

## Phase 3: Verify (sub-agent)

When implementation is complete, the main thread spawns a verification sub-agent.

### How to Trigger

The main thread uses the Task tool to spawn a `general-purpose` sub-agent with the `/ac-verify` skill prompt template:

```text
Task(subagent_type="general-purpose", prompt="""
Run /ac-verify with these parameters:

ACs:
- AC-UI-1: Ship To column visible in order history at all breakpoints
- AC-UI-2: Edit button appears only for PENDING orders
- AC-FN-1: PATCH endpoint validates address with Zod
...

Pages to screenshot:
- /account (order history tab)

Dev server: http://localhost:3000

Additional context:
- The Edit button should only appear in the Actions column for PENDING orders
- Modal should pre-populate from order.shippingAddress fields
""")
```

### What the Sub-Agent Does

1. **UI ACs**: Takes screenshots at mobile/tablet/desktop, reads each screenshot, verifies each UI AC
2. **Functional ACs**: Reviews code for the specific behaviors (endpoint validation, auth checks, error handling)
3. **Regression ACs**: Runs test suite, spot-checks screenshots for unchanged elements
4. **Returns**: Structured verification report

### ACs Doc Update

The sub-agent fills the **Agent** column in the ACs tracking doc (`docs/plans/{feature}-ACs.md`). If no ACs doc exists, the sub-agent returns an inline report.

Example ACs doc after sub-agent verification:

```markdown
## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-1 | Ship To column in order table | Static: screenshot at 3 breakpoints | Column visible with address text at all breakpoints | PASS — visible at all 3 | | |
| AC-UI-2 | Edit button in Actions column | Static: screenshot of table rows | Button visible only on PENDING rows | FAIL — button shows on all rows | | |
```

See `docs/templates/acs-template.md` for the full template format.

## Phase 4: Main Thread Reads Report (QC)

The main thread receives the sub-agent's report (reads the **Agent** column in the ACs doc):

- **For each AC:** Confirm or override the sub-agent's result in the **QC** column
- **All ACs pass** → Update `verification-status.json` → Present report to human
- **Any AC fails** → Fix code in main thread, note fixes in QC Notes section → Re-spawn sub-agent to re-verify ALL ACs
- **Repeat** until every AC passes

**This loop is fully autonomous — the human does not need to be present during implement/verify/iterate cycles.**

### QC Protocol (MANDATORY — do not skip)

The main thread MUST independently verify every AC:

1. **Read every screenshot** the sub-agent captured — do not skip any
2. **For each UI AC**: Check the screenshot against the **Pass** column criteria yourself. Do NOT just echo the sub-agent's finding.
3. **Write your own evidence** in the QC column — do not copy-paste the Agent column
4. **If sub-agent says PASS but you see a failure**: Mark QC as FAIL, describe what you see, and fix the code
5. **If in doubt**: Mark as FAIL. It's better to re-verify than to rubber-stamp.

### Updating Verification Status

```jsonc
// .claude/verification-status.json
{
  "branches": {
    "feat/order-ship-to-edit": {
      "status": "verified",        // "verified" | "partial" | "pending"
      "acs_passed": 9,
      "acs_total": 9,
      "tasks": [],
      "notes": "All 9 ACs verified via sub-agent report. 0 iterations needed."
    }
  }
}
```

The pre-commit hook reads this file and blocks commits unless `status === "verified"`.

## Phase 4.5: /review (REQUIRED before PR)

**This step is mandatory.** The pre-PR hook (`pre-pr-via-release-node.js`) enforces it — `gh pr create` is blocked unless `docs/plans/{feature}-review.md` exists.

Run `/review` after all ACs are QC-passed (`verified` status). It produces a consolidated report covering:

1. **Deliverables ↔ code** — every plan deliverable has a code reference; no orphaned changes
2. **AC ↔ test spot-check** — named test asserts the invariant, not a vacuous literal
3. **Docs drift** — code changes don't leave stale claims in CLAUDE.md, READMEs, or architecture docs
4. **Recommendations** — pre-routed lessons for `/retro`

The report is written to `docs/plans/{feature}-review.md`. Once that file exists, the PR-creation gate lifts automatically.

**Exception:** `--docs-only` PRs skip the review gate (no code to review).

## Phase 5: Human Review

The main thread presents the ACs tracking doc and the `/review` report to the human. The **Agent** and **QC** columns are already filled. The human fills in the **Reviewer** column.

```text
## Ready for Review

### Summary
- Branch: feat/order-ship-to-edit
- Files changed: 5
- ACs: 9/9 passed
- Tests: 694/694 passed
- Iterations: 1

### ACs Tracking Doc
docs/plans/{feature}-ACs.md
Please review and fill in the Reviewer column.

### Next Steps
- Approve → I'll commit, create PR, and release
- Reject → Tell me what to fix, I'll iterate
```

**Human decision:**

- **Approve** → Main thread commits, creates PR, runs `/release`
- **Reject with feedback** → Main thread fixes, re-verifies (back to Phase 3)

### 3-Column Handoff

The ACs doc serves as the single source of truth across all three participants:

| Phase | Who fills | Column |
|-------|-----------|--------|
| Verification (Phase 3) | Sub-agent | **Agent** — PASS/FAIL with evidence |
| QC (Phase 4) | Main thread | **QC** — confirms/overrides Agent, notes fixes |
| Review (Phase 5) | Human | **Reviewer** — final sign-off per AC |

Templates: `docs/templates/plan-template.md`, `docs/templates/acs-template.md`

## Phase 6: Release

On approval, the main thread runs the standard release workflow:

**Phase A (on the feature branch):**

1. Commit implementation (pre-commit hook passes because verification-status is "verified")
2. Run `/review` → produces `docs/plans/{feature}-review.md` (pre-PR hook requires this)
3. Run `/release <patch|minor|major>` — bumps `package.json`, updates `CHANGELOG.md`, commits `bump version to X.Y.Z` (the fingerprint the pre-PR hook checks)
4. Push + create PR (hook verifies: fingerprint commit AND review doc present)
5. Wait for CI + Copilot review; address all comments; resolve all threads
6. Merge PR

**Phase B (on main after merge):**

1. `git checkout main && git pull`
2. Run `/release <patch|minor|major>` again — creates the annotated git tag, pushes it, and (for minor/major) creates the GitHub Release that triggers the in-app upgrade notice

## Sub-Agent Architecture

### Why Sub-Agents?

| Concern | Main thread | Sub-agent |
|---------|-------------|-----------|
| Context window | Protected — screenshots don't bloat it | Disposable — screenshots consumed and discarded |
| Parallelism | Can continue working while verification runs | Runs independently |
| Specialization | Feature design + implementation | Verification protocol |
| Iteration | Fixes code, re-spawns fresh verifier | Always starts clean |

### Sub-Agent Boundaries

The verification sub-agent:

- **CAN**: Read files, take screenshots, run tests, read screenshots, produce reports
- **CANNOT**: Edit files, write code, make commits, push branches
- **RECEIVES**: AC list, pages to screenshot, dev server URL, additional context
- **RETURNS**: Structured pass/fail report with evidence

### Parallelism

For features with both UI and code-only changes, the main thread can spawn two sub-agents in parallel:

```text
Task(subagent_type="general-purpose", prompt="Verify UI ACs: ...")    ─┐
Task(subagent_type="general-purpose", prompt="Run test suite...")      ─┤── parallel
                                                                        │
Main thread reads both reports when complete                           ─┘
```

## Skill Reference

| Skill | Phase | Purpose |
|-------|-------|---------|
| Workflow initiation | 0 | Branch, pre-flight checks, register `"planning"` |
| Plan mode | 1 | Explore + design + produce ACs |
| `/ac-verify` | 3 | Sub-agent verification template |
| `/ui-verify` | 3 | Screenshot capture + comparison (used by sub-agent) |
| `/verify-workflow` | 2-4 | Full orchestration (when running without sub-agents) |
| `/release` | 6 | Version bump + tag + PR |
| `/retro` | Post-session | Capture process lessons → update skills, templates, validators |

## Learning Loop

When a session reveals a process gap (not a code bug), run `/retro` to capture the lesson and apply durable fixes. The retro protocol:

1. **Identify** what went wrong and why the system allowed it
2. **Classify** which layers need fixing (skill, template, validator, workflow doc)
3. **Apply** concrete, enforceable changes to each layer
4. **Test** validator changes, trace skill changes through the failure scenario
5. **Log** the lesson in `.claude/skills/retro/retro-log.md`

Future sessions automatically benefit because skills, templates, and validators are loaded at session start. The retro log serves as an audit trail of what was learned and when.

## Quick Reference

```text
# Standard feature flow
0. Initiate workflow → branch, pre-flight, register "planning"
1. Enter plan mode → produce plan with ACs → human approves → register "planned"
2. Implement on feature branch
3. Spawn verification sub-agent with ACs
4. Read report → fix if needed → re-verify
5. Present report to human → approve/reject
6. Commit → PR → merge → /release

# Code-only feature (skip UI verification)
- Same flow, but AC-UI section is empty
- Sub-agent only runs code review + tests

```

## Emergency Override (Human Authorization Required)

For critical hotfixes where the full verification loop would cause unacceptable delay:

1. **Get explicit human approval** to skip verification
2. Implement the fix
3. Manually set verification-status to `"verified"` with notes: `"EMERGENCY: {reason}, authorized by {human}"`
4. Commit → PR → merge → /release

This is a last-resort escape hatch, NOT a convenience shortcut. If Claude suggests this path, the human must explicitly authorize it.

## Process Loop & State Machine

The workflow is enforced by a state machine tracked in `verification-status.json`. Each state controls what hooks allow or block.

```text
  ┌─────────┐  initiate   ┌──────────────┐   plan       ┌──────────────┐
  │ (start) │────────────>│  planning     │──approved───>│   planned    │
  └─────────┘             └──────────────┘              └──────┬───────┘
                                                               │
                                                          implement
                                                               │
                              ┌───────────┐              ┌─────v────────┐
                              │  verified  │<──all done──│ implementing │
                              └─────┬─────┘              └─────┬────────┘
                                    │                          │
                               commit/PR               ┌──────v─────┐
                                                       │  pending   │
                                                       └──────┬─────┘
                                                              │
                                                        ┌─────v──────┐
                                                        │  partial   │──fix──> (back to pending)
                                                        └────────────┘
```

| State | Intermediate commits | Final commit | Stop hook |
|-------|---------------------|-------------|-----------|
| `planning` | Allowed | Blocked | Allows (reminds to produce plan) |
| `planned` | Allowed | Blocked | Allows (reminds to implement) |
| `implementing` | Allowed | Blocked | Allows (reminds to verify) |
| `pending` | Blocked | Blocked | **Blocks** — must verify |
| `partial` | Blocked | Blocked | **Blocks** — must complete verification |
| `verified` | Allowed | Allowed | Allows |

### State Transitions

| Transition | Who | When |
|-----------|-----|------|
| (none) → `planning` | Main thread | When feature workflow starts (before plan mode) |
| `planning` → `planned` | Main thread | After plan approved + committed + ACs doc created |
| `planned` → `implementing` | Main thread | When coding begins |
| `implementing` → `pending` | Main thread | After all code written + precheck passes |
| `pending` → `partial` | Sub-agent / verify-workflow | After partial AC verification |
| `pending`/`partial` → `verified` | Sub-agent / verify-workflow | After all ACs pass |

## Branch & Commit Protocol

Full workflow for AC-driven features:

1. **Create feature branch** from `main`
2. **Register** `verification-status.json` entry with status `"planning"` and `acs_total: 0`
3. **Pre-flight checks**: Dev server reachable, admin login works
4. **Plan** on the branch (explore codebase, produce plan with ACs)
5. **Commit the plan**: `git commit --no-verify -m "docs: add plan for {feature}"`
6. **Update** `verification-status.json` to `"planned"` with `acs_total` = AC count
7. **Transition** to `"implementing"` when coding begins
8. **Follow the commit schedule** defined in the plan (intermediate commits allowed)
9. **Transition** to `"pending"` when implementation is complete
10. **Run verification** → transitions to `"verified"`
11. **Final commit** + PR

### Commit Schedule Convention

Plans must include a commit schedule section:

```markdown
## Commit Schedule
1. Plan commit: `docs: add plan for {feature}` (after plan approval)
2. API route: `feat: add PATCH endpoint` (after route + validation)
3. Client UI: `feat: add dialog component` (after UI changes)
4. Verification: `chore: update verification status` (after all ACs pass)
```

## Enforcement Hooks

| Hook | Event | File | Purpose | Blocks? |
|------|-------|------|---------|---------|
| Session awareness | SessionStart | `session-start-loop-node.js` | Injects process loop context at session start | Context injection (exit 2) |
| Stop gate | Stop | `verify-before-stop-node.js` | Prevents declaring done without verification | Yes (`pending`/`partial`) |
| Commit gate | PreToolUse (Bash) | `verify-before-commit-node.js` | Prevents commits in unverified states | Yes (`pending`/`partial`) |

### How They Work Together

1. **Session starts** → SessionStart hook reads branch status, injects context message
2. **During implementation** → Stop hook allows, commit gate allows intermediate commits
3. **Implementation complete** → Main thread sets status to `"pending"`
4. **Claude tries to stop** → Stop hook blocks, tells Claude to run verification
5. **Claude tries to commit** → Commit gate blocks, tells Claude to verify first
6. **Verification passes** → Status set to `"verified"`, all hooks allow

## Files

| File | Shared | Purpose |
|------|--------|---------|
| `.claude/settings.json` | Yes | Hook registration (SessionStart, PreToolUse, Stop) |
| `.claude/settings.local.json` | No | Personal bash allow-list |
| `.claude/hooks/session-start-loop-node.js` | Yes | SessionStart workflow context injection |
| `.claude/hooks/verify-before-stop-node.js` | Yes | Stop gate — blocks premature completion |
| `.claude/hooks/verify-before-commit-node.js` | Yes | Pre-commit verification gate |
| `.claude/verification-status.json` | No | Per-branch AC tracking |
| `.claude/skills/ac-verify/SKILL.md` | Yes | Verification sub-agent prompt template |
| `.claude/skills/verify-workflow/SKILL.md` | Yes | Full workflow orchestration |
| `.claude/skills/ui-verify/SKILL.md` | Yes | Screenshot capture + comparison |
| `.claude/skills/release/SKILL.md` | Yes | Release workflow |
| `docs/AGENTIC-WORKFLOW.md` | Yes | This document |
