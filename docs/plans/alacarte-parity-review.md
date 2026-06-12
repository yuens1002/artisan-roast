# /review report — alacarte-parity

**Branch:** `feat/alacarte-parity`
**Generated:** 2026-06-12
**Iterations to reach verified:** 2 (1 sub-agent pass + 1 QC iteration for AC-FN-3 inline import fix)

## Verdict

**Minor** — all 8 deliverables shipped, all ACs pass with invariant-asserting tests; one uncommitted fix (`actions.ts` top-level import) must be staged before PR, and one stale inline comment in ARCHITECTURE.md needs updating. Safe to proceed to human review after those two items land.

---

## Deliverables ↔ Code

> **Structural note:** No `alacarte-parity-plan.md` exists in-tree. The plan was authored in conversation context and never committed. Deliverables are derived from the ACs doc (`docs/plans/alacarte-parity-ACs.md`) and the branch diff. This is flagged for `/retro` routing.

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| D1 — SDK bump to v0.6.2 | `package.json`, `package-lock.json` | ✓ shipped |
| D2 — Remove local `AlaCartePackage`, re-export from SDK | `lib/license-types.ts:97-98` | ✓ shipped |
| D3 — `AddOnsResponseSchema.parse()` validation boundary | `lib/add-ons.ts:47` | ✓ shipped |
| D4 — `CheckoutResponse` typed from SDK | `app/admin/support/add-ons/actions.ts:4,78` | ✓ shipped (top-level import — in working tree, UNCOMMITTED) |
| D5 — Pools grant list rendering | `app/admin/support/add-ons/AddOnsPageClient.tsx` | ✓ shipped |
| D6 — `checkout.test.ts` → SDK scaffold refs | `app/admin/support/add-ons/__tests__/checkout.test.ts` | ✓ shipped |
| D7 — `AddOnsPageClient.test.tsx` (pools + empty state) | `app/admin/support/add-ons/__tests__/AddOnsPageClient.test.tsx` | ✓ shipped |
| D8 — `addons:capture` script wired to `package.json` | `scripts/capture-addon-scenarios.ts`, `package.json` | ✓ shipped |

### Code changes not tied to any deliverable

- **`lib/license.ts`** — `pools[]` added to TICKETS_5 (×3) and SESSIONS_2 (×2) mock entries. Necessary: `AlaCartePackage.pools` became a required field in SDK v0.6.2 — omitting it fails TypeScript. Defensible but unannounced; looks like scope creep in the diff. Should have been a named deliverable ("D9: Update mock fixtures to satisfy AlaCartePackage.pools required field").
- **`e2e/plans/captured/*.json` (4 files)** — Plans baseline refresh from commit `f558c4ba chore(plans): refresh prod capture baseline`. Predates alacarte work; included because it sits on the same branch. Not an alacarte deliverable.
- **`.claude/verification-status.json`** — expected workflow artifact.
- **`docs/plans/alacarte-parity-ACs.md`** — expected tracking doc.

---

## ACs ↔ Tests (Gate 3 spot-check)

| AC | Test file | Asserts invariant? | Notes |
|----|-----------|---------------------|-------|
| AC-TST-1 | `checkout.test.ts` | ✓ PASS | All 5 tests use `ALACARTE_SCENARIOS.TICKETS_5.id` — zero literal slug strings. Slug flows from SDK scaffold through `makeFormData` into the server action. |
| AC-TST-2 | `AddOnsPageClient.test.tsx:74-86` | ✓ PASS | Reads `ticketPool = ALACARTE_SCENARIOS.TICKETS_5.pools[0]`, asserts `` `${ticketPool.quantity} ${ticketPool.label}` `` — both values come from the SDK object, not hardcoded. If the SDK fixture changes, the test fails correctly. |
| AC-TST-3 | `AddOnsPageClient.test.tsx:88-94` | ✓ PASS | Pins literal `"No add-on packages available at this time."` — this is correct test discipline for an empty-state fallback message: the string IS the invariant being protected. A change to the message should break this test. |
| AC-TST-4 | Code review (`scripts/capture-addon-scenarios.ts`) | ✓ PASS | Script + `package.json` entry confirmed; correct endpoint + output path. |

No vacuously passing tests found.

---

## Docs drift

- **`docs/features/support-services/ARCHITECTURE.md:182`** — inline comment shows `AlaCartePackage` shape as `[{ id, label, price, checkoutUrl }]`. Missing `pools[]` which became a required field in SDK v0.6.2. The comment is now stale and will mislead future readers.

  Contradicting code: `lib/license-types.ts:97-98` re-exports `AlaCartePackage` from SDK; `lib/license.ts` populates `pools[]` on all entries.

  **Fix:** Update the comment to `[{ id, label, price, checkoutUrl, pools: AlaCartePool[] }]` or simply point to the SDK type.

- **`docs/plans/alacarte-parity-ACs.md:4`** — references `docs/plans/alacarte-parity-plan.md` which does not exist. The plan was never committed. Minor — a broken internal link in the ACs header.

---

## Recommendations

1. **Commit the `actions.ts` working tree fix before PR.** The top-level `import type { CheckoutResponse }` at `actions.ts:4` is in the working tree but not staged. Stage it alongside any other uncommitted alacarte changes in the `/commit` step.

2. **Update `docs/features/support-services/ARCHITECTURE.md:182`** — add `pools` to the `AlaCartePackage` inline comment so the architecture doc stays in sync with the SDK type.

3. **Flag `lib/license.ts` mock updates as a named deliverable in future plans** — when an SDK type bump adds required fields, the mock data update should be explicitly listed (e.g. "D9: Update fixtures to satisfy updated SDK type"). An unannounced code change that's required for TypeScript conformance is easy to miss in a diff review.

---

## Inputs for /retro

- **Route:** `/backend-architect` → `~/.claude/commands/backend-architect.md`
  **Draft principle:** *"Inline import type assertions (`(x) as import("pkg/sub").Type`) must be promoted to top-level named imports before committing. Flag any occurrence of `as import(...)` as a style violation during implementation, not in QC."*
  **Triggered by:** AC-FN-3 — `actions.ts` used an inline import assertion that survived into QC and required a working-tree fix after the sub-agent's first pass.

- **Route:** cross-cutting → `docs/templates/plan-template.md`
  **Draft pattern:** *"When a SDK version bump adds required fields to a shared type (e.g. `AlaCartePackage.pools`), list the in-repo mock/fixture update as a named deliverable (e.g. 'D9: Update mock fixtures to satisfy T.newField'). Omitting it produces an orphaned code change that reads as scope creep in the diff."*
  **Triggered by:** `lib/license.ts` pools update — defensible but unlisted.

- **Route:** cross-cutting → `docs/templates/plan-template.md` or `docs/AGENTIC-WORKFLOW.md`
  **Draft note:** *"The plan file must be committed to the feature branch before implementation begins (Step 0b). If the plan lives only in conversation context, the ACs doc's plan-ref link will be a dead link and the `/review` doc-drift scan will flag it every time."*
  **Triggered by:** `alacarte-parity-plan.md` never committed; dead link in ACs header.
