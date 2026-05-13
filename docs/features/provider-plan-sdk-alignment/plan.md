# Provider Plan SDK Alignment — Plan

## Goal

Make the store's plan rendering **provably correct** for every plan in every state, and **drift-resistant** against changes in the SDK or the provider resolver. Build the testing harness that proves it, and document the cross-repo contract.

> **Read first:** [`architecture.md`](architecture.md) — testing layers, drift surfaces, per-field data ownership, role separation (SDK / Provider / Store), and decisions log.

## Context

Sessions 1–5 (now in `archive/`) shipped the foundation: SDK-driven types, provider-driven cards, scenario corrections. Session 5 stalled on the "is the data faithful to prod?" question because the testing strategy couldn't separate **renderer correctness** (does the component project a typed input correctly?) from **resolver fidelity** (does prod actually return what we think it returns?). This rebuild splits the two and adds explicit cross-repo coordination for SDK and provider concerns.

## Sessions

### Session 1 — Testing harness + architecture (this rebuild)

**Branch:** `feat/plan-scenario-harness` (proposed; current `feat/plan-scenario-corrections` will be reset off main).
**ACs:** [`session-1/ACs.md`](session-1/ACs.md) — 17 ACs.

**Deliverables (store-side):**

1. **Formatter extraction.** Pull inline transforms out of `PlanPageClient.tsx` into pure functions in `formatters.ts` — date formatters, price formatters, pool count composer, days-remaining pluraliser. Each unit-tested in `__tests__/formatters.test.ts`.
2. **`PoolCtaMenu` shared helper.** Extract the 3-dot dropdown logic out of `ActiveCard`. Reuse in `TrialCard` and `ExpiredCard`. Respect `action.disabled` (disable menuitem) and render `action.disabledReason` as tooltip. Closes the pool-CTA-missing-from-Trial/Expired gap.
3. **Layer 2 — Component contract tests.** Restructured: one common-fields suite parameterized over states (covers shared field projections including `pool.cta`, `action.disabled`, `modalSlug` wiring, `iconBefore/After` positioning), plus per-state files for state-unique behavior, plus `confirm-action-dialog.test.tsx` for the modal's field contract, plus `plan-page-client.test.tsx` for page composition. How column asserts Presence / Absence / Placement on every row.
4. **Layer 3 — SDK SCAFFOLD pin.** Snapshot every imported `SCENARIOS.*` with date normalisation.
5. **Layer 4 — Captured-payload Jest tests.** `npm run plans:capture` + `__tests__/captured-payloads.test.tsx`. Includes cross-field consistency assertions (`quotas[].limit === pools[].limit`, `action.modalSlug` resolves in `actionModals[]`). Plus opt-in MCP cross-check (`npm run plans:validate`).
6. **Layer 5 — Playwright plumbing test.** One spec at `e2e/plans/plumbing.spec.ts`.
7. **Layer 6 — Visual screenshot harness.** Single script (`scripts/screenshot-plan-scenarios.ts`).
8. **Dev override.** `?scenario=<key>` on `/admin/support/plans`.
9. **Minimum observability.** Three small logging hooks in `lib/plans.ts`: structured `[plans.fetch.failed]` log on boundary errors; `[plans.empty.unexpected]` warning when a valid license returns zero plans; the captured-JSON git-log timestamps as implicit "last verified against prod" recency signal. ~30 lines total, no new deps.
10. **Architecture doc + plan + ACs.**

**Out of scope:**

- New `PlanState` variants (e.g. `CONVERTING`).
- ConversionModal component.
- Stripe link seeding.
- Any provider-side or SDK-side code changes (these are filed as cross-repo items below).

**Definition of done:**

- All 17 ACs in `session-1/ACs.md` pass.
- `npm run typecheck`, `npm run test:ci`, `npm run test:e2e` all green.
- `npm run plans:capture` runs successfully against the provider for at least the self-hosted dev keys; captured JSONs committed.
- AC-DRIFT sub-rows verified (each layer demonstrably catches a synthetic regression).

### Session 2 — PENDING state + payment-loop modal + ride-alongs

