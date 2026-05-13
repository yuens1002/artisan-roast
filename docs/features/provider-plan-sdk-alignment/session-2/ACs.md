# Session 2 — Acceptance Criteria

> ⚠️ **SUPERSEDED — this doc predates the CONVERTING→PENDING reframe.** It describes "CONVERTING as a plan state + ConversionModal returning `null` from PlanCard". The corrected design: **CONVERTING is the payment-loop *modal* spec, not a plan state**; the actual plan state during conversion is **`PENDING`** (PlanCard renders a PendingCard — NONE-shaped, status copy, "Check Status" CTA, spinner during poll — *not* `null`); `actionModals[]` becomes a discriminated union `(FeedbackFormModal | PaymentConfirmModal)[]` (breaking rename of `ConfirmActionConfig`). SDK v0.5.0 is the gate (PENDING state + discriminated `actionModals[]` + MCP `serverInfo.version` from package.json). See the project memory `project_session2_reframe_and_sdk_handoff.md` for the full corrected spec + downstream sequence. **Apply the reframe to this doc on the Session 2 feat branch when it starts** — don't trust the AC rows below as-is.

**Branch:** `feat/converting-state` (proposed — will likely be renamed `feat/pending-state` to match the reframe)
**Plan:** [`../plan.md`](../plan.md) (Session 2 section — also flagged)
**Architecture:** [`../architecture.md`](../architecture.md)

> **Scope:** Add the `CONVERTING` plan state across SDK → provider → store, plus a non-dismissable `ConversionModal` that polls the resolver until the customer's plan converts off CONVERTING. Plus two ride-along ACs that close deferred items ST-2 (ConfirmActionDialog coverage) and ST-3 (page-level composition).
>
> **Pre-reqs:** SDK v0.5.0 tagged + pushed (CONVERTING in `PlanState` union + `validate_plan_payload` + bundled SDK-RFC-MCP-VER). Provider resolver emits CONVERTING + seeds `dev-hosted-converting`. Both must land before the store PR.
>
> **How column convention:** Presence / Absence / Placement on every row — what should appear, what should NOT appear where it shouldn't, what structural slot it occupies. Same format as Session 1.
>
> **Ship-gating vs. coverage:** the hosted/trial gate is still not open to customers, so CONVERTING isn't user-facing yet. All ACs are coverage-building; none gate a customer-facing ship. They gate the *next* time the hosted gate opens.

---

## Cross-repo prerequisites (tracked, not store ACs)

