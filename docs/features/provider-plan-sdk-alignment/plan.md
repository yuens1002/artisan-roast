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

### Session 2 — CONVERTING state + ConversionModal

**Scope:** Add CONVERTING plan state to the SDK + provider + renderer chain, plus a non-dismissable `ConversionModal` component that polls the resolver until the customer's plan converts off CONVERTING.

**Pre-reqs:**

- Session 1 done — the harness exists before new state variants land, so coverage grows with the type.
- SDK-RFC-MCP-VER landed (or batched in this session).

**Cross-repo deliverables:**

| Repo | Deliverable |
|------|-------------|
| SDK | Add `ConvertingState` to `PlanState` discriminated union. Fields: `status: "CONVERTING"`, optional progress / message fields. Add `CONVERTING` to the relevant SCENARIOS. Add to `validate_plan_payload` MCP tool. Bump SDK version. |
| Provider | Resolver branch emits CONVERTING during the conversion window (after Stripe webhook fires, before plan provisions to ACTIVE). Wire trial-conversion endpoint to emit transient CONVERTING state. Captured-payload dev scenario seeded (`dev-hosted-converting`). |
| Store | Bump SDK dep. Add `ConvertingCard` (or reuse PlanCard with a CONVERTING branch — TBD). Add `ConversionModal` component triggered by `state.status === "CONVERTING"` on any plan; non-dismissable overlay with polling indicator; polls `/api/plans/resolved` every ~5s; closes + `router.refresh()` when no plan returns CONVERTING. New contract test file `converting-card.test.tsx`. New `conversion-modal.test.tsx`. Add CONVERTING scenario to fixtures. Capture new payload after provider deploy. |

**Acceptance criteria:** TBD — follows the Session 1 template (presence/absence/placement on every How column). Drafted at session start.

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
| ST-1 | AC-CT-COMMON restructure | Existing 6 per-state contract files cover the ship-gating surface; consolidation into a common-fields suite + slim per-state files is a polish refactor. | Follow-up branch / Session 2 |
| ST-2 | AC-CT-MODAL — `confirm-action-dialog.test.tsx` | `ConfirmActionConfig` field coverage isn't gating ship; cancel-trial/cancel-stripe modals only fire from hosted/trial gate which isn't open. | Follow-up branch / Session 2 |
| ST-3 | AC-CT-PAGE — `plan-page-client.test.tsx` | Page composition, ordering, empty state, warnings banner. Helpful but not gating. | Follow-up branch |
| ST-4 | AC-CAP — Captured-payload Jest test | Needs dev license keys for capture; replaces existing `e2e/plans/scenarios.spec.ts` Playwright spec with a Jest-driven version. Cross-field consistency assertions (`quotas[].limit === pools[].limit`). MCP-backed `npm run plans:validate` optional cross-check. | Follow-up branch (after captures collected) |
| ST-5 | AC-PW — Playwright plumbing spec | Smoke test for Next.js wiring: `searchParams` await, `?scenario=` dev-gating in prod, hydration mismatch absence, fetch-timeout → empty-state without console errors. | Follow-up branch |
| ST-6 | AC-DRIFT — drift-injection ritual | Per-layer manual verification that each test layer can detect a synthetic regression (positional swap, snapshot diff, captured payload edit, removed await). | Verification pass before Session 2 ships |
| ST-7 | Compatibility-over-time (§12 work) | Boundary validation, version handshake headers, admin version banner, graceful renderer FallbackCard for unknown shapes. Filed in `architecture.md` D13 — deferred until self-hosted customers exist or a real skew incident forces it. | Self-hosted launch |
| ST-8 | Architecture doc relocation | Move (or copy + adapt) `architecture.md` to a cross-repo location (provider's `appendix/cross-repo/`) for the full picture; keep a store-side excerpt for renderer-only concerns. | After Session 1 ships, before Session 2 starts |
| ST-9 | Currency support beyond USD | Renderer hardcodes `$`; SDK type allows any ISO 4217 code. Multi-currency rendering is a future feature. | Future session |

### Provider-side (separate repo)

These belong in the provider repo's plan docs. Filed here so cross-repo context isn't lost.

| ID | Title | Notes |
|----|-------|-------|
| PR-1 | Session 2 resolver: emit CONVERTING state | New branch in `PlanState` resolver during conversion window. Pairs with store-side ConversionModal. |
| PR-2 | Seed `dev-hosted-converting` scenario | Dev license key + HostedTrial row with `status: CONVERTING`. |
| PR-3 | PLAT-1 — Plan business spec validation tests | Provider-side test suite asserts each shipped plan's resolver output matches its product spec (Priority Support = 5 tickets / 1 session / $49 / $39 sale label, etc.). |
| PR-4 | PLAT-2 — Cadence enforcement tests | Time-dependent tests verify pool replenishment fires on month boundary. |
| PR-5 | Stripe link IDs in dev seed | Seed `stripeExtendLinkId`, `stripeSubscribeLinkId` + delete-trial modal entry for hosted dev scenarios. (Resolves session-5 SKIP findings P4-related in dev only; prod already has real links.) |
| PR-6 | Version handshake response headers | Echo `X-Provider-SDK-Version` for store-side runtime drift detection. Deferred with §9.4 — signal-triggered, not timeline-triggered. |
| PR-7 | Document the resolver's branch logic as a spec | Today: `route.ts` source is the only spec. A separate `docs/plans/resolver-spec.md` (or similar) would document each branch's preconditions, output shape, and rationale. Pairs with PLAT-1 (spec validation tests). Not blocking ship; helpful for cross-repo onboarding. |

### SDK-side (separate repo)

| ID | Title | Status |
|----|-------|--------|
| SDK-RFC-MCP-VER | Wire MCP `serverInfo.version` to SDK package version | **Bundle with next SDK touch (during Session 2 likely)** — small fix; prerequisite for any meaningful version-aware MCP workflow |
| SDK-RFC-1 | `quotas[].cadence` field (`"month" \| "year" \| "one-time"`) | Future — enables deterministic cadence rendering |
| SDK-RFC-2 | `pools?: UsagePool[]` on every state (NoneState / InactiveState / CancelledState) | Future — removes the today-pattern hack of putting FREE in ACTIVE state just to attach addon pools |
| SDK-RFC-3 | Add CONVERTING state to `PlanState` union | **Session 2 prereq** |
| SDK-RFC-4 | SDK semver + deprecation policy + migration docs | Deferred — wait for self-hosted launch when version skew becomes a real customer problem |
| SDK-RFC-5 | MCP changelog/diff tool (`mcp__artisan-roast-sdk__diff_versions`) | Future — useful during SDK upgrades but not blocking |

## Review gates

Per CLAUDE.md and the user's working agreement, the human approval points are:

1. **Plan + ACs review** (this gate). User reviews `architecture.md`, `plan.md`, `session-1/ACs.md` before any implementation begins.
2. **Implementation review** at end of Session 1. User reviews the diff and the layer-by-layer evidence that each AC passes, including AC-DRIFT injection results.

The implement → verify → iterate loop in between is autonomous.