> ⚠️ **Reframed since first draft.** Originally scoped as "CONVERTING plan state + ConversionModal". Corrected: **CONVERTING is the payment-loop modal spec, not a plan state**; **`PENDING` is the plan state** during provisioning (PlanCard renders a PendingCard, not `null`); `actionModals[]` → discriminated union `(FeedbackFormModal | PaymentConfirmModal)[]` (breaking rename of `ConfirmActionConfig`). The headings/details below + `session-2/ACs.md` still carry the old framing in places — both get corrected on the Session 2 feat branch. Source of truth for the corrected spec: project memory `project_session2_reframe_and_sdk_handoff.md`.

**Status:** planned, reframed. ACs drafted (need the reframe applied) — see [`session-2/ACs.md`](session-2/ACs.md).

**Scope (corrected):** Add the `PENDING` plan state across SDK → provider → store (plan card = NONE-shaped with status copy + "Check Status" CTA + spinner during poll, cycles PENDING→PENDING→ACTIVE). Add the `paymentConfirm` modal (confirm → non-dismissable spinner + status, triggered by the subscribe/convert action). Plus two ride-alongs that close deferred items: **ST-2** (`ConfirmActionDialog` field coverage — now covers both `feedbackForm` + `paymentConfirm` variants) and **ST-3** (page-level composition tests).

**Locked design decisions (from planning):**

- **SDK bump = minor (v0.5.0).** Adding a union member breaks `switch(state.status)` exhaustiveness in consumers — minor is the honest bump.
- **MCP version fix bundled in.** SDK-RFC-MCP-VER (wire `serverInfo.version` to the package version) ships in the same SDK PR as CONVERTING — both are SDK changes.
- **Conversion UX is modal-only — no Card.** `PlanCard` returns `null` for CONVERTING; a full-screen `ConversionModal` owns the UX. The page freezes behind it (scroll lock + `pointer-events-none` + dim) so the customer can't navigate or interact mid-transition. (Card-vs-modal amounts to the same backend work; modal-only is the safer UX during a state transition.)
- **Ride-alongs ST-2 + ST-3 are in.** We're writing `conversion-modal.test.tsx` anyway; the modal/dialog test patterns transfer to `confirm-action-dialog.test.tsx`. And the modal needs page-level integration tests, so `plan-page-client.test.tsx` lands too.

**Cross-repo deliverables:**