| ID | Repo | Deliverable | Status |
|----|------|-------------|:------:|
| SDK-RFC-CONVERTING | `artisan-roast-sdk` | Add `ConvertingState` to `PlanState` union: `status: "CONVERTING"`, `statusInfo?: StatusInfo` (resolver-supplied progress copy), optional `startedAt?: string` (stuck-state detection). No `actions[]`, no `pools[]` — purely transient. Add a CONVERTING scaffold to `SCENARIOS`. Update `validate_plan_payload` Zod schema. | ☐ |
| SDK-RFC-MCP-VER | `artisan-roast-sdk` | Wire MCP `serverInfo.version` to the SDK package version (read at build). Bundle into the SDK-RFC-CONVERTING PR — both are SDK changes, ship together as v0.5.0. | ☐ |
| SDK-v0.5.0 | `artisan-roast-sdk` | Tag v0.5.0 (minor — adding a union member breaks `switch(state.status)` exhaustiveness in consumers; minor bump is honest). Push tag. | ☐ |
| PR-CONVERTING-RESOLVER | platform | Resolver branch emits CONVERTING during the conversion window (after Stripe webhook fires, before plan provisions to ACTIVE). Wire trial-conversion endpoint to push HostedTrial through CONVERTING → ACTIVE. Bump SDK ref to `#v0.5.0`. | ☐ |
| PR-SEED-CONVERTING | platform | Seed `dev-hosted-converting` — license key + HostedTrial row stuck in conversion. Regenerate `.dev-scenario-keys` (now id-keyed JSON, removes the store's `LABEL_TO_ID` table). | ☐ |

---

## Store-side ACs

| # | AC | Layer | What | How (Presence / Absence / Placement) | Pass | Agent | QC | Reviewer |
|---|----|:-----:|------|---------------------------------------|------|-------|----|----------|
| 1 | **AC-DEPS** | — | SDK dep bumped to `#v0.5.0` | **Presence:** `package.json` `artisan-roast-sdk` ref is `github:yuens1002/artisan-roast-sdk#v0.5.0`; `npm install` resolves; SDK package version is 0.5.0. **Absence:** no `file:` ref. **Placement:** dependency line in `package.json`. | After bump, TypeScript flags `PlanCard`'s `switch(state.status)` as non-exhaustive — that's the forcing function for AC-CT-CONVERTING. | | | |
| 2 | **AC-CT-CONVERTING** | 2 | `PlanCard` dispatch handles CONVERTING | **Presence:** `switch(state.status)` has a `case "CONVERTING":` that returns `null` (the card slot renders nothing — the modal owns the UX). TypeScript exhaustive switch passes. **Absence:** no card border, badge, pricing, pools, or actions render for a CONVERTING plan in the cards grid. **Placement:** the CONVERTING case sits in the same switch as the other 6 states. | New tests in `__tests__/contract/converting-card.test.tsx` (or extend an existing file). Inline-constructed CONVERTING plan → assert nothing renders in the card position. | | | |
| 3 | **AC-CT-CONVERSION-MODAL** | 2 | `ConversionModal` component contract | **Presence:** `_components/ConversionModal.tsx`. Renders when at least one plan in `plans[]` has `state.status === "CONVERTING"`. Shows a spinner/loader. Shows `state.statusInfo.descText` when present (resolver-supplied "Processing payment…" / "Brewing your store…"). **Absence:** not rendered when no plan is CONVERTING; no close button, no Escape-key handler, no overlay-click-to-close — non-dismissable by design. **Placement:** full-screen overlay (fixed, z-top), above the cards grid. | New `__tests__/contract/conversion-modal.test.tsx`. Construct a plans array with/without a CONVERTING plan; assert modal presence/absence; assert spinner + descText projection; assert no dismiss affordances. | | | |
| 4 | **AC-CT-CONVERSION-MODAL-POLL** | 2 | Polling behavior | **Presence:** modal invokes `router.refresh()` on a configured interval (~5s; mockable timer in tests); polling continues while the modal is open. **Absence:** polling stops when the modal closes (no plan is CONVERTING anymore); no overlapping `router.refresh()` calls if a refresh is slow. **Placement:** poll logic inside `ConversionModal` (a `useEffect` with `setInterval` cleared on unmount / state-clear). | `conversion-modal.test.tsx` with fake timers — advance time, assert `router.refresh` call count; unmount, assert no further calls. | | | |
| 5 | **AC-CT-FREEZE** | 2 | Page freeze while modal is open | **Presence:** when `ConversionModal` is open, `<body>` (or the page root) gets `overflow-hidden` (scroll lock); the cards grid behind gets `pointer-events-none` + a visual dim (`opacity-50` or a backdrop). **Absence:** when the modal closes, scroll lock + pointer-events + dim are removed; no clickable element behind the modal is reachable (focus trap or `inert`/`aria-hidden` on the background). **Placement:** the freeze styling is applied by `PlanPageClient` (which renders the modal) to the cards-grid container and the body, not by individual cards. | `plan-page-client.test.tsx` (see AC-CT-PAGE) — render with a CONVERTING plan, assert background container has the freeze classes + that a background button is not reachable via tab order. | | | |
| 6 | **AC-CT-PAGE** *(ride-along ST-3)* | 2 | Page-level composition | **Presence:** `__tests__/contract/plan-page-client.test.tsx`. Asserts: `plans: []` → empty-state copy; N≥1 plans → one card per plan in payload order; `license.warnings` non-empty → warnings banner with each entry; `?checkout=success` searchParam → `refreshLicense` action fired; `?demo=success` → demo toast; **a CONVERTING plan in `plans[]` → ConversionModal mounted + page frozen**. **Absence:** N=0 → no card containers; warnings empty → no banner; missing query params → no side effects; no CONVERTING plan → no modal. **Placement:** cards in `.grid-cols-2` parent; warnings banner above the grid; modal above everything. | New file; closes deferred ST-3. | | | |
| 7 | **AC-CT-MODAL** *(ride-along ST-2)* | 2 | `ConfirmActionDialog` field coverage | **Presence:** `__tests__/contract/confirm-action-dialog.test.tsx`. Every `ConfirmActionConfig` field projects: `heading` as title, `description` as body, `reasonsLabel` above the reasons select, each `reasons[]` entry as an option, `keepLabel` + `confirmLabel` as buttons, `confirmIcon` on the confirm button, `other.label`+`placeholder`+`maxLength` reveal the free-text field with a character counter when "Other" is selected. **Absence:** without `confirmIcon`, no icon on confirm; without `other`, no free-text field; when `open=false`, none of the above in DOM. **Placement:** dialog in a Radix portal; reasons select above the optional free-text input; keep button left of confirm. | New file; closes deferred ST-2. (We're writing `conversion-modal.test.tsx` anyway — the modal/dialog test patterns transfer.) | | | |
| 8 | **AC-PIN** | 3 | SDK SCAFFOLD pin updated for CONVERTING | **Presence:** `sdk-scaffold-pins.test.ts` snapshot includes the CONVERTING scaffold; the "all SCENARIOS keys we depend on are exported" assertion lists it. **Absence:** snapshot still date-stable (the bare-`YYYY-MM-DD` normalizer from v0.107.3 covers any renewal-date copy). **Placement:** snapshot in `__snapshots__/`. | Snapshot regenerated against SDK v0.5.0. | | | |
| 9 | **AC-CT-COMMON-DEFER** | — | (not in scope) | The common-fields restructure (ST-1) stays deferred. Note here for traceability — Session 2 adds files, doesn't consolidate them. Bulk migration is cheaper later when a 3rd batch of states accrues. | n/a | | | |
| 10 | **AC-FMT** | Pure | No new formatters expected | **Presence:** if CONVERTING's `statusInfo.descText` needs any computed formatting (progress %, elapsed time from `startedAt`), add a pure formatter to `formatters.ts` + a unit test. **Absence:** if the resolver supplies fully-formed copy (likely), no new formatter — `formatters.test.ts` unchanged. **Placement:** `formatters.ts` if added. | Likely a no-op; documented so the implementer checks. | | | |
| 11 | **AC-DEV** | Page | `?scenario=dev-hosted-converting` in dev | **Presence:** `_fixtures/plan-scenarios.ts` gains a `dev-hosted-converting` entry (HB_TRIAL_CONVERTING + HB_NONE). `ALL_KEYS` includes it. Visiting `/admin/support/plans?scenario=dev-hosted-converting` in dev mounts the modal + freezes the page. **Absence:** the entry isn't in `ALL_KEYS` only if the SDK scaffold isn't available yet (then it's a TODO). **Placement:** fixture in `_fixtures/` (outside `__tests__/` — Vercel build excludes the latter). | Manual dev verification + the fixture entry exists. | | | |
| 12 | **AC-CAP-CONVERTING** | 4 | Captured baseline for CONVERTING | **Presence:** after the provider deploys, `npm run plans:capture` writes `e2e/plans/captured/dev-hosted-converting.json`; `state.status === "CONVERTING"`; committed. The nightly drift workflow's `LABEL_TO_ID` (or the new id-keyed JSON) includes the converting scenario. **Absence:** if the provider hasn't deployed yet, the capture skips it — and with `STRICT_KEYS=1` in CI that's a hard fail, so the store PR can't merge until the provider side is live. **Placement:** `e2e/plans/captured/`. | Sequencing dependency: provider must deploy before the store PR merges. | | | |
| 13 | **AC-VIS** | 6 | Screenshot for the converting scenario | **Presence:** `scripts/screenshot-plan-scenarios.ts` captures `dev-hosted-converting` (it loops `ALL_KEYS`, so this is automatic once the fixture entry exists). The PNG shows the modal overlaying a dimmed cards grid. **Absence:** n/a. **Placement:** `.screenshots/plan-scenarios/dev-hosted-converting.png`. | One screenshot, viewport-only (per CLAUDE.md — no `fullPage`). | | | |
| 14 | **AC-DRIFT** | 2/3/4 | Drift-injection ritual | One injection per testable layer, run once before AC closes, documented in QC, then reverted. **Layer 2:** remove the `case "CONVERTING":` from the dispatch → TypeScript fails (non-exhaustive switch) — that's the test catching it; revert. Also: break the modal's "render when any plan is CONVERTING" condition → AC-CT-CONVERSION-MODAL fails; revert. **Layer 3:** patch a local SCAFFOLD value → snapshot diff; revert. **Layer 4:** edit `dev-hosted-converting.json` to set `status` to something outside the union → AC-CAP structural assertion fails; revert. | Same ritual as Session 1. | | | |
| 15 | **AC-REG** | All | Regression + bookkeeping | **Presence:** `npm run typecheck` 0 errors; `npm run test:ci` 0 failures; `npm run test:e2e` 0 failures; `npm run precheck` 0 errors; `.claude/verification-status.json` updated for the branch with the right `acs_total`; CHANGELOG entry; version bump (minor — adds a user-visible-eventually feature, even if gated). **Absence:** no leftover TODO comments referencing missing SDK scaffolds once v0.5.0 is in; no `LABEL_TO_ID` drift if the platform regenerated `.dev-scenario-keys`. **Placement:** verification-status.json references this ACs doc. | Final gate. | | | |

---

## Sequencing

Three PRs, must land in order. The drift nightly + `STRICT_KEYS=1` make the order enforced rather than just recommended:

1. **SDK PR** (`feat/converting-state-and-mcp-ver`) — CONVERTING in the union + MCP version fix → tag v0.5.0 → push.
2. **Platform PR** (`feat/converting-resolver`) — resolver emits CONVERTING + seed `dev-hosted-converting` → deploy. Bumps SDK ref to `#v0.5.0`.
3. **Store PR** (`feat/converting-state`) — bump SDK ref, `PlanCard`'s `case "CONVERTING"` returning `null` (no separate ConvertingCard component), `ConversionModal`, page freeze, fixture entry, contract tests, ride-along ST-2/ST-3 tests, capture `dev-hosted-converting.json` after the provider deploys.

The store PR's AC-CAP-CONVERTING can't pass until the provider is live (capture would skip the scenario; `STRICT_KEYS` fails). So the store PR is the last thing to merge, after a provider deploy.

---

## Updates to root docs after Session 2 lands

- `plan.md` — mark SDK-RFC-CONVERTING, SDK-RFC-MCP-VER, SDK-v0.5.0, PR-CONVERTING-RESOLVER, PR-SEED-CONVERTING, ST-2, ST-3 as ✅ done. Remove the `LABEL_TO_ID` follow-up if the platform regenerated `.dev-scenario-keys` as id-keyed JSON.
- `architecture.md` — new `ConvertingState` row in the per-field ownership table; D14 + D15 in the decisions log (see plan.md for proposed wording).
- `session-1/ACs.md` — no change (Session 1 is closed).

---

## Total: 15 rows

12 substantive ACs + AC-CT-COMMON-DEFER (traceability note, not an AC) + AC-DRIFT (verification ritual) + AC-REG (gate) = 15 rows. Two of the 12 substantive ACs (AC-CT-MODAL, AC-CT-PAGE) close deferred items ST-2 and ST-3.