| Repo | Deliverable |
|------|-------------|
| `artisan-roast-sdk` | Add `ConvertingState` to `PlanState` union (`status: "CONVERTING"`, `statusInfo?: StatusInfo`, optional `startedAt?`). No `actions[]`/`pools[]` — purely transient. Add CONVERTING scaffold to `SCENARIOS`. Update `validate_plan_payload` Zod schema. **Bundle SDK-RFC-MCP-VER.** Tag **v0.5.0**, push. |
| platform | Resolver branch emits CONVERTING during the conversion window (post-Stripe-webhook, pre-provision-to-ACTIVE). Wire trial-conversion endpoint. Seed `dev-hosted-converting`. Regenerate `.dev-scenario-keys` as id-keyed JSON (removes the store's `LABEL_TO_ID` table). Bump SDK ref to `#v0.5.0`. Deploy. |
| `artisan-roast` (store) | Bump SDK ref to `#v0.5.0`. `PlanCard` dispatch handles CONVERTING → returns `null`. New `_components/ConversionModal.tsx` — non-dismissable overlay, spinner + `statusInfo.descText`, polls `router.refresh()` every ~5s, closes when no plan is CONVERTING. Page freeze in `PlanPageClient`. Add `dev-hosted-converting` to `_fixtures/plan-scenarios.ts` + `ALL_KEYS`. New `__tests__/contract/conversion-modal.test.tsx`. Ride-alongs: `confirm-action-dialog.test.tsx` (ST-2), `plan-page-client.test.tsx` (ST-3). Capture `dev-hosted-converting.json` after the provider deploys. |

**Sequencing (enforced by `STRICT_KEYS=1` in the drift nightly):** SDK PR + tag → platform PR + deploy → store PR (last — its AC-CAP-CONVERTING capture would skip the scenario and hard-fail until the provider is live).

**New decisions to add to `architecture.md` when this lands:**

- **D14** — CONVERTING is the first `PlanState` variant with no `actions[]` and no `pools[]`. Purely transient. The renderer shows nothing in the card slot; the modal owns it.
- **D15** — Conversion UX is modal-only (no Card render) to prevent navigation/interaction during the state transition. The page is frozen behind a non-dismissable overlay.

### Session 3+ — TBD

Future sessions add features (e.g. payment-failed handling, additional plan tiers, currency support beyond USD, runtime boundary validation when self-hosted launches). Each extends the harness with new tests for the new fields and states.

## Cross-repo coordination

Anything that requires SDK or provider changes is filed as a **prereq** in the relevant repo *before* a store-side session opens. The store repo never patches around provider bugs or SDK gaps; it surfaces them via failing tests and waits for the upstream fix.

### Filed SDK enhancements (cross-repo RFCs)

| Item | Origin | Status | Notes |
|------|--------|:------:|-------|
| SDK-RFC-MCP-VER | architecture.md §9 — MCP `serverInfo.version` hardcoded `"0.2.0"` while SDK is at 0.4.1+ | **Bundle with next SDK touch during Session 1** | Wire MCP's reported version to the SDK npm package version (read from `package.json` at build time, or share a constant). Prerequisite for any future version-handshake mechanism. Small change, batch with other SDK work that happens in parallel with this session. |
| SDK-RFC-1 | D10 — `quotas[].cadence` field | TBD | Add `cadence?: "month" \| "year" \| "one-time"` so the store can render quota cadence deterministically and the provider can model replenishment uniformly. |
| SDK-RFC-2 | D11 — Pools optional on every state | TBD | Extend SDK so `pools?: UsagePool[]` is allowed on NoneState / InactiveState / CancelledState too. Enables modelling residual addon credits without the today-pattern hack (FREE → ACTIVE state). |

### Filed provider enhancements

| Item | Origin | Status | Notes |
|------|--------|:------:|-------|
| PLAT-1 | §10 — Plan business spec validation | TBD | Provider should have a test suite that asserts each shipped plan's resolver output matches its product spec (Priority Support = 5 tickets / 1 session / $49 / $39 sale label, etc.). Status visible to store as a CI badge or release-note item. |
| PLAT-2 | §10 — Cadence enforcement tests | TBD | Provider should have time-dependent tests that verify pool replenishment fires on the correct boundary (month, week, etc.). Cannot be verified from store-side captures. |

### Trigger-points for capture refresh

| Type of change | Where it lands | Store-side response |
|----------------|---------------|--------------------|
| New SDK type field (required) | `artisan-roast-sdk` PR | TypeScript fails → bump SDK → update factories + contract tests |
| New SDK SCAFFOLD value | `artisan-roast-sdk` PR | SCAFFOLD pin diffs → review and accept |
| Resolver branch change | Provider repo PR | `npm run plans:capture` → review diff → commit |
| Plan content edit (admin) | Provider admin UI | `npm run plans:capture` → review diff → commit |
| New plan state variant | SDK + provider PR | Wait for both → new store session adds renderer + tests |

## Cleanup of session-5 work in progress

Before Session 1 implementation begins:

1. **Preserve in stash or branch** any tactically valuable code from current `feat/plan-scenario-corrections`. The four session-5 commits touch renderer behavior; some fixes may be valuable, some superseded by the new architecture:
   - `35a847bb` — `CancelledCard` daysRemaining rendering → valuable; aligns with AC-CT-CANCELLED.
   - `b765736f` — pool CTAs to 3-dot in ActiveCard header → superseded by the cleaner `PoolCtaMenu` extraction.
   - `1ebe111a` — `?licenseKey=` dev override → superseded by `?scenario=` but pattern carries.
   - `406836fe` — multiple scenario corrections → individually re-evaluated against new ACs.
2. **Reset** the four commits off the branch (or branch fresh from `main` for `feat/plan-scenario-harness`).
3. **Delete** the seven untracked throwaway scripts (`screenshot-plan-scenarios-v2.ts`, `screenshot-plan-states.ts`, `screenshot-plans-all-states.ts`, `screenshot-plans-platform.{ts,js}`, `verify-plans-session5{,-v2}.mjs`).
4. **Move** `.claude/verification-status.json` entry: drop `feat/plan-scenario-corrections` or move to `planning` for the new branch with `acs_total: 17` matching `session-1/ACs.md`.

The additive harness work already on the branch (`__tests__/contract/*` from earlier this session, `sdk-scaffold-pins.test.ts`, `fixtures/plan-scenarios.ts`, `capture-plan-scenarios.ts`, `e2e/plans/scenarios.spec.ts`, `?scenario=` override in `page.tsx`, etc.) is partially aligned with the new architecture but needs restructuring:

- Per-state contract files need to be de-duplicated into a common-fields suite + state-unique files.
- Formatter extraction needs to be done first; existing tests reworked to use them.
- `e2e/plans/scenarios.spec.ts` (Playwright captured-payload) is being replaced by Jest-based `__tests__/captured-payloads.test.tsx` plus the thin `plumbing.spec.ts`.

## Deferred work tracker

Items split out of Session 1 that need to land before, during, or after Session 2 / future work. Updated when picked up.

### Store-side (this repo)

| ID | Title | Why deferred | Picks up in |
|----|-------|--------------|-------------|
| ST-1 | AC-CT-COMMON restructure | Existing 6 per-state contract files cover the ship-gating surface; consolidation into a common-fields suite + slim per-state files is a polish refactor. Cheaper to bulk-migrate after a 3rd batch of states accrues. | Future — explicitly NOT Session 2 |
| ST-2 | AC-CT-MODAL — `confirm-action-dialog.test.tsx` | `ConfirmActionConfig` field coverage. Modal/dialog test patterns transfer from Session 2's `conversion-modal.test.tsx`. | **Session 2 (ride-along)** — see `session-2/ACs.md` AC-CT-MODAL |
| ST-3 | AC-CT-PAGE — `plan-page-client.test.tsx` | Page composition, ordering, empty state, warnings banner — and the CONVERTING-plan → ConversionModal-mounted integration test, which Session 2 needs anyway. | **Session 2 (ride-along)** — see `session-2/ACs.md` AC-CT-PAGE |
| ST-4 | AC-CAP — Captured-payload Jest test | Replace `e2e/plans/scenarios.spec.ts` (deleted) with a Jest-driven version that loads `e2e/plans/captured/*.json` (now committed — baseline + nightly drift workflow shipped in v0.107.2). Structural + cross-field assertions. MCP-backed `npm run plans:validate` optional cross-check. | Follow-up branch (captures now exist) |
| ST-5 | AC-PW — Playwright plumbing spec | Smoke test for Next.js wiring. The `fix/e2e-mock-resolved-plans` work (mock serves `/api/plans/resolved`) unblocks this — the mock infra it needs now exists. | Follow-up branch |
| ST-6 | AC-DRIFT — drift-injection ritual | Per-layer manual verification that each test layer can detect a synthetic regression. | Verification pass per session (Session 2's ACs include AC-DRIFT) |
| ST-7 | Compatibility-over-time (§9.4 work) | Boundary validation, version handshake headers, admin version banner, graceful renderer FallbackCard for unknown shapes. `architecture.md` D13 — signal-triggered, not timeline-triggered. Note: CONVERTING (Session 2) adds a union member; the renderer's `switch` gains a CONVERTING case — but a *future* unknown state would still fall through. The FallbackCard is the guard for that. | Self-hosted launch / first skew incident |
| ST-8 | Architecture doc relocation | Move (or copy + adapt) `architecture.md` to a cross-repo location (provider's `appendix/cross-repo/`). Note: `yuens1002/artisan-roast-platform#74` (`docs: pools-architecture scoping; close out provider-sdk-integration`) is in flight on that side — coordinate so the cross-repo doc home is settled there, then point the store excerpt at it. | After `yuens1002/artisan-roast-platform#74` lands |
| ST-9 | Currency support beyond USD | Renderer hardcodes `$`; SDK type allows any ISO 4217 code. Multi-currency rendering is a future feature. | Future session |
| ST-10 | Remove `LABEL_TO_ID` from `capture-plan-scenarios.ts` | The store maps platform's `.dev-scenario-keys` labels → dev-key ids via a hardcoded table because the platform's `seed-dev-scenarios.ts` writes labels as comments. Once the platform regenerates that file as id-keyed JSON (filed as PR-SEED-CONVERTING in Session 2), the table goes away. | Session 2 cleanup (after platform regenerates `.dev-scenario-keys`) |

### Provider-side (separate repo)

These belong in the provider repo's plan docs. Filed here so cross-repo context isn't lost.

| ID | Title | Notes |
|----|-------|-------|
| PR-1 | Session 2 resolver: emit CONVERTING state | New branch in `PlanState` resolver during conversion window. Pairs with store-side ConversionModal. **Session 2 — see `session-2/ACs.md` PR-CONVERTING-RESOLVER.** |
| PR-2 | Seed `dev-hosted-converting` scenario | Dev license key + HostedTrial row with `status: CONVERTING`. **Session 2 — see `session-2/ACs.md` PR-SEED-CONVERTING. Also: regenerate `.dev-scenario-keys` as id-keyed JSON to retire ST-10.** |
| PR-3 | PLAT-1 — Plan business spec validation tests | Provider-side test suite asserts each shipped plan's resolver output matches its product spec (Priority Support = 5 tickets / 1 session / $49 / $39 sale label, etc.). |
| PR-4 | PLAT-2 — Cadence enforcement tests | Time-dependent tests verify pool replenishment fires on month boundary. |
| PR-5 | Stripe link IDs in dev seed | Seed `stripeExtendLinkId`, `stripeSubscribeLinkId` + delete-trial modal entry for hosted dev scenarios. (Resolves session-5 SKIP findings P4-related in dev only; prod already has real links.) |
| PR-6 | Version handshake response headers | Echo `X-Provider-SDK-Version` for store-side runtime drift detection. Deferred with §9.4 — signal-triggered, not timeline-triggered. |
| PR-7 | Document the resolver's branch logic as a spec | Today: `route.ts` source is the only spec. A separate `docs/plans/resolver-spec.md` (or similar) would document each branch's preconditions, output shape, and rationale. Pairs with PLAT-1 (spec validation tests). Not blocking ship; helpful for cross-repo onboarding. |
| PR-8 | P8 — rename "Everything in Community Roast" → "Everything in Community" | House-blend's `details.benefits.activeItems` still references the old FREE-plan name ("Community Roast" → now "Community"). Content-only DB change. **In progress (platform).** The store baseline correctly captures the current copy; when the DB change ships, the nightly drift detector flags the change, the store re-captures, baseline updates. No store-side code change. |

> **Already landed (platform):** `yuens1002/artisan-roast-platform#72` (`feat(resolver): plan scenario corrections + free→NONE + buildPoolsFromQuotas fix`) — merged 2026-05-11, deployed. `yuens1002/artisan-roast-platform#73` (`chore: unblock pre-commit + gitignore session state`) — merged 2026-05-11, handled the `.dev-scenario-keys` / `.claude/` gitignore concern. `yuens1002/artisan-roast-platform#74` (`docs: pools-architecture scoping`) — open, platform-side doc work.

### SDK-side (separate repo)

| ID | Title | Status |
|----|-------|--------|
| SDK-RFC-MCP-VER | Wire MCP `serverInfo.version` to SDK package version | **Session 2 — bundled into the SDK v0.5.0 PR with SDK-RFC-3** (both are SDK changes; ship together) |
| SDK-RFC-1 | `quotas[].cadence` field (`"month" \| "year" \| "one-time"`) | Future — enables deterministic cadence rendering |
| SDK-RFC-2 | `pools?: UsagePool[]` on every state (NoneState / InactiveState / CancelledState) | Future — removes the today-pattern hack of putting FREE in ACTIVE state just to attach addon pools |
| SDK-RFC-3 | Add CONVERTING state to `PlanState` union | **Session 2 — bundled with SDK-RFC-MCP-VER → tag v0.5.0** (minor: union member breaks consumer `switch` exhaustiveness). See `session-2/ACs.md` SDK-RFC-CONVERTING. |
| SDK-RFC-4 | SDK semver + deprecation policy + migration docs | Deferred — wait for self-hosted launch when version skew becomes a real customer problem |
| SDK-RFC-5 | MCP changelog/diff tool (`mcp__artisan-roast-sdk__diff_versions`) | Future — useful during SDK upgrades but not blocking |

## Review gates

Per CLAUDE.md and the user's working agreement, the human approval points are:

1. **Plan + ACs review** (this gate). User reviews `architecture.md`, `plan.md`, `session-1/ACs.md` before any implementation begins.
2. **Implementation review** at end of Session 1. User reviews the diff and the layer-by-layer evidence that each AC passes, including AC-DRIFT injection results.

The implement → verify → iterate loop in between is autonomous.
