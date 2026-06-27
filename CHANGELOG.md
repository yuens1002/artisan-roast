# Changelog

## Unreleased

## 0.109.10 - 2026-06-27

### Fixed

- **Plans page — Priority Support subscribe CTA in demo mode** — `action.endpoint` path in `handleAction` was missing an `IS_DEMO` guard. The priority-support plan's `checkoutUrl` (`/api/checkout?planSlug=priority-support`) starts with `/api/` and is classified as an endpoint by the platform's materializer, so it bypassed the existing demo-bypass guard and attempted to POST to the store's cart checkout route (wrong). Now routes checkout endpoints (`/api/checkout*`) through the demo-bypass flow (toast: "Purchase complete — Demo mode, no charge made.") and shows "Not available in demo mode" for any other endpoint action. Added contract tests covering both paths.
- **Plans page not loading on demo site** — `LICENSE_KEY` was missing from the Vercel production environment, causing `fetchResolvedPlans()` to silently return `[]`. Added `LICENSE_KEY` to the `artisan-roast` Vercel project's production env.

## 0.109.9 - 2026-06-26

### Fixed

- **Plans resolver drift — daily false positives on `saleEndsAt`** — `saleEndsAt` is a promotional end date updated when sales are extended; treating it as structural data caused the nightly drift check to fail every day whenever the platform team extended the launch sale. Added `saleEndsAt` to `TIME_DEPENDENT_KEYS` in `capture-plan-scenarios.ts` (same `<TIME_DEPENDENT>` placeholder pattern as `used`). Also refreshed the captured baselines to pick up two platform changes since the last capture: `saleEndsAt` now returned on hosted-plan scenarios, and `stripeCouponId` added to Priority Support addon.

## 0.109.8 - 2026-06-16

### Fixed

- **Nightly CI — E2E tests need chromium-headless-shell** — `devices["Desktop Chrome"]` in `playwright.config.ts` resolves to `chromium-headless-shell`, not full chromium. The `--no-shell` flag added in v0.109.5 was skipping it; extended `install_browser()` to also pre-install `chromium-headless-shell` via curl + system `unzip` + `INSTALLATION_COMPLETE` marker (same yauzl bypass pattern). Removed `--no-shell` from the final `playwright install` call — all three artifacts (chromium, chromium-headless-shell, ffmpeg) are now pre-installed so playwright finds all markers and exits in < 1s. Applied to `e2e-nightly.yml` and both jobs in `qa-nightly.yml`.

## 0.109.7 - 2026-06-15

### Fixed

- **Nightly CI playwright install hang (take 5, complete bypass)** — v0.109.6 fixed the chromium extraction hang but `playwright install --no-shell chromium` still downloads ffmpeg and extracts it with yauzl, which also hangs on Node.js 24 GitHub runners even for tiny (2.37 MB) zips. Root cause confirmed: yauzl's pure-JavaScript extraction hangs on ALL zip files on Node.js 24 shared runners. Fix: `install_browser()` shell function now pre-installs both `chromium` and `ffmpeg` via curl + system `unzip` + `INSTALLATION_COMPLETE` marker before calling `playwright install`. The `playwright install` call finds both markers and completes in < 1s. Applied to `e2e-nightly.yml` and both jobs in `qa-nightly.yml`.

## 0.109.6 - 2026-06-15

### Fixed

- **Nightly CI playwright install hang (take 4, root cause found)** — `playwright install chromium` uses `yauzl` (pure JavaScript zip library) for extraction. On GitHub Actions runners, yauzl extraction of the 167 MB Chrome zip hangs indefinitely with zero output. Fix: download with `curl` (fast, native) then extract with system `unzip` (C implementation, ~10× faster), write playwright's `INSTALLATION_COMPLETE` marker so the subsequent `playwright install` call skips re-extraction and only downloads ffmpeg (small, fast). Applied to `e2e-nightly.yml` and both jobs in `qa-nightly.yml`.

## 0.109.5 - 2026-06-15

### Fixed

- **Nightly CI playwright install hang (take 3)** — `playwright install chromium` silently downloads two additional artifacts after the main 167 MB zip: `chromium-headless-shell` and `ffmpeg`, both with no progress bar. These silent downloads cause the 5-minute step timeout. Switched to `--no-shell` flag to skip the headless-shell download; tests use `devices["Desktop Chrome"]` with full chromium and don't need the headless shell variant. Added `DEBUG=pw:install` so future hangs produce diagnostic output in the step log.

## 0.109.4 - 2026-06-15

### Fixed

- **Nightly CI playwright extraction hang** — added `actions/cache@v4` for `~/.cache/ms-playwright` in `e2e-nightly.yml` and `qa-nightly.yml` (including `self-heal` job). On cache hit, playwright skips the 167 MB zip download and extraction entirely. Added `timeout-minutes: 5` per step as a backstop on cache misses.

## 0.109.3 - 2026-06-14

### Fixed

- **Nightly CI playwright hang** — split `playwright install chromium --with-deps` into two steps (`install-deps` with `DEBIAN_FRONTEND=noninteractive` + `install chromium`) in `e2e-nightly.yml` and `qa-nightly.yml`. The apt post-install hook was silently freezing after Chrome downloaded, causing every nightly run to hang for 6 hours before GitHub cancelled it.
- **Node.js 20 action deprecation** — added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"` at workflow level to all 7 affected workflows ahead of the mandatory June 16 migration. Added `timeout-minutes: 30` to `e2e` and `qa` jobs so future hangs fail fast.

## 0.109.2 - 2026-06-13

### Fixed

- **Plans drift CI false positives** — `capture-plan-scenarios.ts` now normalizes `"used"` fields to `"<TIME_DEPENDENT>"` before writing baselines; 5 existing captured JSON files updated to match. Prevents daily false-positive drift alerts from time-advancing counters (e.g. `trial-days`).

## 0.109.1 - 2026-06-12

### Fixed

- **Plan scenario fixture coverage** — added `dev-hosted-converting` and `dev-hosted-pending-verification` to `SCENARIO_FIXTURES` and `ALL_KEYS` in `plan-scenarios.ts`, closing the gap to all 16 platform dev scenarios.
- **`LABEL_TO_ID` label-to-key mappings** in `scripts/capture-plan-scenarios.ts` — corrected wrong mapping for `PENDING_VERIFICATION`, added three missing entries (`dev-hosted-pending`, `dev-hosted-initial-provisioning`, `dev-hosted-provisioning`).
- **Capture README refresh command** updated to reference the committed `scripts/dev-scenario-keys.public.json` instead of the gitignored env-style file.

### Added

- **Three missing prod baseline snapshots** — `dev-hosted-converting.json`, `dev-hosted-initial-provisioning.json`, `dev-hosted-pending-verification.json` captured from prod and committed to `e2e/plans/captured/`. All 16 scenario keys now have baselines.
- **`PLANS_CAPTURE_DEV_KEYS_JSON`** GitHub Actions secret set — enables the nightly `Plans Resolver Drift` workflow to run without manual intervention.

## 0.109.0 - 2026-06-12

### Added

- **Pools grant list on add-on cards** — each add-on card in `/admin/support/add-ons` now renders a compact list of grant items (e.g. "5 Priority Tickets", "2 1:1 Sessions") between the description and the purchase row, sourced from `AlaCartePackage.pools[]` (SDK v0.6.2).
- **`addons:capture` script** (`scripts/capture-addon-scenarios.ts`) — fetches the live `/api/add-ons` response from the platform and writes it to `e2e/add-ons/captured/packages.json` for snapshot testing.

### Changed

- **`AlaCartePackage` type** now imported and re-exported from `artisan-roast-sdk/alacarte` (SDK v0.6.2); local `interface AlaCartePackage` in `lib/license-types.ts` removed. Includes new required `pools: AlaCartePool[]` field.
- **Add-ons API response validated with `AddOnsResponseSchema.parse()`** (`lib/add-ons.ts`) — replaces the unsafe `as` cast on the raw fetch response.
- **`CheckoutResponse` typed from SDK** in `app/admin/support/add-ons/actions.ts` — replaces the inline import assertion with a top-level named import.
- **`checkout.test.ts`** migrated from literal slug strings to `ALACARTE_SCENARIOS.TICKETS_5.id` SDK scaffold reference.

## 0.108.3 - 2026-06-12

### Fixed

- `scripts/capture-plan-scenarios.ts` usage comment updated to reference `.dev-scenario-keys.json` — platform no longer generates the legacy shell-format file
- Added `dev-hosted-initial-provisioning` to `SCENARIO_FIXTURES` and `HOSTED_KEYS` so `plans:capture` iterates all 14 store-tracked dev scenarios (resolves recurring daily drift alerts)

## 0.108.2 - 2026-05-26

### Changed

- Refreshed `e2e/plans/captured/*.json` baselines against platform v0.26.0 (S2b resolver rewrite). All changed scenarios map to documented AC-EXP-1..10 or additional expected changes.

### Fixed

- `scripts/capture-plan-scenarios.ts` `loadKeys()` now correctly extracts `.licenseKey` from the nested `{ licenseKey, label, tier }` format in `dev-scenario-keys.public.json`.

## 0.108.0 - 2026-05-13

### Added

- **PaymentConfirmModal** (`app/admin/support/plans/_components/PaymentConfirmModal.tsx`) — 3-state machine (`preparing` → `polling` → `error`) driven entirely by polled plan state. Non-dismissable in all states. Single generic error copy across all three failure triggers (endpoint-fail / plan-reverted-to-NONE / `stripeTab.closed`). `data-testid="payment-confirm-modal-{state}"` for test discrimination. Cycles `modal.processingMessages[]` every 2.5s while polling.
- **Polished `PendingCard`** — mirrors `NoneCard` layout (price section + benefits list) with three PENDING-specific differences: (1) hard-coded `<Badge>` with `Hourglass` icon + "Pending" label in the top-right slot (universal store-side display, no SDK/resolver involvement); (2) description slot renders `state.statusInfo.descText` instead of `plan.description` (substate-aware copy supplied by the resolver) with `role="status" aria-live="polite"` for screen readers; (3) single hard-coded "View Details" ghost CTA linking to `/admin/support/plans/${plan.slug}`. `state.actions` is intentionally NOT iterated today (the renderer ignores it; lands when platform `PR-PENDING-ACTIONS` ships substate-aware actions — Check Status primary in provisioning substate, empty during confirming-payment). Polling is handled by a single orchestrator in `PlanPageClient` (see below) — PendingCard is purely presentational. `data-testid="pending-card"` + `data-testid="pending-badge"`. Both PENDING substates render identically — the only DOM difference is the resolver-supplied `descText` text node.
- **`startPaymentFlow`** in `PlanPageClient` — synchronous-blank-tab pattern: `window.open("about:blank", "_blank")` fires **synchronously** in the click handler to preserve popup-blocker permission; modal mounts in `preparing`; `fetch(action.endpoint)` follows with a 15s AbortController timeout. On success the blank tab navigates to the Stripe URL + modal flips to `polling`. On failure/timeout/abort the blank tab closes + modal flips to `error`.
- **Discriminator gate** in `handleAction` — `modal.type === "feedbackForm"` opens `ConfirmActionDialog`; `modal.type === "paymentConfirm"` triggers `startPaymentFlow`. Compile-enforced via the SDK discriminated union.
- **`seenPendingRef` latch** — the plan-state watcher only treats NONE as failure once it has observed PENDING for the current attempt. Without the latch, the local `plans` prop staying NONE for a brief window before the platform's synchronous PENDING write propagates would misfire `error` the moment the modal entered polling.
- **`stripeTab.closed` detection** (1s interval while polling) → fast-feedback transition to `error` instead of waiting for Stripe's session-expired webhook (minutes to hours).
- **Single polling orchestrator** in `PlanPageClient` — picks the cadence based on what needs watching: 5s while a payment modal is in `polling` (active payment window, drives modal state-machine transitions), 10s otherwise when any plan is PENDING with no active modal (safety-net for the durable card), off when nothing needs watching. Replaces the previous two independent pollers (modal-side 5s + card-side 10s) so there's no overlap during the modal-active window.
- **Test-engineer skill** at `.claude/skills/test-engineer/SKILL.md` codifying the conventions used here (probe strings, `satisfies` types, testid state markers, presence+absence assertion pairs, mock-at-platform-boundary, no DOM snapshots, single parameterized `test.each` for unification claims). Replaces the generic platform skill for this repo.
- **Session 2 contract tests** (31 new): `pending-card.test.tsx` (8), `payment-confirm-modal.test.tsx` (10), `plan-page-client.test.tsx` (7), `confirm-action-dialog.test.tsx` (6 — ride-along ST-2).
- **Durable UI evidence** — 13 viewport PNGs at `docs/features/provider-plan-sdk-alignment/session-2/ui-evidence/` covering every `ALL_KEYS` scenario including `dev-hosted-pending` (polished PendingCard render).

### Changed

- **`PaymentConfirmModal` is a sibling of `ConfirmActionDialog`** — the SDK's `actionModals[]` is a discriminated union (`FeedbackFormModal | PaymentConfirmModal`); the renderer is now selected by `modal.type`.
- **Session 2 docs reframe** — applied the `CONVERTING→PENDING` rename to `plan.md` Session 2 section + `session-2/ACs.md` (replaced the supersession banner with the corrected design as the body). 18 ACs. D14 / D15 rewritten.

### Blocked-on-platform

- **AC-CAP-PENDING** — captured-payload baselines for `dev-hosted-pending` (confirming-payment substate) + `dev-hosted-provisioning` (store-setup substate). Lands when platform ships `PR-PENDING-ENDPOINT` + `PR-PENDING-RESOLVER` + `PR-SEED-PENDING`. PR opens without this AC closed; merge is gated.

## 0.107.3 - 2026-05-12

### Changed

- **Refresh prod capture baseline** (`e2e/plans/captured/*.json`) — cumulative refresh after the platform resolver corrections deployed. Includes: `Community Roast` → `Community` plan name; `free` plan returns NONE state for non-FREE tiers (was ACTIVE) with a view-terms action + `Forever` saleLabel; pools carry icon + cta + real quota limit; FREE filtered out of HOSTED scenarios; early-state scenarios (pending/provisioning/deprovisioned) return empty plan arrays; humanized date strings on trial/expired/cancelled status info. Resolves the nightly drift flagged in issue #375.

## 0.107.2 - 2026-05-11

### Added

- **Plans resolver drift nightly** (`.github/workflows/plans-capture-nightly.yml`): daily 8am UTC job captures every dev scenario from prod `/api/plans/resolved`, diffs against the committed baseline at `e2e/plans/captured/*.json`. Drift fails the run, uploads a `plans-resolver-drift` artifact, and auto-opens an issue with refresh instructions. Catches resolver regressions that mock-driven Playwright tests can't (the mock is authored, the capture is observed).
- **Prod capture baseline** at `e2e/plans/captured/*.json` — 13 dev scenarios. Source of truth for the nightly drift check.
- **`e2e/plans/captured/README.md`** documenting the baseline + refresh flow.

### Changed

- **`scripts/capture-plan-scenarios.ts`** now handles two key-file formats: id-keyed JSON (CI path via `DEV_KEYS_JSON` secret) and label-headered env-style (local path via `DEV_KEYS_FILE`, matches what platform's `seed-dev-scenarios.ts` writes). Auto-detects which format the file uses.
- **`STRICT_KEYS=1`** mode in capture script: hard-fails on unknown env labels (in `parseEnvFile`) and missing scenarios (in `main`). Workflow sets it so silent skips can't leave the committed baseline stale while `git diff` reports no drift.
- **Workflow wipes `e2e/plans/captured/*.json`** before capture so missing scenarios surface as deletions in the diff (defense in depth alongside `STRICT_KEYS`).

## 0.107.1 - 2026-05-11

### Fixed

- **E2E nightly: mock `/api/plans/resolved`**. `e2e/mock-platform.mjs` now serves the resolver endpoint so Playwright suites that hit the admin plans page render real cards instead of empty state. `playwright.config.ts` sets `LICENSE_KEY` so `fetchResolvedPlans()` doesn't short-circuit on the no-license-key branch. Unblocks nightly e2e runs that were silently empty after Session 1's renderer refactor.

## 0.107.0 - 2026-05-11

### Added

- **Provider Plan SDK Alignment — Session 1 (testing harness + renderer refactor + observability)**:
  - **Pure formatters** (`app/admin/support/plans/formatters.ts`): price, interval, sale-label, deprovision/deactivated date, pool count, days-remaining pluralisation — extracted from inline JSX transforms. 21 unit tests in `formatters.test.ts`.
  - **`PoolCtaMenu` shared helper** (`app/admin/support/plans/_components/PoolCtaMenu.tsx`): single 3-dot dropdown used by ActiveCard, TrialCard, and ExpiredCard. Respects `action.disabled` (greys out menuitem) and `action.disabledReason` (tooltip). Closes the gap where TrialCard / ExpiredCard previously ignored `pool.cta` entirely.
  - **Dev `?scenario=<key>` override** on `/admin/support/plans` — short-circuits `fetchResolvedPlans()` and renders from the local SDK-derived fixture. Gated on `NODE_ENV !== "production"`. Lets developers iterate on the renderer without the provider stack running.
  - **Component contract test harness**: 6 per-state contract test files (`__tests__/contract/{none,active,trial,expired,cancelled,inactive}-card.test.tsx`) covering renderer's data→DOM contract — 96 tests total, runs hermetically in <2s.
  - **SDK SCAFFOLD pin** (`__tests__/sdk-scaffold-pins.test.ts`): snapshots every imported `SCENARIOS.*` value with date normalisation; surfaces upstream value drift on `npm i artisan-roast-sdk@new`.
  - **Scenario fixtures** (`__tests__/fixtures/plan-scenarios.ts`): SDK-derived `HydratedPlan[]` per dev key, consumed by the `?scenario=` override and the screenshot harness. Hand-derived compositions (`FREE_NONE`, `HB_NONE`, `TRIAL_CANCELLED_WITH_CARD`) marked as examples, not specs.
  - **Capture script** (`scripts/capture-plan-scenarios.ts` + `npm run plans:capture`): fetches per-license-key responses from the provider, normalises `resolvedAt`, writes `e2e/plans/captured/<key>.json` for future Layer 4 captured-payload tests.

### Changed

- **`PlanPageClient.tsx` refactored** to consume the new pure formatters and the `PoolCtaMenu` helper. No behavior change on existing scenarios; trial/expired cards now correctly surface `pool.cta` actions when present.
- **`scripts/screenshot-plan-scenarios.ts` rewritten** as the single canonical visual harness — loops `ALL_KEYS` from fixtures, hits `?scenario=<key>` override, captures viewport. Replaces 7 throwaway iteration scripts.
- **Cross-repo hook fixes** (carried from prior Unreleased): `pre-pr-via-release-node.js`, `pre-pr-precheck-node.js`, and `review-before-merge-node.js` skip their gates when `gh pr create`/`gh pr merge` targets a different repository via `--repo owner/name`.

### Added — Observability

- **Structured boundary logs in `lib/plans.ts`**:
  - `[plans.fetch.failed]` — emitted on no-license, non-2xx, parse error, missing plans array, or fetch error; structured payload includes `reason`, `status` (where applicable), `errorClass`, `url`.
  - `[plans.empty.unexpected]` — emitted when a valid license returns `plans: []`; distinguishes "page legitimately empty" from "resolver gave us nothing despite a valid license."
  - Total: ~30 lines, no new dependencies. The runtime "did something break?" signal — surfaces in Vercel/host logs. See `docs/features/provider-plan-sdk-alignment/architecture.md` §9.3.

### Documentation

- **New architecture, plan, and ACs docs** under `docs/features/provider-plan-sdk-alignment/`:
  - `architecture.md` — store-side view of the cross-repo contract; roles table (SDK / Provider / Store); 4 drift surfaces; 6 testing layers; per-field data ownership covering `Plan`, `PlanState`, `UsagePool`, `PlanAction`, `ConfirmActionConfig`; §9 today's state + minimum observability; §10 provider-side concerns out of scope; decisions log D1–D13.
  - `plan.md` — Session 1 deliverables; Session 2 (CONVERTING + ConversionModal) cross-repo deliverables table; comprehensive deferred-work tracker (9 store-side, 7 provider-side, 6 SDK-side RFC items).
  - `session-1/ACs.md` — 17 store-side acceptance criteria with presence/absence/placement format on every How column. Ship-gating subset: 10 ACs PASS.
- **Archived** original session-1..session-5 work under `docs/features/provider-plan-sdk-alignment/archive/`.

### Removed

- **Throwaway scripts deleted** (8 total): `screenshot-plan-scenarios-v2.ts`, `screenshot-plan-states.ts`, `screenshot-plans-all-states.ts`, `screenshot-plans-platform.{ts,js}`, `verify-plans-session5{,-v2,-v3}.mjs` — replaced by the single canonical screenshot script + future captured-payload Jest tests.

### Internal

- `@testing-library/user-event` added as dev dependency (for Radix dropdown interaction testing in contract suite).
- `jest.config.js` — added testPathIgnorePatterns entry for underscore-prefixed helper files in `__tests__/` subdirs.

## 0.106.2 - 2026-05-07

### Changed

- **Trial cancellation wiring**: `submitCancellation` no-card variant now calls the hosted platform cancel endpoint; guards for missing env vars, 10s timeout, try/catch, user-friendly error messages; adds cancellation tests and `docs/features/hosting-extension/trial-cancellation.md`

## 0.106.1 - 2026-05-07

### Fixed

- **Pre-PR hook — worktree support**: `pre-pr-via-release-node.js` now checks the `--head <branch>` latest commit when the flag is present, allowing docs-only PRs opened from git worktrees to pass the release fingerprint gate

### Changed

- **Screenshot script**: `scripts/screenshot-plan-scenarios.ts` expanded to cover all SDK plan scenarios with numbered filenames and `SCREENSHOT_DIR` env override

## 0.106.0 - 2026-05-07

### Added

- **Provider-driven plan cards**: `PlanPageClient` rewritten to dispatch on `plan.state.status` — six status-specific card components (NONE/ACTIVE/TRIAL/EXPIRED/CANCELLED/INACTIVE) with no slug-based conditional rendering. Pool CTAs render inline-left on ACTIVE cards; management actions live in a 3-dot dropdown. `ConfirmActionDialog` wired via `activeModal` state driven by `action.modalSlug`.
- **SDK type alignment**: `artisan-roast-sdk` installed as a project dependency. `lib/plan-types.ts` deleted; `Plan`, `HydratedPlan`, `ConfirmActionConfig`, and related types now imported from the SDK. `filterPlansByVisibility` made generic (`<T extends Plan>`) to work with both `Plan[]` and `HydratedPlan[]`.
- **Dev mock scenarios**: `getMockHydratedPlans()` builds the dev scenario set from SDK SCENARIOS (SELF_HOSTED_FREE, PRIORITY_SUPPORT_NONE, TRIAL_ACTIVE_NO_CARD, CONVERTED). Individual scenarios selectable via `?scenario=KEY` query param.

## 0.105.3 - 2026-05-06

### Fixed

- **Plans page fallback (empty response)**: `fetchPlans()` now falls back to the full mock plan catalog (all 4 plans) when the platform API responds successfully but returns an empty list — covers production cases where plans are not yet seeded, and ensures hosted instances still see their plan cards
- **Plans page visibility filter**: `filterPlansByVisibility` now treats `visibility: null` as `"self-hosted"` — platform DB rows without a visibility value are included in self-hosted mode and excluded from hosted mode

## 0.105.2 - 2026-05-06

### Fixed

- **Plans page fallback**: `fetchPlans()` now returns Community + Priority Support plans on platform API error or timeout instead of an empty array, preventing the "Plans could not be loaded" blank state on self-hosted stores

## 0.105.1 - 2026-05-05

### Added

- **Hosted trial support**: IS_HOSTED detection, trial status fetcher (getTrialStatus), House Blend Trial + House Blend plan entries, plans page filters by build-mode visibility
- **Trial card UI**: Progress bar (trial days remaining), ACTIVE/EXPIRED/CANCELLED badge variants, PENDING_CANCEL fixture for dev/verification
- **Cancel trial dialog**: ConfirmActionDialog (config-driven, replaces CancelTrialDialog) — reason capture with dropdown + optional free-text field; wired to hosted trial plan payload
- **Data export**: Download Your Data — ZIP archive of all customer data served via admin export route

### Fixed

- **ZIP export**: Archiver error handler now pipes stream errors to the response (prevents silent hangs)
- **TrialStatus cast**: Response shape validated before cast — malformed upstream response returns null instead of entering a bad state
- **cardAdded derivation**: Now covers CANCELLED status (was ACTIVE-only; CANCELLED trials with card on file showed wrong UI)
- **Cancel button**: Hidden when plan.actionModal is absent (previously showed an empty dropdown or stuck submit)
- **ConfirmActionDialog**: Only mounted when trialStatus is non-null
- **No-card cancel reason**: Logged server-side instead of silently discarded

### Changed

- **CardConfig**: Refactored to discriminated union (type: "trial" | "plan") — computeCardConfig() factory encapsulates card-type selection, no slug checks in the render loop
- **MOCK_HOSTED_STATUS**: Fixture env var for dev/verification of all hosted trial states without a live service

---

## 0.105.0 - 2026-05-04

### Added

- **Stripe publishable key cross-account verification** — the backend now verifies that the publishable key belongs to the same Stripe account as the secret key before saving. Implementation creates an unconfirmed PaymentIntent with the secret key, then retrieves it using the publishable key as Bearer auth against the Stripe API (Stripe returns 4xx for mismatched accounts). The PI is always cancelled in a `finally` block. Prevents a class of misconfiguration that was previously silent.
- **Verify button on Stripe credentials form** — secondary button in the form footer that re-runs the full validation chain (secret key → charges_enabled → test charge → publishable key cross-account check) against the currently stored credentials without saving. Useful for diagnosing payment failures when all keys appear correct. Disabled while any field has unsaved changes, during a save, or after a save error.
- **Undo Changes recovery button** — appears after a failed save when the DB has a previously-validated state. Clicking Undo restores all three fields to their DB values, clears the error, and resets field icons to green — one-click escape from a bad edit without a page reload.

### Fixed

- **`charges_enabled` false positive on test accounts** — the Stripe account validation check rejected valid test keys because `charges_enabled` is a live-mode onboarding flag and may be `false` on test accounts that fully support test charges. Guard now skipped for `sk_test_*` keys; test-mode payment capability is verified instead by creating and immediately cancelling a test PaymentIntent with `pm_card_visa`.
- **Required field validation before save** — saving with no DB row and one or more empty fields now shows per-field "Required field" hints instead of silently sending a partial payload. Errors clear as the admin types.
- **Field icon state** — green checkmarks on initial load now only appear when a field's value matches the DB-stored state. Icons switch to a muted circle on edit (unsaved) and to a red indicator on save failure.
- **Dirty field tracking on PUT** — the save payload now contains only fields the admin actually changed. Masked placeholder values (`••••••••1234`) are treated as unchanged and omitted from the PUT body, preventing accidental overwrites of the existing encrypted values.

---

## 0.104.0 - 2026-05-03

### Added

- **Stripe credentials admin UI** — admins can now paste their Stripe secret key, publishable key, and webhook secret directly in **Settings → Commerce → Stripe Payment**. The backend validates keys against the Stripe API before saving, encrypts the secret key and webhook secret with AES-256-GCM, and auto-generates an encryption key to the database on first use (no environment variables required for initial setup). After saving, the store is payment-ready without a redeploy.
- **Runtime Stripe configuration gate** — the checkout button and the admin Orders page payment banner now reflect the actual saved credential state at request time (server-side DB check) instead of a build-time `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` check. Customers see the checkout button immediately after the admin saves keys; no Vercel redeploy needed.
- **Stripe account details surface** — after saving valid keys, the Commerce settings page displays the connected Stripe account name, account ID, mode (Test / Live), and last-verified timestamp.
- **Mode detection on secret key field** — the secret key input shows a live Test Mode / Live Mode badge as the admin types, catching key-mode mismatches before submission.

---

## 0.103.2 - 2026-04-27

### Performance

- **Product page parallelizes related/addons/category-siblings fetches** — `app/(site)/products/[slug]/page.tsx` previously ran four top-level fetch steps sequentially (`getProductBySlug` → `getRelatedProducts` → `getProductAddOns` → `getProductsByCategorySlug`). The last three only depend on results from the first and are independent of each other, so series-mode meant the page's total latency was the sum of all four for no benefit. Wrapped in `Promise.all`, fanning the latter three out concurrently — total latency now reduces to roughly the slowest top-level fetch (an individual helper like `getProductAddOns` still runs its own internal queries sequentially, so the absolute floor isn't a single round-trip). Net cut is large enough to make the result→product transition from the search drawer feel instant. No behavior change beyond timing; same data flows through `ProductClientPage`.

---

## 0.103.1 - 2026-04-27

### Fixed

- **Menu Builder mutations now invalidate the search-drawer-config cache (#10)** — when admin reordered, renamed, attached, or detached categories under the chip-label via Menu Builder, the storefront drawer chips would lag for up to 60 s due to the `unstable_cache` TTL on `getCachedSearchDrawerConfig`. Only the admin Search Settings PUT route fired `revalidateTag` — the ~18 Menu Builder mutation actions did not. Extracted a one-line helper at `lib/cache/revalidate-search-drawer.ts` and wired it into every successful mutation across `app/admin/product-menu/actions/labels.ts` and `app/admin/product-menu/actions/categories.ts`. Even when a mutation doesn't touch the chip-label, the tag is still marked stale and the next request rebuilds the tagged cache — that overhead is acceptable for low-frequency admin writes, so we call it from every relevant mutation rather than gating on whether the chip-label was touched.
- **Consistent product order on category page + search index (#12)** — `/single-origin` and the Single Origin chip filter showed the same total count of products but in a different order above the fold. Cause: neither query had an explicit `orderBy`, so both fell back to Prisma's implementation-defined default which differed between contexts. Both `lib/data.ts` `getProductsByCategorySlug` and `app/api/search/index/route.ts` now sort by `[{ isFeatured: "desc" }, { name: "asc" }]` — featured first, then alphabetical. Test asserts the contract on the search-index route so the two surfaces don't drift.

---

## 0.103.0 - 2026-04-26

### Added

- **`<Chip>` + `<ChipPreview>` UI components** ([components/ui/chip.tsx](components/ui/chip.tsx)) — codifies the chip design language as a reusable `cva`-based component (mirrors the existing Badge pattern). Variants: `active` (bg-primary), `inactive` (bg-secondary opacity-60 hover-80), `preview` (read-only, no hover). Sizes: `nav` (text-sm rounded-md) for search-drawer-scale chips, `filter` (text-xs rounded-full) for filter-pill-scale. `aria-pressed` derived automatically from `variant === "active"` with explicit-prop override. 11 component tests.
- **`docs/architecture/SEARCH-ARCHITECTURE.md`** — new architecture doc covering the search feature end-to-end: drawer (client-side MiniSearch) + legacy `/search` (server FTS), design principles, data flow, admin surface, and the scale envelope (target catalog ≤ ~200 products). The "Scale envelope" section documents the two scale-dependent items deliberately deferred at this size (full-catalog `/api/search/index` payload + layout-time `getSearchDrawerConfig` cached with periodic misses/revalidation), each with revisit triggers and the correct mitigation if those triggers fire.
- **`docs/features/keyword-search-drawer/nitpicks.md`** — durable list of post-launch polish items, with status (shipped / open / deferred / won't-fix) so the queue is reviewable from the feature directory rather than scratch memory.
- **Search drawer chip-active load animates with staggered fade-in** — chip-click product grid now reuses the homepage `<ScrollReveal>` component (same pattern `<FeaturedProducts>` uses for its product cards), re-keyed on the active chip slug so the animation re-fires on each chip change. Consistent entrance feel across the storefront.
- **Admin auto-save error indicator** — `/admin/settings/search` now surfaces a transient "Couldn't save — try again" hint under the dropdown when a PUT fails and the field rolls back. Auto-clears after 4s or on the next successful save. `role="status"` + `aria-live="polite"`.

### Fixed

- **Search drawer closes on link click even when the route is unchanged** — the `usePathname()` effect (v0.102.1) didn't fire when a link inside the drawer pointed to the user's current path (e.g. user on `/products/foo`, opens search, taps Foo). Replaced with an event-delegated `onClick` on the drawer body that closes whenever any anchor inside is clicked, regardless of where it routes. The pathname effect was removed in the same pass — the delegated handler is the sole close path now and covers both cross-route and same-route navigations. 6 unit tests.
- **Search drawer typed query clears on close (#7)** — `query` was component-local state and persisted across drawer open/close cycles, surfacing a stale query when the user reopened. Moved into the Zustand store; `close()` and the closing branch of `toggle()` now clear all three: `isOpen`, `activeChipSlug`, `query`.

### Changed

- **Storefront search drawer chips + admin LabelSelect preview migrated to `<Chip>` / `<ChipPreview>`** — visually identical output, but the inline className strings are gone. Review brew-method pills deliberately NOT migrated (they use bg-secondary opacity-100 for active rather than bg-primary; would need a future "subtle-active" variant).
- **`SearchDrawer.tsx` event-delegated drawer body** — the body's outer `<div>` now carries the close-on-anchor-click handler. No regressions to the input row, chip row, or scrollable body.

---

## 0.102.4 - 2026-04-26

### Fixed

- **Mobile: search drawer keyboard stays up, menu reopens after closing search without navigating** — v0.102.2 closed the menu Sheet *before* opening the search drawer. Two side-effects: (a) Radix Sheet's close-auto-focus reclaimed focus from the search drawer's autoFocus Input on mobile, retracting the keyboard immediately after it appeared, and (b) closing the search drawer (without navigating) left the user with no menu to return to. v0.102.4 keeps the close-before-open mechanism (the dual-focus-trap was unavoidable when both overlays mounted simultaneously) and adds two fixes: (1) `onCloseAutoFocus={preventDefault}` on the menu SheetContent so the closing Sheet doesn't yank focus back to the hamburger trigger; (2) reopen the menu Sheet automatically when the search drawer closes WITHOUT a pathname change — so "tap Search → change my mind → back to the menu" works naturally.

### Changed

- **Mobile menu Sheet closes on navigation via pathname effect** — same shape as the search drawer's effect, removes the need for individual `<SheetClose>` wraps on every nav link.

---

## 0.102.3 - 2026-04-26

### Changed

- **Seed taste-category assignment is more discriminating** — `prisma/seed/menu.ts` `findTasteCategories` now matches against `tastingNotes` only (was matching both notes AND description, which produced ~86% overlap between Fruity & Floral and Medium Roast because marketing copy uses fruit/spice/cocoa words liberally). Adds basic coffee-domain gating: Fruity & Floral excluded from DARK roasts (caramelization suppresses bright top notes) and Spicy & Earthy excluded from LIGHT roasts (those notes need MEDIUM+ development). After reseed, F&F ∩ Medium Roast overlap drops to ~77%; further reduction requires actual tasting-note diversification in seed data (deferred).

---

## 0.102.2 - 2026-04-26

### Fixed

- **Mobile menu Sheet closes before opening the search drawer** — on mobile, tapping the Search item inside the hamburger menu was leaving the menu Sheet open behind the search drawer. Tapping a search result then navigated, search drawer auto-closed (per v0.102.1), but the menu Sheet stayed mounted over the destination. `SearchTrigger` now accepts an optional `onBeforeOpen` callback that runs synchronously before the search drawer opens; the mobile-menu wiring passes a closer for the menu Sheet so the two overlays no longer stack. Desktop is unaffected (it uses `NavigationMenu`, not Sheet).

---

## 0.102.1 - 2026-04-26

### Fixed

- **Search drawer auto-closes on navigation** — clicking a search result, curated card, or chip-active card was navigating to the product page but leaving the drawer overlay up over the destination, making the click feel unresponsive. Added a `usePathname()` effect to close the drawer on any pathname change, so every Link inside (current and future) just works without each one needing an explicit `onClick={close}`.

---

## 0.102.0 - 2026-04-26

### Added

- **Keyword search drawer (v2)**: right-anchored slide-in (vaul) drawer triggered from the storefront header. Loads the catalog index once per session and runs MiniSearch (fuzzy, field-weighted: name 4× > category names + tasting notes 2× > origin 1.5× > description 1×). Three body states (empty / chip-active / results / no-results) all share a persistent chip row. Chips drive an in-drawer category filter — no navigation, no URL change. Curated, chip-active, and no-results-fallback grids render through the canonical `<ProductCard>`; search results use a denser horizontal mini-card (image + name + RoastLevelBar + tasting notes for coffee, image + name + description for merch).
- **Admin Search Settings** at `/admin/settings/search`: two auto-saving sections — chip Label single-select (drives the storefront chip row from a `CategoryLabel`) + Curated Category single-select. Reads-only chip preview below the Label dropdown matches storefront chip styling at 60% opacity. No Save button — every change PUTs immediately and silently rolls back on failure.
- **Hidden "Top Categories" CategoryLabel** in seed: `isVisible: false` so it never appears in the product menu nav, but the search drawer reads labels by id without a visibility filter so its 6 attached categories (single-origin, fruity-floral, medium-roast, cold-brew-blends, drinkware, central-america) drive the chip row.

### Changed

- **`productCardIncludes` extended**: category include now selects `name` in addition to `slug` so the search index can boost matches against category names without an extra query. Additive — no consumer regression.
- **Coffee primary category**: `prisma/seed/menu.ts` now assigns Single Origin (or the matching Blend variant) as `isPrimary: true` on every coffee, mirroring the data intent in `prisma/seed/products.ts`. Roast Level / Taste / Region attachments stay as secondary. Restores `/single-origin` storefront category page (was empty before — 0 attachments) and aligns with the search drawer's chip filter.
- **Drawer chip filter matches any attached category**: filter uses `categories.some((c) => c.category.slug === activeChipSlug)` instead of primary-only. `/api/search/index` loads all categories (sorted `isPrimary desc` so `categories[0]` still resolves to primary for ProductCard URL routing). Adds ~6 KB to the single search-index fetch — cached 60s + SWR 300s. All 6 demo chips have results: single-origin (24), fruity-floral (22), medium-roast (22), cold-brew-blends (1), drinkware (4), central-america (10).
- **Search index searches all attached category names**: `useSearchIndex` extracts `categories.map((c) => c.category.name).join(" ")` for the search field (renamed `primaryCategoryName` → `categoryNames`). Typing "medium" now finds every Medium Roast coffee, not just the few whose primary happens to be Medium Roast.
- **Chip theming unified**: all chip surfaces (storefront search drawer, admin LabelSelect preview, review brew-method pills) share the same theming language — `bg-secondary` at 60% opacity for inactive (hover 80%), `bg-primary` for active (search drawer only). Pills/chips no longer render with a hairline near-white border; the secondary-color tint provides visual definition.
- **`.gitattributes`**: forces LF on `*.sql` to prevent Windows CRLF from breaking Prisma's recorded migration checksums.

### Removed

- **Deprecated SiteSettings rows** dropped via migration `20260425200000_search_drawer_v2_label_based`: `search_drawer_chips_heading`, `search_drawer_chip_categories`. Replaced by single key `search_drawer_chip_label` (stores `CategoryLabel.id`).
- **`TopCategoriesMultiSelect.tsx`** deleted — replaced by `LabelSelect.tsx`.

### Fixed

- **Drift**: re-syncs `Order.refundedAmountInCents` to `NOT NULL DEFAULT 0` (matches schema; column had been left nullable by an earlier hand-edited migration).
- **Backup script**: `scripts/backup-database.ts` referenced a non-existent `productImage` model; updated to the actual schema (added `variantImage`, `passwordResetToken`, `telemetryEvent`, `review`, `reviewVote`, `reviewEmailLog`).

---

## 0.101.0 - 2026-04-25

### Removed

- **Smart Search / Counter extracted to platform plugin**: The agentic search layer (Counter UI, NL extraction, voice examples, voice surfaces, intent classification, follow-up chips, conversational cadence) is no longer in the core ecomm-ai-app. The feature has been hard-paused in this repo and earmarked for a platform-developed plugin (opt-in, monetized) — see `docs/internal/smart-search/README.md` for the full archive, iteration history, root-cause analysis, and rebuild plan
- **Affected surfaces**: deleted `lib/ai/`, `lib/store/chat-panel-store.ts`, `app/(site)/_components/ai/`, `app/admin/settings/ai/`, `app/api/admin/settings/ai-search/`, `app/api/settings/voice-surfaces/`, `app/api/recommend/`, `app/api/search/__tests__/`, `types/search.ts`, and the corresponding feature docs at `docs/features/smart-search-ux/` + `docs/features/agentic-search/`
- **SiteSettings AI rows**: migration `20260425120000_drop_smart_search_settings` deletes `ai_voice_persona`, `ai_voice_examples`, `ai_voice_surfaces`, `ai_voice_surface_prompt_hash`, `ai_smart_search_enabled` keys

### Changed

- **`/api/search` is keyword-only**: agentic branch removed; route handler slimmed from 443 LOC to ~125 LOC; PostgreSQL `tsvector` + `ts_rank` ranking remains the foundation
- **FTS utilities relocated**: `tokenize` + `fullTextSearchIds` moved from `lib/ai/extraction.ts` to `lib/search/full-text.ts` (no LLM dependency)
- **Search page**: keyword-only UI, no Ask AI toggle, no Smart Search badge, no acknowledgment, no follow-up chips
- **Site header**: Counter trigger replaced by `Search` icon linking to `/search` (mobile and desktop)
- **Admin nav**: `Settings → AI` entry removed from both nav config and route registry

### Why

Per [`docs/internal/smart-search/README.md`](docs/internal/smart-search/README.md): rule accretion across 8 iterations made the feature structurally fragile (4 sources of truth for coffee domain knowledge, ~30% false-green tests, zero observability). Platform velocity now demands a polished keyword search as the first-class core experience. Eval-driven rebuild lives with the future plugin, not in this repo.

---

## 0.100.10 - 2026-04-22

### Added

- **Counter copy button**: Clickable copy icon below AI responses — copies acknowledgment text to clipboard with 1.5s check feedback

### Fixed

- **Merch product search**: AI now extracts `productKeywords[]` from merch queries and drives Prisma OR clauses from those terms instead of raw NL query string — "do you have a pour over coffee maker?" now finds the Origami Air Dripper
- **Compare/recommend intent**: When the AI extracts `compare` or `recommend` intent, the route returns AI reasoning only with no product cards — the extraction pipeline now recognises these intents
- **Chip progressive filter**: Follow-up chip clicks apply a client-side filter against the current result set — no new API call, no loading spinner
- **Voice surface staleness**: Prompt hash stored alongside voice surfaces; stale hash on load triggers automatic regeneration before serving

### Improved

- **Extraction contract**: `FiltersExtractedSchema` (Zod) is now the single source of truth — TypeScript type, prompt JSON spec, and runtime validation all derived from it
- **Extraction prompt**: Examples neutralized (JSON structure only, no phrasing/flavour bleed); vague-query rule prevents narrow filter inference from open-ended queries

---

## 0.100.9 - 2026-04-19

### Changed

- **Counter SRP refactor**: `app/api/search/route.ts` split into focused modules — `lib/ai/extraction.ts` (extraction prompt + AI call + NL heuristics), `lib/ai/prompts.ts` (system prompt), `lib/ai/catalog.ts` (catalog snapshot), `types/search.ts` (shared types). Route slimmed to 395 lines of orchestration-only code. No behavior change.

---

## 0.100.8 - 2026-04-18

### Added

- **Counter conversation history**: Prior turns are passed to the extraction pipeline — follow-up queries narrow the previous context ("show me something darker" understands what "something" referred to)
- **Counter intent classification**: `how_to` (e.g., "how do I brew a V60?") and `reorder` queries return zero products with an AI explanation; the Counter stays in character instead of showing an irrelevant product grid
- **Counter `standby` voice surface**: Owner-configurable passive message shown on subsequent opens and after reset — distinct from the salutation so customers don't receive the same greeting on every open
- **Session greeting awareness**: Counter tracks within the browser session whether it has already greeted — subsequent opens show the `standby` surface, not a repeated salutation
- **Test Counter button**: Admin → AI Settings opens the Counter in a fresh state, loading the latest voice surfaces immediately after Q&A edits
- **Integration test scaffold**: `npm run test:integration` fires real queries against the running dev server and verifies intent classification, acknowledgment quality, and cadence shape — excluded from `test:ci`

### Changed

- **Lazy voice surface init**: Surfaces are generated on first Counter open (GET request), not on app load — eliminates the TS-constant flash before owner copy loads
- **Context-aware greeting**: Greeting references the current product or category on first open; homepage greeting is context-free
- **Origin filtering — catalog-driven**: Regional queries ("Central America coffee") expand to the actual catalog origins the store carries, not a hardcoded country list
- **Neutral default voice surfaces**: `DEFAULT_VOICE_SURFACES` is now generic placeholder copy — no store-specific phrases bleed into an unconfigured installation
- **Cadence enforcement**: Server clears follow-up chips when `products.length ≤ 3` — specific queries don't prompt unnecessary narrowing
- **Eager surface regeneration**: Q&A save triggers async surface regen so Test Counter opens with fresh copy immediately

### Fixed

- **Coffee domain knowledge**: Roast, origin, brew method, and experiential term mappings added to the system prompt — "approachable", "gift for mom", "bold" now reliably map to concrete product attributes
- **System prompt guardrails**: Explicit bans on search-oriented language ("nothing matching", "I can't think of") and stock availability assertions added to the generation prompt
- **Skeleton loader**: Counter panel shows a skeleton bubble while voice surfaces are loading rather than a blank message area
- **App-side price sort**: `price_asc`/`price_desc` sort applied post-Prisma; results arrive correctly ordered
- **Follow-up chip pre-validation**: Chips that would return zero results are filtered before rendering

---

## 0.100.7 - 2026-04-15

### Fixed

- **Plan detail quotas**: eliminated `[object Object] / month` by aligning `PlanDetails.quotas` type with the actual API shape (array of `{icon, slug, label, limit}` objects); renderer updated to use `quota.label` / `quota.limit`; removed dead `formatQuotaLabel` helper

## 0.100.6 - 2026-04-14

### Fixed

- **Admin nav active state**: Dashboard no longer highlights on every admin page — nav items now use the route registry (`useHasActiveDescendant`) instead of a naive pathname-prefix check that matched `/admin` against all admin routes

## 0.100.5 - 2026-04-14

### Fixed

- **Counter keyboard retention on Android**: Input no longer disabled during AI response — keyboard stays open throughout the conversation
- **Counter focus steal prevention**: Container-level `onPointerDown` guard replaces per-element handlers — badges, chips, and send button no longer steal focus from the input
- **More/Less badge context**: Toggling product list now scrolls the badge into view instead of jumping to the bottom of the conversation
- **Voice surfaces defaults**: Surface strings now always come from DB, not TS constants; seed writes defaults to DB on first install
- **Voice surfaces generation prompt**: Context-only descriptions — the model derives tone from Q&A examples, not prescriptive copy instructions
- **Counter drawer viewport offset**: Drawer correctly tracks `visualViewport.offsetTop` so it stays below the nav bar when the keyboard opens on mobile
- **`crypto.randomUUID` dev fallback**: Non-secure HTTP dev access no longer throws — fallback scoped to `NODE_ENV === "development"` only; production always uses the secure API

## 0.100.4 - 2026-04-13

### Fixed

- **Hero aspect ratio on mobile**: VideoHero now uses `aspect-video` (16:9) on xs/sm breakpoints instead of `aspect-[3/1]`, preventing the hero from appearing too narrow on phones
- **Theme switcher Sun icon**: Added `relative` to the ghost button wrapper so the absolutely-positioned Sun icon anchors correctly within the button bounds; fixes Sun icon not appearing in dark mode
- **Stepper input border**: Changed `border-border` → `border-input` on the quantity input so it matches the `outline` button variant border on either side (consistent stepper appearance)
- **Product card image aspect ratio on mobile**: `ProductCard` image now uses `aspect-[2/1]` below md breakpoint (consistent with the PDP image carousel), instead of `aspect-square`; keeps square on md+ grid layouts

## 0.100.3 - 2026-04-13

### Added

- **Counter panel**: Smart Search Assistant renamed to "Counter" — framed as a conversation at the shop counter, not a search tool
- **AI guardrails**: System prompt enforces never swearing, never breaking character, and redirecting off-topic or abusive inputs in the owner's voice
- **Voice pipeline tests**: New fixture tests for `buildSystemPrompt` Q&A embedding and `generateVoiceSurfaces` pipeline (20 new tests, 1244 total)

### Changed

- **Mobile Counter drawer**: Full viewport width on mobile (was 85vw); desktop remains narrow right drawer
- **Product cards**: Two-liner format — coffee shows `{Roast level} — {tasting notes}`, merch shows truncated description; no price shown; roast label formatted as "Light roast / Medium roast / Dark roast"
- **Acknowledgment length**: Removed "1 sentence" cap — voice examples guide the natural length and rhythm of each response
- **Follow-up chips**: Context-aware question and chip labels derived from query intent (gift/occasion/mood), not a fixed roast-level default; chips use customer language not coffee-trade jargon
- **Experiential term mapping**: Extraction prompt now expands mood/experience terms into flavor notes ("approachable/smooth" → balanced/caramel/chocolate; "bold" → dark chocolate/earthy/tobacco)
- **Gift/popularity signals**: "gift", "well-loved", "crowd-pleaser", "beginner" triggers `sortBy: "top_rated"`
- **Search scope**: Always restricts to `type: COFFEE` — merch queries return no results and the `noResults` voice surface handles recovery
- **Vague queries**: When AI runs but extracts no specific filters (e.g. "gift for my mom"), keyword OR is cleared and a broad coffee selection is returned so follow-up chips can narrow from real results
- **Voice surfaces placeholder**: Panel input placeholder comes from owner's voice surfaces (generated from Q&A examples), not hardcoded copy
- **Admin AI settings**: Smart Search section consolidated here; deprecated AI Chat / Coffee Recommender / About Page Assistant toggles removed; per-field auto-save with inline status indicator
- **Chip border**: `border-primary/40` — visible in both light and dark mode
- **Settings nav active state**: Overflow dropdown uses pathname-based matching instead of broken `findRouteByHref`

### Fixed

- **Loading animation**: Waiting dots animation now starts from 0 (empty) before cycling
- **Mobile viewport height**: Restores correct panel height after keyboard dismissal
- **Click product → close Counter**: Clicking a product card closes the Counter panel before navigating to PDP
- **Chips alignment**: Follow-up chips left-aligned to message indent (`pl-5`)
- **Placeholder merge**: Voice surfaces loaded from DB now merge with defaults — keys added after initial generation (e.g. `placeholder`) are always present

## 0.100.2 - 2026-04-12

### Fixed

- **Search relevance — AI extraction clears keyword OR**: When AI extracts structured filters (flavorProfile, roastLevel, etc.), the broad keyword OR clause from NL tokenization is now discarded before AI filters are applied. Previously, tokens like "coffee" or "notes" matched nearly every product via `description contains`, drowning out the AI's precise intent (e.g. "tropical fruity notes" returned Breakfast Blend/Mexican Altura because of "notes").
- **Search quality — PostgreSQL full-text search with TF-IDF ranking**: Keyword fallback path now uses `tsvector`/`tsquery` with `ts_rank` instead of Prisma `contains`. High-frequency words like "coffee" and "notes" automatically score lower; rarer discriminating words rank higher.
- **AI flavor expansion**: Extraction prompt now guides the AI to expand abstract flavor categories into concrete tasting notes (e.g. "citrus" → `["citrus", "lemon", "lime", "bergamot"]`) so products with "Lemon, Bergamot" notes match "bright citrus" queries without requiring literal "citrus" in descriptions.
- **Silent failure eliminated**: ChatPanel now always renders a response, even when search returns empty. Three-branch fallback: AI explanation → aiFailed recovery → noResults voice surface. Secondary indicator softened from "No matching products found" to inviting "Hmm, nothing quite lining up — tell me a bit more about what you like?"
- **Sort validation**: Removed `price_asc`/`price_desc` from supported sort options — Prisma doesn't support the nested aggregate orderBy through variants→purchaseOptions needed for these sorts. Revisit when a denormalized minPrice column exists.

### Added

- **Search relevance fixture tests**: 8 new fixture tests (AC-TST-1 through AC-TST-8) verify AI extraction clears keyword OR for various query patterns (fruity, tropical, organic, price-range, chocolate, comparative sort).

## 0.100.1 - 2026-04-12

### Fixed

- **Vercel build**: Added `pg`, `ws`, `@prisma/adapter-pg`, `@prisma/adapter-neon`, and `@neondatabase/serverless` to `serverExternalPackages` so Next.js does not attempt to bundle Node.js-native packages, resolving `Module not found: Can't resolve 'net'` build failures

## 0.100.0 - 2026-04-11

### Added

- **Smart search chat panel**: Conversational product search drawer (vaul Drawer, right side overlay) with AI-powered explanations, product cards, and follow-up chips
- **AI voice persona**: Admin-configurable AI personality for search responses with conversation preview
- **Search quality**: AI extraction with structured intent, roast/origin/flavor filters, and type-safe product matching (COFFEE vs merch)
- **AI failure handling**: Friendly fallback message when AI extraction fails; `aiFailed` flag surfaced to UI so junk keyword results are suppressed

### Fixed

- **Double scrollbar**: Site pages now use `html:has([data-site]) { overflow-y: auto }` to eliminate the useless viewport scrollbar alongside `#site-scroll`; admin pages retain `overflow-y: scroll` for layout stability
- **Drawer scroll lock**: `#site-scroll` locked when drawer opens; stale vaul body styles (`pointer-events`, `overflow`) cleaned up after close animation
- **AI truncated JSON**: Bumped extraction `maxTokens` 500 → 1024 and added JSON repair for truncated model responses
- **Product images in chat**: Uses `getPlaceholderImage()` fallback (same as ProductCard and shopping cart) instead of showing blank thumbnails
- **Drawer accessibility**: Added `DrawerDescription` (sr-only) to fix missing aria-describedby warning; removed focus outline on drawer click

### Changed

- **Search icons**: Replaced custom SmartSearchIcon with `MessageSquareDot` (lucide) across header, mobile menu, and chat panel
- **Chat panel layout**: Mounted outside flex row as portal overlay; page content stays full-width when panel is open
- **Follow-up chips**: Now 2–4 word option labels (not question strings); question embedded in explanation text
- **Product display**: 3 products shown by default with "More/Less" badge toggle on last card border

## 0.99.1 - 2026-04-08

### Fixed

- **Video hero**: switched to `aspect-[3/1]` container with `object-contain` so videos are letterboxed rather than cropped; added 3:1 ratio hint in admin settings
- **Hero overlay**: dark overlay now only renders when a heading or tagline is present (image, carousel, and video variants)
- **Homepage**: removed "Find Your Coffee" CTA section under the hero
- **Search — NL fallback**: tokenized keyword fallback for natural-language queries when AI is not configured (e.g. "what's good with v60" now returns results by searching meaningful tokens)
- **Search — AI extraction**: strips markdown code fences that some models add despite instructions; bumped `maxTokens` 300 → 500 to prevent truncated JSON
- **Search — follow-up chips**: AI now generates short action labels ("Light roast", "Ethiopian") instead of clarifying questions; chips preserve AI mode when clicked
- **Search — roast + terms**: mixed queries like "dark roast Ethiopia" now apply both the roast category filter and a token search for remaining terms
- **Demo mode**: setup checklist hidden in demo mode; demo banner removed from admin shell

### Added

- **Ask AI toggle**: search page shows an "Ask AI" button (only when AI keys are configured) that switches the input into conversational mode — different placeholder, AI extraction forced, synced from URL for deep-linking

## 0.99.0 - 2026-04-07

### Added

- **Agentic product search**: Natural-language queries (e.g. "something smooth for a V60") are classified by a heuristic and optionally processed by an LLM that extracts structured intent (roast level, origin, brew method, flavor profile). Results include a plain-English explanation and 2–3 follow-up suggestion chips. Keyword queries bypass the LLM entirely for speed.
- **Homepage hero**: Configurable full-width hero section supporting image, image carousel, and video modes. Admins can upload media, set heading/tagline, and enable/disable the hero from the storefront settings page. Replaces the legacy ChatBarista floating widget with a "Find Your Coffee" CTA linking to the new agentic search.

## 0.98.5 - 2026-04-07

### Fixed

- Admin signin card now centers correctly on soft navigation (signout, session redirect) — switched from `min-h-screen` to `fixed inset-0` to escape any parent layout constraints during route transitions

## 0.98.4 - 2026-04-03

### Changed

- Excluded `docs/internal/` from TypeScript compilation — local dev scripts were causing spurious `tsc` errors
- Removed stale `dev-tools/` scripts (backfill-add-on-links, backup-database, check-backup-models, restore-database)
- Marked Product Reviews Tier 1 roadmap as fully shipped

## 0.98.3 - 2026-04-02

### Security

- Patched 17 npm vulnerabilities (1 critical, 13 high, 6 moderate) via `npm audit fix`
- Upgraded `@anthropic-ai/sdk` from 0.80.0 to 0.82.0 (moderate severity fix)
- Removed `localtunnel` from devDependencies (carried vulnerable `axios` 0.21.4)

## 0.98.2 - 2026-04-01

### Added

- **Terms page acceptance dates**: `acceptedAt` and `acceptedVersions` from platform license validation now render on each Terms doc page — shows accepted version + date, or Accept button for pending docs
- **Ticket reply thread**: Priority support tickets now open a detail sheet with the full conversation thread and a reply form — store owners can reply without leaving the admin

## 0.98.1 - 2026-03-29

### Added

- feat(profile): add admin password change via SecurityTab reuse

## 0.98.0 - 2026-03-28

### Added

- **QA self-healing pipeline**: When the nightly QA run fails, a `self-heal` job now automatically classifies the failure and takes action:
  - **Category A** (stale `AC_HINTS` label) — repair agent navigates to the failing page, asks Claude to propose a corrected hint, verifies the fix with `STOP_AFTER=<acId>`, and opens a PR if the AC passes
  - **Category B** (app regression) — posts recent git commits on relevant paths to the open GitHub issue
  - **Category C** (infra / budget) — probes the health endpoint and posts the result to the open issue
- **`qa-results.json`**: `qa-agent.js` now writes a structured results file on every exit path (exit 0/1/2/3) — captures per-AC `toolCallTrace`, `turnCount`, `finalPageSnapshot`, and `finalPageUrl`
- **`qa-classify.js`**: Failure classifier with conservative Category A detection — requires hint key + interaction tool in trace + element-not-found evidence; any ambiguous AC resolves to B
- **Fixture mode** (`workflow_dispatch fixture_results=...`): Inject a pre-built results JSON to test each self-heal pipeline path without triggering a real nightly failure
- **`qa-enrich-issue.js`**: B/C diagnostic commenter — health probe for infra failures, `git log` on relevant paths for regressions; 24h noise guard
- **`qa-repair-agent.js`**: Claude SDK + Playwright repair loop — proposes, applies, and verifies `AC_HINTS` fixes; opens PR on pass, reverts on fail; duplicate-PR guard

## 0.97.7 - 2026-03-28

### Fixed

- **AC-KV-2**: QA agent hint corrected from `"Email address"` to `"Email"` — label mismatch caused silent fill failure, preventing sign-in redirect and exhausting turn budget on retry

### Added

- **`npm run qa:reset`**: New local QA reset script — reads `QA_DATABASE_URL` from `.env.local`, auto-extracts Neon endpoint ID, calls teardown without manual env setup
- **`STOP_AFTER` env var**: Run the full install flow and stop after a specific AC (e.g. `STOP_AFTER=AC-KV-2`) — useful for targeted local fixes that need prerequisite state
- **`RUN_ONLY` env var**: Run a single AC standalone, bypassing install flow and blocker gates
- **Runbook local reproduction**: Updated `docs/internal/runbook-qa-nightly.md` with accurate local test instructions and a table explaining when to use each run mode

## 0.97.6 - 2026-03-28

### Fixed

- **Demo toasts**: `variant: "demo"` applied to ConnectedAccountsTab, AddressesTab, DangerZoneTab, SecurityTab — was missing from storefront account page guards
- **Security tab state reset**: Password fields and message cleared when demo guard fires
- **Addresses tab state reset**: `deleteId` cleared when demo guard fires — prevents confirmation UI staying armed
- **AdminTopNav password toast**: Amber variant now only applied in demo mode; live build uses default toast
- **demo-actions.ts**: Removed false `"Something went wrong"` return after successful redirect
- **license.ts comment**: Updated to reflect both `"demo"` and `"DEMO"` as accepted values
- **Demo behavior inventory doc**: Fixed local Windows path reference and wrong version claim

## 0.97.5 - 2026-03-28

### Fixed

- **ESLint warnings**: Removed unused `passed`/`total` vars from commit hook; added missing `original` dependency to `useCallback` in AI settings page

## 0.97.4 - 2026-03-28

### Added

- **Demo badge**: Amber "DEMO" superscript badge next to store logo in both the storefront header and admin top nav — visible indicator without a disruptive banner
- **Warning theme token**: `--warning` CSS variable (oklch) with dark mode variant — used by the demo toast and badge

### Fixed

- **Demo toast color**: All IS_DEMO toast guards now use `variant: "demo"` (amber) across admin and storefront — previously rendered as default white toast
- **Demo form state reset**: Profile, AI settings, social links, support ticket, and SettingsField forms now reset to original values when the demo guard fires
- **Account tab navigation**: Tabs no longer ignore client-side navigation — switched to controlled Radix Tabs with URL sync via `useRouter` and `Suspense` boundary
- **Demo customer redirect**: Signing in as demo customer now lands on `/account` instead of `/`
- **Review moderation**: IS_DEMO guard removed — reviews work normally in demo mode and are reset via cron reseed
- **Project skills**: Moved from `.claude/skills/*/SKILL.md` to `.claude/commands/*.md` so slash commands are correctly resolved by Claude Code

## 0.97.3 - 2026-03-25

### Fixed

- **Banner hydration error**: Both demo banners used `typeof window !== "undefined"` in `useState` lazy initializers — a known React hydration mismatch pattern. Replaced with `useSyncExternalStore` (`getServerSnapshot: () => false` matches initial client render; `getSnapshot` reads `localStorage` post-hydration). Storage events are filtered by key to avoid spurious re-renders
- **Middleware scope reverted**: `middleware.ts` matcher rolled back to `/api/admin/:path*` only — the broader `/api/user/:path*` addition in v0.97.2 was causing instability; user-API route protection will be re-added in a follow-up once fully validated

## 0.97.2 - 2026-03-25

### Fixed

- **Demo banner persistence**: Dismissed state for both the public site banner and admin banner now persists across sign-in/sign-out via `localStorage` — previously reset on every remount
- **Demo banner flash on sign-out**: Public site banner no longer flashes during the auth session transition when signing out — hidden during `"loading"` state as well as `"authenticated"`
- **Admin demo banner dismiss**: Banner now actually hides when dismissed — previous cookie approach set a cookie but never read it, so the banner never disappeared
- **Demo mode API guard**: Middleware extended to cover `/api/user/:path*` — profile and password updates are now blocked in demo mode alongside admin mutations
- **Demo account protection**: `admin@artisanroast.com` and `demo@artisanroast.com` are protected from email changes at the API level — returns 403 instead of allowing the change
- **Email change session loop**: Changing email on the account profile page now auto-signs out after success — prevents the 307 redirect loop caused by a stale JWT session referencing the old email
- **Admin "Back to store" link**: Removed `target="_blank"` — link now navigates in the same tab, eliminating the momentary blank tab flash
- **CI node version**: Build workflow updated to Node 24 to match `engines.node >=24`
- **CI build trigger**: `package.json` excluded from the build-safe paths filter — version-bump-only PRs no longer trigger a full CI build

## 0.97.1 - 2026-03-25

### Fixed

- **Store name SSR**: Storefront header now renders the configured store name on first paint — eliminates flash of default "Artisan Roast" before client-side settings fetch resolves (QA AC-KV-3)
- **E2E tests**: Moved Playwright E2E from PR gate to nightly cron — PRs no longer block on E2E runtime; `npm run test:e2e:pre-pr` available for local pre-PR validation

## 0.97.0 - 2026-03-25

### Added

- **Email provider settings**: New "Email Sending (Resend)" section on Contact Settings page — configure API key (masked), from email, and from name via the admin UI. Values are stored in DB and take precedence over environment variables
- **Test email button**: Send a test email from the Contact Settings page to verify your Resend configuration
- **Setup store name**: Optional Store Name field on the setup flow — seeds `store_name`, `email.fromName`, and `email.fromEmail` in the DB on first install

### Changed

- **Email send functions**: All four transactional email functions (`send-order-confirmation`, `send-merchant-notification`, `send-review-request`, `send-new-review-notification`) now read from-name and API key from DB settings with env var fallback — no restart required after changing email settings

## 0.96.19 - 2026-03-24

### Fixed

- **Domain migration**: `robots.ts` fallback URL updated to `demo.artisanroast.app` — all `NEXT_PUBLIC_APP_URL` fallbacks in layout, sitemap, robots, and OG images now reference the correct demo domain
- **Demo checkout**: Simulated checkout flow for demo mode — clicking Purchase on Add-Ons or Plans redirects to `?demo=success` instead of calling Stripe; a toast confirms "Demo mode, no charge made"

## 0.96.18 - 2026-03-24

### Fixed

- **Release script**: `npm run release:patch` no longer creates a redundant version-bump PR when `package.json` is already pre-bumped in the feature branch — detects the pre-bump and uses it as the tag version directly, making the release a fast tag+push with no extra CI run

## 0.96.17 - 2026-03-24

### Fixed

- **Admin nav**: Support & Services items now appear in the same order as the header menu (Submit Ticket → Plans → Add-Ons → License & Privacy)
- **Demo banner**: `DemoBanner` and all its hooks (`useSession`, `useEffect`, `useState`) are now completely excluded from the React tree on self-hosted instances — gated by a module-scope `IS_DEMO` constant in `SiteLayout` so zero overhead for non-demo builds
- **QA nightly**: Nightly workflow now resets the QA database itself (deletes Orders, EULA record, and Users) before running the agent — no longer depends on `install-test.yml` having run first; includes the same `QA_DB_ENDPOINT` endpoint guard to prevent accidental production wipes

## 0.96.15 - 2026-03-24

### Fixed

- **Setup page**: Left sidebar is now fixed full-height with the right pane scrolling independently — eliminates double scrollbar on Firefox and all browsers
- **Setup page**: Sidebar background image now eager-loads (LCP fix)
- **Add-ons page**: Real platform add-on packages now display for all installs — fetched from the public `/api/add-ons` platform endpoint; no longer requires a license key to show available packages
- **QA safety**: `qa-teardown.js` now requires `QA_DB_ENDPOINT` in `.env.local` and verifies `DATABASE_URL` contains it before deleting any data — prevents accidental production database wipes
- **QA safety**: `install-test.yml` validates `QA_DATABASE_URL` contains the expected Neon endpoint fragment (`QA_DB_ENDPOINT` secret) before running `prisma migrate reset --force`
- **Demo banner**: No longer shows on local dev when `NEXT_PUBLIC_DEMO_MODE` is removed from `.env.local` without restarting the dev server — banner render is now gated server-side; auth state managed client-side via `useSession()`, removing a per-request `auth()` call from the site layout
- **Setup checklist**: Branding is no longer a blocking check — checklist completes when products, payments, and email are configured; a permanent "Customize your store branding" link row directs attention to settings without blocking completion
- **Setup checklist**: Checklist now stays visible until manually dismissed (X button) — no longer auto-hides on completion, ensuring the branding suggestion remains accessible

### Performance

- **Product images**: First product card on homepage, category, and search pages now eager-loads via `priority` prop — fixes LCP warning for above-the-fold images; `priorityCount` prop lets callers control how many images get priority based on page layout

## 0.96.14 - 2026-03-23

### Fixed

- **Admin dashboard**: Setup checklist no longer shows on `artisanroast.app` — all setup status flags respect `NEXT_PUBLIC_DEMO_MODE=true` so the checklist is hidden when the store is fully configured in demo mode
- **Add-ons page**: Breadcrumb now correctly shows "Add-Ons" stub — `/admin/support/add-ons` was missing from the route registry
- **Add-ons page**: Demo add-on packages now display on `artisanroast.app` — when in demo mode with no license key, two sample packages are injected so the page is not empty

## 0.96.13 - 2026-03-23

### Changed

- **QA agent**: Rewrote `scripts/qa-agent.js` — Playwright + Claude Agent SDK replaces Puppeteer; per-AC agent loop reads the accessibility tree, no CSS selectors or fixed timeouts; AC_HINTS + tool filtering guide the agent through tricky interactions
- **QA agent**: `qa-nightly.yml` cron workflow (6am UTC) runs the agent against the settled QA deployment; `install-test.yml` now handles only DB reset + redeploy on push to main
- **QA agent**: All Claude calls route through Vercel AI Gateway (Max subscription billing); `ANTHROPIC_API_KEY` replaced with `VERCEL_AI_GATEWAY_BASE_URL` + `VERCEL_AI_GATEWAY_TOKEN` in CI secrets
- **QA agent**: Added `scripts/qa-teardown.js` (`npm run qa:teardown`) — resets local/QA DB to fresh-install state without `prisma migrate reset --force`; enables zero-intervention local QA iteration
- **Docs**: Updated `docs/features/app-qa/README.md`, `VERIFICATION.md`, `spec-drift.yml` comment, and root `README.md` to reflect new Playwright + Agent SDK methodology

## 0.96.12 - 2026-03-22

### Fixed

- **Storefront**: AI chat section no longer renders on the homepage when no AI provider is configured (`AI_BASE_URL` / `ai.baseUrl` not set) — fresh installs show a clean storefront instead of a non-functional chat UI
- **Storefront**: Featured products section header no longer renders when there are no featured products — prevents an empty section appearing on a fresh install

## 0.96.11 - 2026-03-22

### Fixed

- **Setup flow**: Platform branding in setup sidebar now uses `PLATFORM_NAME`/`PLATFORM_LOGO` constants — sidebar represents Artisan Roast the platform, not the store being configured
- **Setup flow**: `SETUP_PREVIEW=true` bypass now only applies when an admin already exists; on a fresh DB the normal setup flow runs as expected
- **QA agent**: `scrollIntoView` uses `behavior: "auto"` for cross-browser compatibility; fixed EULA text selectors and `SETUP_PREVIEW` logic

## 0.96.10 - 2026-03-22

### Changed

- **Setup flow**: Redesigned with split layout — branded sidebar (1/4) with coffee photo, brand description, and bold typographic tagline; full content area (3/4) with terms flowing openly (no inner scroll window)
- **Setup flow**: Added `SETUP_PREVIEW=true` dev env var to view `/setup` without wiping the admin account
- **Setup flow**: Avatar-icon stepper, friendlier copy throughout, natural-width buttons

## 0.96.9 - 2026-03-22

### Fixed

- **Security (XSS)**: Password reset callback no longer interpolates token into inline `<script>` — now redirects to `/auth/reset-password?token=<encoded>` (CodeQL #6)
- **Security (ReDoS)**: Replaced vulnerable email regex with `z.string().email()` in user profile and admin email settings routes (CodeQL #11, #12)
- **Security (path traversal)**: Vercel Blob URL check in image upload now parses hostname instead of using `.includes()` substring match (CodeQL #14, #16)
- **Security (weak randomness)**: Session tracking IDs now use `crypto.randomUUID()` instead of `Math.random()` in `useActivityTracking` and `SearchResults` (CodeQL #2, #3)

### Changed

- **Next.js**: Updated to 16.2.1
- **Prisma**: Updated to 7.5.0

## 0.96.8 - 2026-03-22

### Fixed

- **Auth pages**: Added `force-dynamic` to auth layout to prevent nightly build failures when DB is unavailable at build time (all `/auth/*` pages call `getSiteMetadata()` which hits Prisma)
- **QA agent**: `checkText` now includes `<input>`/`<textarea>`/`<select>` values so AC-KV-4 (store name on settings page) passes correctly
- **track-activity test**: Mocked Prisma to prevent DB connection timeout in CI

## 0.96.7 - 2026-03-20

### Added

- **Install assurance**: Automated post-merge CI verifies a fresh install on every push to main — deterministic Puppeteer script walks `VERIFICATION.md` ACs, opens a GitHub issue on failure; Claude Haiku called only on failure to generate issue body (~$0/run)
- **VERIFICATION.md**: Structured install spec (16 ACs across Install Flow, Known Value Round-Trips, Initial App State) — read-only source of truth for the QA agent
- **Spec drift guard**: PR comment when setup-related files change without updating `VERIFICATION.md`

### Fixed

- **Admin layout**: Added `force-dynamic` to prevent Next.js prerendering cached `/setup` redirects when DB is empty at build time
- **QA agent**: Increased Anthropic `maxRetries` to 5 for overload resilience (used on failure path only)

## 0.96.6 - 2026-03-20

### Changed

- **Docker removed**: Dropped Dockerfile, docker-compose.yml, GHCR workflow, and remaining Docker references in docs (including `docs/architecture/UPGRADE-PATH.md`) — self-hosting is now Neon + Vercel only
- **Setup UI**: Redesigned setup flow with logo above card, step indicator (EULA → Store Setup), and contextual icons (ScrollText / Store)
- **Installation guide**: Rewrote `INSTALLATION.md` with honest expectations, prerequisites table, and exact 5-step self-host walkthrough

## 0.96.5 - 2026-03-20

### Fixed

- **Docker**: Fixed `EACCES: permission denied, mkdir '/app/.next'` at container startup — `WORKDIR /app` was root-owned, preventing the `node` user from creating subdirectories at runtime
- **Docker**: Added `.dockerignore` to exclude `.next/`, `node_modules/`, `.git/` from build context

## 0.96.4 - 2026-03-20

### Fixed

- **Install flow**: Admin account creation now redirects to `/admin` after sign-in instead of `/account`
- **Install flow**: Store name no longer shows blank in setup and sign-in pages on fresh installs (defaults to "Artisan Roast")
- **Docker seed**: Fixed seed-if-empty.js regex matching dotenvx version string (`17` from `dotenv@17.x`) instead of the actual SQL product count, causing seed to be skipped on genuinely empty databases

## 0.96.3 - 2026-03-19

### Fixed

- **A la carte checkout**: Purchase buttons now POST to the platform checkout API via server action instead of navigating to a POST-only endpoint as a link
- **Demo mode checkout guard**: Subscribe and Purchase buttons are disabled when `NEXT_PUBLIC_DEMO_MODE=true`

## 0.96.2 - 2026-03-19

### Fixed

- **Clean install seed**: `SEED_PRODUCT_MODE=none` skips product and merch seeding for new self-hosted installs; setup script defaults to this mode so the onboarding checklist "Add your products" step starts unchecked

## 0.96.1 - 2026-03-19

### Fixed

- **Demo onboarding checklist**: Seed now sets `store_name` to `"Artisan Roast Demo"` so the branding step auto-completes on fresh installs

## 0.96.0 - 2026-03-19

### Added

- **Priority Support plan**: Full support tier with ticket submission, priority ticket queue, usage tracking, and 1:1 session quotas
- **Terms & legal pages**: `/admin/terms` with collapsible sections, version history, and acceptance flow
- **Ticket management**: Slide-in sheet drawer for ticket details; normal tickets route to GitHub issues

### Changed

- **Tier renamed**: `PRO` → `PRIORITY_SUPPORT` throughout codebase
- **E2E test suite**: All 5 tests passing in CI with mock platform server, global setup, and cache isolation

## 0.95.6 - 2026-03-12

### Fixed

- **Build crash without Stripe keys**: App no longer crashes during build when Stripe keys are missing
- **VAPI voice barista**: Disabled entirely — not ready for production

## 0.95.5 - 2026-03-12

### Added

- **Install matrix CI workflow**: Automated e2e test across 4 env-var profiles (minimal, stripe-only, resend-only, full) using Postgres service container. Validates health endpoint, checkout behavior, storefront rendering, and seed idempotency.

## 0.95.4 - 2026-03-12

### Added

- **Graceful degradation**: App starts with only `DATABASE_URL` + `AUTH_SECRET` — Stripe and Resend initialize lazily and return null when unconfigured
- **Storefront checkout guard**: Checkout disabled with user-facing message when Stripe is not configured
- **Auto-seed on first deploy**: Vercel deploys auto-seed when DB is empty; Docker Compose runs `seed-if-empty.js` after migrate
- **Admin setup checklist**: Dismissible "Getting started" card on dashboard tracking products, payments, email, branding
- **Integration banners**: Warning banners on Orders and Subscriptions admin pages when Stripe is missing
- **Install e2e matrix test plan**: `docs/plans/install-e2e-matrix-test.md` for automated CI testing across env-var combinations

### Changed

- **Required env vars reduced from 6 to 2**: Stripe and Resend keys moved to optional — app degrades gracefully
- **Health endpoint**: Returns 200 with `"degraded"` status instead of 503 when optional services are missing
- **VAPI gated as demo-only**: Voice barista only renders when `NEXT_PUBLIC_DEMO_MODE=true`
- **INSTALLATION.md restructured**: Three clear install paths (Vercel One-Click, Docker Compose, Local Development)
- **Cancel order route**: Stripe refund now attempted before marking order as refunded (data integrity fix)

### Fixed

- **Vercel deploy button**: URLs corrected from old `ecomm-ai-app` repo to `artisan-roast`
- **Clone URLs**: Fixed in README and INSTALLATION.md
- **VAPI gate condition**: Was inverted (`isDemoUser && !isDemoMode` → `isDemoMode && isDemoUser`)

## 0.95.3 - 2026-03-11

### Added

- **LLM-agnostic AI provider**: Replace Gemini-specific code with universal OpenAI-compatible client supporting any provider (OpenAI, Gemini, Groq, Ollama, etc.)
- **Admin AI settings page**: Configure AI provider (base URL, API key, model) and feature toggles (chat, recommender, about assistant) from admin UI
- **Provider presets**: Quick-setup dropdown for OpenAI, Gemini, Groq, and Ollama with auto-filled base URLs
- **Connection test**: Test AI provider connectivity with response time feedback before saving

### Changed

- **AI endpoints refactored**: Chat, recommend, and about-page-generate endpoints now use shared `chatCompletion()` client instead of Gemini REST API
- **Config resolution**: DB settings (SiteSettings) take precedence over env vars for AI configuration

### Removed

- **`@google/generative-ai` dependency**: No longer needed — all AI calls use OpenAI-compatible format

## 0.95.2 - 2026-03-09

### Changed

- **Header nav icons**: Shrink desktop storefront nav link icons from 20px to 16px
- **Store Pickup styling**: Default font color and no italic across table columns and mobile cards
- **Mobile card address format**: Split into separate lines (street / city, state zip / country)
- **Mixed frequency badge**: Mobile cards now show "Mixed" badge (blue) matching desktop table styling
- **Order number searchable**: Order # is now included in the global search filter for both admin and user order tables
- **Filter display**: Multi-select filters show selected value in default text color (matching date filter)

### Fixed

- **Smooth scroll offset**: Added `scroll-padding-top` to account for sticky header height
- **Column visibility toggle**: `defaultHidden` columns can now be toggled on by the user (was being overridden on every render)

## 0.95.1 - 2026-03-09

### Fixed

- **Touch device table UI**: Sort icons, resize handles, and action menu dots now stay visible at `md` breakpoint (landscape phones) instead of requiring hover — hover-based hiding moved to `lg` (1024px+)

## 0.95.0 - 2026-03-09

### Added

- **Composable data table action bar**: Dynamic collapse architecture with `computeCollapseLevel()` — tabs, search, and filter slots collapse responsively based on available width
- **Status tabs slot**: `createStatusTabsSlot()` factory for desktop tabs with mobile dropdown fallback, eliminating ~30 lines of repeated IIFE pattern across 4 consumer files
- **Shared order utilities**: Extracted `getPurchaseType`, `formatCadence`, `ORDER_FILTER_CONFIGS`, `orderFilterToColumnFilters` to `components/shared/order-utils.ts`
- **`useDataTableInfiniteScroll` hook**: Wraps infinite scroll + auto-reset on filter/search changes, replacing ~15 lines of boilerplate in 3 consumer files
- **`transformToMobileActions` utility**: Converts `RowActionItem[]` to `RecordAction[]` for mobile cards, supporting items, sub-menus, and destructive variants
- **Row action icons**: Added Truck, MapPin, and XCircle icons to user order history actions (Shipment Status, Edit Address, Cancel Order)

### Changed

- **Filter UX improvements**: Default comparison operator changed to `>=`, "enter value" placeholder, min=0 on number input, selected filter type hidden from dropdown, date range "Select range" clearable option
- **Column header rename**: "Type" → "Frequency" across order tables and filters
- **Column resizing**: Only Items and Ship To columns are resizable; other columns are fixed width
- **Page size selector removed**: Simplified action bar by removing Rows/Page UI from all tables (pagination retained)
- **Order detail dividers**: Unified separator styling between Order Summary and Order Items cards

### Fixed

- **React 19 strict mode**: Added mounted guards to ResizeObserver, IntersectionObserver, and MutationObserver callbacks to prevent state updates before mount
- **Filter red dot on empty date**: `isSlotActive` now checks `value != null` to avoid false active indicator

## 0.94.1 - 2026-03-07

### Fixed

- **Placeholder image category mismatch**: Merch products (e.g., Origami Cone Filters) now use correct "culture" placeholder category in order detail and Buy Again cart items, matching the product page

## 0.94.0 - 2026-03-07

### Added

- **Admin order detail page**: New `/admin/orders/[orderId]` with shared order detail components (OrderInfo, OrderSummary, OrderItems cards)
- **Order detail layout**: 2-column grid (Order Information + Order Summary) above full-width Order Items table, inspired by shadcnuikit invoice pattern
- **Product images in order items**: Variant images with `getPlaceholderImage` fallback for consistent thumbnails
- **Buy Again button**: Per-item CTA using `useAddToCartWithFeedback` hook — transforms through Adding → Added → Buy Now / View Cart states
- **Product links in order items**: Storefront links to product page, admin links to product edit page
- **Admin-specific order info**: Customer email/phone, Stripe payment and subscription links
- **Per-item refund display**: Strikethrough original qty with red refund indicator, corrected line totals
- **Print support**: Inline print button with data-attribute-based print styles

### Fixed

- **Cart add-ons API**: Guard against undefined product IDs from stale cart data (returns empty instead of 500)
- **Order detail Prisma query**: Add missing `product.id` to select clause — fixes broken admin product links and Buy Again `productId`

## 0.93.6 - 2026-03-07

### Fixed

- **Compare feature**: "No comparison" selection now works on all admin dashboard pages — previously the compare change was silently lost due to a race between two `router.push` calls in URL mode
- **DateRangePicker**: Batch synchronous URL param updates into a single navigation to prevent race conditions when changing both period and comparison mode

## 0.93.4 - 2026-03-05

### Fixed

- **Demo sign-in**: Move credentials to server action — fixes broken demo login and removes password exposure from client bundle
- **Demo banner**: Use server-side auth check so banner hides immediately after login (no stale session race)

### Changed

- Demo customer sign-in now redirects to homepage instead of account page

## 0.93.3 - 2026-03-05

### Fixed

- **Custom date ranges**: Calendar date picker now works on all dashboard pages (Overview, Sales, User Analytics) — previously only User Analytics responded to custom selections
- **Shared date utilities**: Extract `resolveRange` and `validateCustomDateParams` to eliminate duplication across 3 API routes and 3 services

### Added

- Unit tests for `resolveRange` and `validateCustomDateParams`

## 0.93.2 - 2026-03-05

### Changed

- Disable Claude Code attribution on commits and PRs
- Tighten GitHub ruleset: require review thread resolution before merge

## 0.93.1 - 2026-03-05

### Fixed

- **DateRangePicker**: Custom range follows [from, to) convention; display date no longer off-by-one
- **DateRangePicker/PeriodSelector**: URL params validated instead of unsafe casts
- **Analytics API**: Custom date params validated (ISO format, from < to, max 366 days)
- **buildOrderWhere**: Statuses typed as `OrderStatus[]` with runtime validation
- **CSV export**: Stable UTC `YYYY-MM-DD` date format instead of locale-dependent
- **DonutChart**: Tooltip swatch uses payload fill color (fixes labels with spaces)
- **chart.tsx**: Tooltip renders zero values correctly
- **Trending products**: Links use admin routes instead of storefront
- **User analytics**: Added `OUT_FOR_DELIVERY` to valid order statuses; custom date validation
- **Dashboard fulfillment chip**: Correct denominator using total orders
- **Activity queries**: DB-level aggregation via `date_trunc` instead of loading all rows

## 0.93.0 - 2026-03-05

### Added

- **Admin analytics dashboard**: Three-tab dashboard (Overview, Sales Analytics, Trends & User Activities) with KPI cards, revenue trends, donut charts, funnel visualization, ranked lists, and stacked area charts
- **Sales analytics page**: Revenue/orders/AOV KPIs with comparison deltas, top products, subscription vs one-time split, category breakdown, coffee sold by weight, orders table with server-side pagination/sorting/filtering
- **User activity analytics page**: Conversion rate, cart conversion, searches, page views KPIs; behavior funnel; trending products; top searches; daily activity stacked area chart with 5 series
- **Overview dashboard enhancements**: Revenue trend with comparison overlay, orders by status donut, conversion funnel, subscription/customer mix, reviews summary with star breakdown, top products/locations/searches/customers
- **Shared analytics components**: ChartCard, KpiCard, TrendChart, DonutChart, HBarChart, FunnelChart, RankedList, StatGrid, SplitComparison, DateRangePicker, DashboardToolbar, ExportCsvButton, SkeletonDashboard
- **DashboardPageTemplate**: Unified page shell with consistent spacing and tab navigation across all dashboard pages
- **CSV export**: Export dashboard data from Sales and Analytics pages
- **Analytics data layer**: Prisma queries for order aggregates, activity tracking, entity stats; time utilities; metrics registry with delta computation; formatters; CSV builder

### Changed

- **Dashboard page modularization**: Extract SalesClient into SalesChartsSection, SalesOrdersSection, and sales-table-config; extract DailyActivitySection from UserAnalyticsClient; update TopMoversSection for overview Row 4
- **Shared formatters**: Consolidate duplicated `formatStatus` into `lib/admin/analytics/formatters.ts`
- **Overview barrel export**: Add `app/admin/_components/overview/index.ts` for cleaner imports
- **DataTable fitContainer mode**: Support `table-auto` layout with `minWidth` cells and `overflow-clip` for tables that fit their container width
- **ChartCard improvements**: Add `titleIcon` prop, `ChartCardLinkAction` and `ChartCardToggleAction` reusable action components
- **Admin navigation**: Add Sales Analytics and Trends & User Activities to sidebar and breadcrumbs

## 0.92.14 - 2026-03-01

### Changed

- **Trim claude.md**: Reduce from 827 to ~165 lines — remove stale context, redundant agent framing, and generic instructions
- **Add pre-PR precheck hook**: Block `gh pr create` until both `npm run precheck` and `npm run test:ci` pass (stamp-based gate)
- **Add pre-migration backup hook**: Block `prisma migrate dev` until `npm run db:backup` runs (stamp-based gate)
- **Gitignore runtime stamp files**: Exclude `.claude/hooks/.*-stamp*.json` from version control

## 0.92.6 - 2026-02-27

### Added

- **QC validator in hooks**: Wire `qc-validator.js` into commit and stop hooks to block rubber-stamp QC entries
- **Product reviews implementation plan**: Add 7-phase plan for reviews & ratings feature

## 0.92.2 - 2026-02-26

### Fixed

- **Product images invisible on desktop**: Responsive aspect-ratio classes were built via template literal — Tailwind couldn't detect them at build time, producing 0-height image containers on md+ screens
- **Auth SSR crash (window is not defined)**: Remove `window.location.origin` usage in signin/signup `useMemo` — build relative URLs directly instead
- **Auth redirect to localhost on LAN**: Add `trustHost: true` to NextAuth config so redirects use the request's Host header
- **Empty src warning on storefront images**: Default `storeLogoUrl` to `/logo.svg` so `<Image>` never renders with `src=""`
- **Admin reviews action bar overflow**: Stack action bar rows on mobile with tighter spacing and aligned record count

## 0.92.1 - 2026-02-26

### Fixed

- **Theme preview card**: Use default shadcn Badge for proper contrast, replace "Add to Cart" with icon + "Add" to prevent wrapping, add type scale preview (2xl–xs), remove misleading accent area
- **Storefront button text alignment**: Normalize vertical centering for custom theme fonts (Outfit, Noto Serif SC) via scoped `leading-none` on site layout
- **Recommended For You images**: Show immediately on page load when above the fold instead of waiting for scroll
- **Product image height on mobile**: Cut image height in half on xs–sm breakpoints (cropped, not stretched) for better mobile UX

### Changed

- **Theme save button**: Moved below title with amber/green status dot indicating save state

## 0.92.0 - 2026-02-26

### Added

- **Admin reviews moderation page**: Full moderation dashboard with tabs (Published, Pending, Flagged), bulk actions, date/rating filters, sortable columns, hover-card preview, and mobile-responsive card layout
- **Review flagging & admin responses**: Flag reviews with reason, publish admin responses visible on storefront, restore flagged reviews
- **Profanity filter**: Automatic censoring of profane words in review content on the storefront
- **Review request emails**: Automated cron job sends review request emails to customers after order delivery
- **Admin review notifications**: Unread review badge in admin nav, mark-as-read tracking, new review notification emails with flagged review alerts
- **Scheduled jobs settings page**: Generate and manage cron authentication secret from admin UI, view all scheduled tasks
- **Email template architecture**: Shared `EmailLayout` and `EmailBranding` system eliminating store name/URL duplication across all 12 email templates

### Changed

- **DataTable**: Extended with dateRange filter type for flexible date-based filtering
- **Email templates**: Refactored all templates to use shared layout component with consistent branding
- **Completeness score**: Improved scoring algorithm with weighted field contributions

### Fixed

- **Admin reviews pagination**: Hidden on mobile where card layout is used instead
- **FileUpload component**: Removed redundant "Icon" label and constrained width to match other form fields

## 0.91.0 - 2026-02-26

### Added

- **Admin order refunds**: Process full or partial refunds from the admin orders page with per-item quantity selection, proportional tax calculation, reason tracking, and refund history view
- **Refund notification email**: Customers receive a detailed refund confirmation email with itemized breakdown and reason
- **Order financial breakdown**: Orders now store tax, shipping, and discount amounts separately for accurate accounting and refund calculations
- **Edit shipping address**: Admin can update the shipping address on pending orders before shipment

### Changed

- **Order action menu icons**: Each action in the order dropdown menu now has a meaningful icon for faster scanning
- **Order seed data**: Demo orders include realistic Stripe IDs, carrier tracking numbers, promo codes, and refund scenarios for comprehensive testing

## 0.90.2 - 2026-02-24

### Added

- **Product reviews system**: Full review/brew-report system with star ratings, brew method badges, tasting notes, helpful votes, sort/filter, and infinite scroll pagination
- **Rating breakdown sidebar**: Amazon-style rating distribution chart with horizontal bars, responsive layout (stacked on mobile, sticky sidebar on desktop)
- **Brew report form**: Multi-step form with star picker, brew parameters (method, grind, temp, ratio), tasting notes, and completeness indicator
- **Verified purchase badges**: Reviews linked to orders display variant name and "Verified Purchase" badge
- **Merch reviews**: Review system extended to merchandise products (mugs, kettles) with adapted form hiding brew-specific fields
- **Brew report action on orders**: Order history shows "Write a Brew Report" action with submenu listing eligible products

### Fixed

- **Orders page 401 for unauthenticated users**: Graceful handling when session is missing

## 0.90.0 - 2026-02-24

### Added

- **Storefront theme switcher**: Choose from multiple color themes for the customer-facing storefront with live preview, Google Fonts support, and one-click activation from the admin Appearance settings page
- **Light/dark preview toggle**: Preview how any theme looks in both light and dark mode directly from the Appearance page without switching the admin UI

## 0.89.15 - 2026-02-23

### Added

- **Order delivery tracking**: Full delivery lifecycle with SHIPPED, OUT_FOR_DELIVERY, and DELIVERED statuses, carrier API integration (USPS, UPS, FedEx, DHL), tracking timeline on customer order detail, shipment status dialog on orders list, cron-based delivery status checks, and delivery confirmation emails
- **Shipping settings page**: Admin page to configure carrier API keys with info callout explaining automatic tracking
- **Edit shipping details**: Admin can update carrier and tracking number on already-shipped orders without re-sending confirmation email
- **Demo account protection**: Prevent deletion of admin and demo accounts on the live site

### Changed

- **Order seed data**: Demo user gets one order per status for comprehensive demo coverage
- **Admin orders table**: Tracking info moved under Ship To column for cleaner layout

## 0.89.12 - 2026-02-21

### Added

- **Admin breadcrumb dropdown menus**: Breadcrumb segments with child routes (Products, Orders, Pages, Settings, Management) now show dropdown menus for quick navigation to sibling pages
- **Admin products table UI fixes**: Data table improvements including action bar, filter, pagination, and header cell refinements

### Fixed

- **Breadcrumb category dropdown styling**: Minor styling fixes for storefront breadcrumb dropdown
- **Button and pagination component refinements**: Small UI fixes to button variants and pagination controls

## 0.89.0 - 2026-02-17

### Added

- **Promotion codes at checkout**: Toggle in Commerce Settings enables a promotion code input on the Stripe Checkout page. Create and manage codes in Stripe Dashboard
- **Discount breakdown on order detail**: Customer order page shows Subtotal, Discount (with promo code label), Shipping, and Total when a promotion code was used

### Fixed

- **Cart add-on checkout failure**: Add-on suggestions used a fabricated purchase option ID that didn't exist in the database, causing "Invalid purchase option" errors at checkout
- **Shipping calculation with discounts**: Fixed order creation to correctly isolate shipping cost when a promo code discount is applied (was producing negative shipping)

## 0.88.16 - 2026-02-16

### Changed

- **Remove homepage motion animations**: Products and AI section render instantly from server HTML, eliminating 2.5s render delay (LCP) and layout shifts (CLS)
- **Optimize image sizes**: Add 480px image size step to close the 384→640 gap
- **Limit priority images**: Only preload the first recommendation and first carousel slide (was preloading 5+ images, diluting browser priority)

### Fixed

- **AI section layout shift**: Add loading skeleton to reserve space for dynamically imported ChatBarista/VoiceBarista, preventing CLS from content popping in after hydration
- **LCP fetchpriority**: Add `fetchPriority="high"` to priority product images so the browser fetches the LCP image at high priority
- **Carousel dot touch targets**: Increase tap area to 48px minimum for mobile accessibility while keeping dots visually small

## 0.88.13 - 2026-02-15

### Added

- **Demo banner ticker animation**: CTA cycles between "Try Admin Dashboard" and "See User Account" with a slide-up ticker effect
- **Sign-in redirect**: Mobile menu sign-in button returns users to the page they were on after authentication

### Changed

- **Mobile menu**: Replace "Close" button with "Sign In" link for unauthenticated users; swap Account icon to CircleUserRound; remove Contact shortcut

### Fixed

- **Auth callback URL handling**: NextAuth redirect callback now properly honors relative and same-origin callback URLs

## 0.88.12 - 2026-02-15

### Added

- **Demo data reset command**: `npm run reset:demo` wipes all orders, subscriptions, activities, and newsletter subscribers then reseeds with randomized synthetic data

### Changed

- **Randomized synthetic shipping data**: Orders use geographically consistent city/state/zip tuples, diverse fake names, and varied street names instead of hardcoded values

## 0.88.9 - 2026-02-15

### Changed

- **Skeleton loading for featured products**: Replace "Loading coffees..." text with skeleton cards matching carousel dimensions to eliminate CLS
- **Lazy-load AI components**: Defer ChatBarista and VoiceBarista with `next/dynamic` to reduce initial JS by ~84 KiB
- **Unify motion imports**: Consolidate `framer-motion` → `motion/react` to deduplicate bundle
- **Add browserslist config**: Target modern browsers only, eliminating ~24 KiB of legacy polyfills
- **GA4 scripts deferred to idle**: Switch from `afterInteractive` to `lazyOnload` to reduce TBT
- **Accurate image sizes attributes**: Context-specific `sizes` prop on ProductCard for carousel and grid layouts, reducing downloaded image sizes by ~30-40%

## 0.88.7 - 2026-02-14

### Added

- **Contact link in mobile menu**: Mail icon shortcut alongside Home, Search, Orders, Account

### Changed

- **Hero orbs toned down**: Reduced opacity and brightness so floating light orbs sit behind text
- **Hero titles forced black**: Titles on features and about pages stay black in both light and dark modes
- **Per-card scroll animation**: Feature and about cards now reveal individually on scroll (stacking feel) instead of all at once
- **Mobile navbar always visible**: Header no longer auto-hides on scroll at small breakpoints

## 0.88.6 - 2026-02-14

### Added

- **Dynamic OG Images**: Auto-generated 1200x630 social sharing images for root, features, and about pages using Next.js ImageResponse
- Dark coffee-themed gradient with adapted logo, title/subtitle text, and domain footer

### Changed

- Twitter card type updated from `summary` to `summary_large_image` for richer social previews
- Removed hardcoded 512x512 logo from OG/Twitter metadata in favor of dynamic route-based images

## 0.88.0 - 2026-02-13

### Added

- **Auto-Save**: Product forms auto-save on change with 800ms debounce, replacing the manual save button
- **Save Status Indicator**: Green (saved), amber pulse (saving), red (validation error) with inline error messages
- **Undo/Redo**: Last 10 form states saved to localStorage with undo/redo buttons and `U`/`Shift+U` keyboard shortcuts
- **Variant Images**: Images managed per-variant with drag-and-drop reordering and auto-generated alt text
- **Image Actions Menu**: Per-image dropdown with replace, delete, move previous/next — works on desktop and mobile
- **Product Add/Edit Rework**: Compositional admin product form with flat layout, dropdown variant/add-on selectors, and consistent shadcn Field patterns
- **Server Actions for Products**: Replaced API route-based mutations with server actions for product, variant, and purchase option CRUD
- **Merch Product Pages**: Dedicated create/edit pages for merch products at `/admin/merch/new` and `/admin/merch/[id]`
- **Variant Reordering**: Chevron up/down reorder controls with persistent order field

### Changed

- Product list pages use Link-based routing to dedicated edit pages instead of query-param-based inline forms
- Product form sections (info, variants, specs, categories, add-ons) are independent composable components
- Images consolidated from product-level to variant-level storage
- Product card uses first variant's first image as the display image

### Fixed

- Breadcrumb trail on product edit pages now shows full path (Products > Coffees > Product Name)

### Removed

- Old monolithic ProductFormClient and its section components
- Product-level image model (replaced by VariantImage)

## 0.87.13 - 2026-02-12

### Fixed

- Site orders desktop table uses HTML `<table>` instead of CSS Grid for proper column alignment
- Site orders filter uses Tabs component instead of Select dropdown (matches admin pages)
- StatusBadge default font weight consistent (`font-semibold`) across all pages
- Phone number in shipping address moved to end, formatted with i18n (`libphonenumber-js`)
- Admin orders date cell uses `text-foreground` instead of muted
- Record items list divider vertically centered
- Tabs component scrollable on mobile (xs-sm) instead of squishing

### Added

- `formatPhoneNumber()` utility with international formatting
- TanStack Table backlog item for future sort/search/pagination

## 0.87.9 - 2026-02-11

### Fixed

- Correct table min-widths for AllCategories, CategoryView, and LabelView (fixed columns exceeded previous min-width, hiding flex columns)

## 0.87.8 - 2026-02-11

### Changed

- Menu builder nav shows selected item text on mobile, icon-only for unselected
- All menu builder table views set table-level min-width to prevent column overlap before scroll

## 0.87.7 - 2026-02-11

### Added

- **Action Bar Mobile Dropdown**: Menu builder action bar collapses into overflow dropdown below md breakpoint with icons, labels, and keyboard shortcuts matching context menu pattern

### Changed

- Order history cards display in 2-column grid at lg breakpoint, stacked below
- Cart item count badge smaller at xs-sm breakpoints
- Menu view name column uses fixed width (w-72) with table-level min-width for horizontal scroll
- Remove TouchTarget wrappers from inline checkbox/chevron in menu view (fixes inflated hit areas at sm)
- Checkbox-to-chevron spacing tightened (mr-4 → mr-3) for better alignment

## 0.87.6 - 2026-02-11

### Added

- **Mobile Orders Button**: Orders quick-action in mobile menu nav bar (PackageSearch icon)
- **FormField Component**: Constrained-width wrapper for form fields on wide viewports

### Changed

- Order history table header styled with background, padding, and border
- Account tabs use FormField for consistent input widths
- Subscriptions tab wrapped in Card with header and description
- Addresses tab uses CardAction for header layout
- Mobile menu quick-action buttons use tighter padding to fit 4 items

## 0.87.0 - 2026-02-09

### Added

- **Subscription Address Edit**: Customers can update shipping address on ACTIVE/PAUSED subscriptions from account page
- **Shared Address Edit Hook**: Reusable `useEditAddress` hook and `EditAddressDialog` component shared between orders and subscriptions
- **Address Book Selector**: Saved addresses from user's address book populate the edit dialog dropdown
- **Client-Side Form Validation**: Field-level error messages with required-field checks before submission

### Changed

- Relocated `EditAddressDialog` and `useEditAddress` to co-located paths (`_components/account/`, `_hooks/`)
- Address book dropdown shows only saved DB addresses (disabled state when none exist)
- Documented co-location file placement rules in CLAUDE.md

## 0.86.1 - 2026-02-08

### Added

- **Product Heading Field**: Customizable storefront heading (e.g., "The Story", "Description") replaces hardcoded labels on product detail page
- **Variant Ordering**: Variants now have an `order` field for explicit sort control
- **Processing Field Validation**: Coffee processing method now included in Zod validation schema

### Changed

- Storefront product page uses `product.heading` directly — null heading shows no label
- Variant queries ordered by `order` field ascending

## 0.86.0 - 2026-02-07

### Added

- **Roast Level Bar on Product Cards**: Reusable RoastLevelBar component displayed under product name on coffee cards
- **Featured Products Carousel**: Replaced grid with responsive ScrollCarousel (1.5/2.5/3.5 slides per breakpoint)
- **Hover-Reveal Footer**: Product card footer (button + price) hidden on lg+, revealed on card hover with slide-up animation
- **Compact Footer Option**: Smaller button and price text for tight carousel layouts

### Changed

- Coffee detail values and description use default text size instead of `text-sm` on PDP
- Altitude format standardized to MASL (e.g., "1200 - 1600 MASL")
- ScrollCarousel supports responsive CSS variable slide widths with ResizeObserver reinit
- Recommendations API returns `type`, `roastLevel`, and `isFeatured` for proper card rendering

### Fixed

- Mobile carousel blocking vertical page scroll (changed `touch-none` to `touch-pan-y`)
- Varying product card heights normalized with `min-h` on card content area
- Tasting notes truncated with ellipsis to prevent wrapping

## 0.85.0 - 2026-02-07

### Added

- **Sale Pricing System**: Admin UI to set/clear sale prices, storefront display with strikethrough original price
- **Cart Sale Display**: Shopping cart drawer shows original price (strikethrough) next to sale price for discounted items
- **Merch Product Details**: Key-value details editor in admin for merch products, displayed as definition list on PDP
- **Add-On Card Redesign**: Horizontal card layout with button state machine (+ Add → Added! → Checkout Now)
- **Contextual PDP Labels**: Merch products show "Select Option" and "Description" instead of coffee-specific labels

### Changed

- Admin price inputs use InputGroup component for consistent alignment
- Sale price helper text always rendered to prevent modal height shift
- Add-on carousel shows 1.5-slide peek with dot indicators
- Stripe checkout validates effective (sale) price server-side

### Fixed

- Cafe page seed data includes richText block content
- Signed-in user menu uses CircleUserRound icon
- Markdown lint pre-commit hook now verifies no errors remain after auto-fix

## 0.84.0 - 2026-02-06

### Added

- **Coffee Details Panel**: Two-column PDP layout with roast level indicator, tasting notes, brew method suggestions, variety, altitude, and processing info
- **Roast Level Indicator**: Visual three-segment bar showing light/medium/dark roast with color-coded shading
- **Processing Field**: New product attribute for coffee processing method (washed, natural, honey, etc.)

### Changed

- Product detail page redesigned with two-column layout (image left, details right) on desktop
- Roast level colors use yellow palette for better dark mode visibility
- Quantity stepper borders unified for consistent thickness and color

## 0.83.1 - 2026-02-05

### Changed

- Widen shopping cart drawer to 500px on desktop
- Rearrange cart item controls: quantity stepper + price on one line
- Cart quantity stepper uses ButtonGroup with outline buttons for proper focus rings
- Delivery method uses choice card pattern on desktop, compact inline on mobile
- "Checkout Now" button state renamed to "View Cart" to match actual behavior
- "Delivery Schedule" label shortened to "Schedule" on product page
- Add to Cart button price now spaced apart with centered divider
- Theme toggle icon shows what it switches to (Moon in light, Sun in dark)
- Sign-in redirects back to current page instead of always to account page

### Removed

- Clear Cart button from cart footer
- Shipping address picker from cart (Stripe Checkout collects natively)
- Cart drawer border lines for cleaner look

### Fixed

- Page scrollbar no longer visible behind cart/dialog overlays
- Cart quantity stepper buttons now have proper keyboard focus rings

## 0.83.0 - 2026-02-05

### Added

- **Cart-Aware Add to Cart Button**: Button transforms through states (Adding → Added → Buy Now/Checkout Now) based on cart contents
- **First-Time Buyer Fast Path**: Empty cart triggers "Buy Now" for direct Stripe checkout in 3 clicks
- **Floating Add to Cart Button**: Mobile floating button appears when inline button scrolls out of view
- **Price Display in Button**: Add to Cart button shows price with proper styling and contrast
- **Recommendations Fallback**: Empty "You might also like" section now shows trending products

### Changed

- Quantity + button layout adapts by breakpoint (stacked on xs/md, inline on sm/lg+)
- ProductCard and ProductPage use shared transform button component

## 0.82.7 - 2026-02-05

### Fixed

- Category menu reading order now consistent across all responsive breakpoints
- Switch from JS weight-balancing to CSS multi-column layout for automatic height balancing

## 0.82.4 - 2026-02-04

### Fixed

- Restore category structure to use regional groupings instead of individual countries
- Update product-category mappings to match original structure

## 0.82.3 - 2026-02-04

### Fixed

- Update seed file to use Unsplash images for CMS pages (cafe, about, FAQ)

## 0.82.2 - 2026-02-04

### Added

- Display app version in admin footer

## 0.82.1 - 2026-02-04

### Added

- Curated Unsplash placeholder images for products without uploaded images
- 30 unique coffee bean photos for coffee products
- 12 coffee culture photos for merch products
- Documentation for placeholder image system
- `/checkout/resume` page to handle post-auth checkout flow
- `callbackUrl` support in sign-in/sign-up flow

### Fixed

- Checkout redirect after sign-up now returns to checkout instead of account page
- Cart drawer no longer auto-opens after completing Stripe checkout

## 0.82.0 - 2026-02-03

### Fixed

- Responsive UX improvements for public site and admin

## 0.81.4 - 2026-02-03

### Fixed

- Checkout redirect after sign-up now returns to checkout instead of account page
- Cart drawer no longer auto-opens after completing Stripe checkout

### Added

- `/checkout/resume` page to handle post-auth checkout flow
- `callbackUrl` support in sign-in/sign-up flow

## 0.81.3 - 2026-02-03

### Fixed

- Mobile nav only expands best matching section (not multiple sections)

## 0.81.2 - 2026-02-03

### Fixed

- Add `connection_limit=1` to CI database URL to prevent connection exhaustion

## 0.81.1 - 2026-02-03

### Changed

- Skip SSG in CI builds to reduce database connections
- Add `SKIP_SSG` env check to category, product, and CMS page routes
- CI builds now use ISR fallback; production builds unchanged
- CI workflow always reports status (fixes required check for docs-only PRs)

## 0.81.0 - 2026-02-03

### Added

- **Unified Admin Navigation System**: Centralized navigation using pub/sub architecture
  - Route Registry as single source of truth for all admin routes
  - Purpose-built hooks: `useIsRouteActive`, `useBreadcrumbTrail`, `useHasActiveDescendant`
  - New `prefix-nested` match mode for path-segment dynamic routes (`/orders/[id]`)
  - 50 unit tests for route matching
- **Navigation Documentation**: Comprehensive docs in `docs/navigation/`
  - Use cases guide with step-by-step examples
  - Architecture docs, hooks API reference
  - Feature development patterns added to CLAUDE.md

### Fixed

- Menu Builder bug where all nav items showed as active simultaneously
- Admin dashboard now uses navigation links instead of inline tabs
- Mobile nav auto-expands to show current route's section
- Breadcrumb parent links now navigable

### Changed

- Admin dashboard tabs converted to proper navigation links
- Product edit pages now show product name in breadcrumb

## 0.80.3 - 2026-02-02

### Changed

- Move auth actions to `app/auth/actions.ts` (co-locate with auth pages)

### Removed

- Remove `app/test-carousel/` and `app/test/` dev pages

## 0.80.2 - 2026-02-02

### Changed

- Tag-only releases with build-time version from git tags
- Simplified release workflow (no version commits needed)

## 0.80.1 - 2026-02-02

### Fixed

- Subscriptions page: changed "Shipping Address" to "Ship To", added phone display

## 0.80.0 - 2026-02-02

### Features

- **Admin Subscription Management**: New admin page to manage customer subscriptions
  - Skip next billing period, resume paused subscriptions, cancel at period end
  - Server Actions pattern (no API routes) following Next.js 16 best practices
  - Status filtering tabs and shipping address display
- **User Subscription Self-Service**: Customers can manage their own subscriptions
  - Skip delivery, resume, and cancel from account page
  - Clear status indicators and next billing date display
- **Order History Improvements**: Ship To column with responsive layout
  - Displays recipient name, phone, and address
  - Mobile card view and desktop table view
  - Extracted shared components for DRY code
- **Duplicate Subscription Prevention**: Block checkout if user already has active subscription for same product variant

### Fixes

- Fixed Stripe duplicate shipping rates error in checkout
- Allow multiple renewal orders per subscription
- DATABASE_URL fallback for prisma generate during npm install
- Resolved @auth/core peer dependency conflict with nodemailer v7
- Added Prisma mock to search API tests
- Resolved all ESLint warnings

### Infrastructure

- Added phone fields to Order and User models
- Added pausedUntil field to Subscription model
- Added stripeChargeId and stripeInvoiceId to Order model
- New database migrations for schema changes

## 0.79.0 - 2026-01-31

### Improvements

- **Better organized codebase**: Cleaner file structure makes it easier to find and customize components
- **Easier database switching**: Simpler setup for local development vs production databases
- **Automatic markdown formatting**: Documentation stays consistent automatically

### For Developers

- Components now live alongside their routes (`_components` folders)
- Clear separation: site components, admin components, and shared utilities
- New documentation: upgrade path guide and restructure checklist
- Markdownlint added to pre-commit hooks

## 0.78.0 - 2026-01-30

### Features

- **Telemetry Backend**: Central server receives anonymous usage data from all instances
  - TelemetryEvent table stores install/heartbeat/upgrade events
  - GET endpoint provides aggregate stats for developers
- **Support Page**: New admin page for support plans and data privacy
  - Added to Management section in navigation
  - Telemetry opt-out toggle for shop owners
  - Support Plans section (coming soon placeholder)
- **README Screenshots**: Added hero GIF and feature screenshot gallery

### Infrastructure

- Added `/api/telemetry/events` POST/GET endpoints
- Added `/api/admin/settings/telemetry` endpoint for toggle
- Added `telemetry_enabled` SiteSettings key
- Telemetry checks both env var and database setting

## 0.77.0 - 2026-01-30

### Features

- **In-App Feedback Widget**: Collect bug reports, feature requests, and feedback from admin panel
  - FeedbackDialog with FieldSet composition pattern
  - Submissions create GitHub Issues automatically via API
  - Graceful fallback when GitHub credentials not configured
  - Link to GitHub Discussions for public conversation
- **Failed Order Handling**: Mark orders as failed with customer notification
  - Admin can mark PENDING orders as FAILED with reason
  - FailedOrderNotification email template with refund info
  - FAILED status styling in admin and customer views

### Testing

- **AI Assist Test Coverage**: Expanded test suite with realistic cases
  - API route tests: 403 for non-admin, 400 for invalid blocks, GET/PUT validation
  - Component tests: loading state, error toast, resetDraft, selectedField

### Infrastructure

- Added `/api/feedback` endpoint for GitHub Issues integration
- Added `/api/admin/orders/[orderId]/fail` endpoint
- Added `failureReason` and `failedAt` fields to Order model
- Added GitHub feedback env vars to `.env.example`

## 0.76.0 - 2026-01-29

### Features

- **Version System**: VS Code-style update notifications for self-hosted instances
  - Version check API fetches latest release from GitHub
  - UpdateBanner component shows dismissible notification when updates available
  - Dismissal persists for 7 days or until new version detected
- **Telemetry**: Anonymous usage tracking (opt-out via `TELEMETRY_DISABLED=true`)
  - Instance ID generated on first seed for identification
  - Heartbeat cron endpoint for daily usage stats
  - Install event sent on first deployment
- **Feature Flags**: Community vs Pro edition gating (`lib/features.ts`)
- **Admin Profile Page**: Profile management UI (demo - read-only for launch)
  - Display name and email fields
  - Proper shadcn InputGroup components

### Infrastructure

- Added `/api/version/check` endpoint
- Added `/api/cron/heartbeat` endpoint (Vercel cron daily)
- Added `/api/admin/profile` GET/PUT endpoint
- Vercel cron configuration in `vercel.json`

## 0.75.2 - 2026-01-28

### Bug Fixes

- **Navigation state**: Unified navigation active state logic into single source of truth
  - Created core `matchesNavChild` function for all URL matching
  - Added `findActiveNavigation` for breadcrumb and multi-component use
  - Fixed Dashboard and Products both showing active simultaneously
  - Consistent behavior across top nav, mobile nav, and breadcrumbs
- **Scrollbar layout shift**: Fixed page jog during navigation
  - Set `overflow-y: scroll` on html to always show scrollbar
  - Override Radix scroll lock padding globally
- **Dropdown scroll lock**: Added `modal={false}` to all admin dropdowns/context menus to prevent body padding on open

## 0.75.1 - 2026-01-28

### Bug Fixes

- **Dashboard layout**: Fixed scrollbar and footer positioning
  - Footer now fixed at viewport bottom using flexbox with `h-dvh`
  - Content area scrolls independently without overlapping footer
  - Added `scrollbar-gutter: stable` to prevent layout shift
- **Mobile drawer**: Redesigned with collapsible sections, icons, logo support
  - Sections expand/collapse based on current page
  - Flattened "More" into separate Management/Settings sections
  - Fixed hamburger icon alignment
- **Dashboard tabs**: Horizontal scroll on tablet instead of wrap
- **Menu Builder**: Fixed table header hover border color, removed action bar background, added border to dropdown buttons
- **Nav config**: Removed "coming soon" label from Subscriptions

## 0.75.0 - 2026-01-28

### Features

- **Admin Dashboard Shell**: Complete redesign with top navbar layout
  - Top sticky navbar with dropdown menus for all admin sections
  - Mobile drawer navigation for responsive layouts
  - Footer with branding, legal links, and social icons
  - Dynamic breadcrumb with `useBreadcrumb` hook for entity names

### Refactor

- **Dashboard Components**: Relocated and consolidated into `components/admin/dashboard/`
  - AdminShell, AdminTopNav, AdminMobileDrawer, AdminBreadcrumb, AdminFooter, StoreBrand
  - BreadcrumbContext with single declarative `useBreadcrumb(items)` API
  - Barrel exports via `index.ts` for clean imports
  - Removed old sidebar-based layout components

## 0.74.0 - 2026-01-27

### Features

- **Admin breadcrumb navigation**: Added breadcrumb header to all admin pages following shadcn dashboard-shell pattern
  - Dynamic breadcrumb generation from current route
  - Human-readable labels for all admin sections
  - Clickable navigation links (except current page)

## 0.73.1 - 2026-01-27

### Bug Fixes

- **Breadcrumb navigation context**: Restored `?from=` parameter support so breadcrumbs reflect user's navigation journey (e.g., Asia > Sumatra instead of always showing primary category)

## 0.73.0 - 2026-01-27

### Features

- **Canonical Product URLs**: Migrated from `/{category}/{slug}` to `/products/{slug}` for SEO stability
  - Product URLs no longer change when admin recategorizes products
  - Reduced static build paths from 125 to 42 (3× improvement)
  - Updated ProductCard, ShoppingCart, AnalyticsView, AiHelperModal to use canonical URLs
  - Removed old `[category]/[productSlug]` route

## 0.72.4 - 2026-01-27

### Documentation

- **BACKLOG.md**: Updated Menu Builder status to Complete (v0.72.0), updated Admin Dashboard Reorganization to "Up Next" with dashboard-shell migration plan

## 0.72.3 - 2026-01-27

### Documentation

- **ROADMAP.md**: Updated to v0.72.2, added recent completions (v0.68.0-v0.72.2), added shadcn dashboard-shell migration as next task

## 0.72.2 - 2026-01-27

### Documentation

- **README.md**: Updated framework versions (Next.js 16, React 19, Tailwind CSS 4), added Menu Builder and Pages CMS features
- **About page**: Added Menu Builder and Pages CMS to Admin Dashboard section, marked AI assistants as "In Progress"

## 0.72.1 - 2026-01-27

### Bug Fixes

- **Drag cursor**: Fixed disabled cursor not showing on ineligible row drag attempts (centralized in DnD hook)
- **Ghost checkbox**: Fixed checkbox artifact during category cascade animation (removed conflicting opacity transitions)
- **Inline editor**: Fixed focus ring layout shift with `ring-inset`
- **Icon alignment**: Fixed vertical centering with `align-middle` on TableCell and flex wrapper on Switch
- **Checkbox alignment**: Fixed row checkboxes not aligned with header (removed `justify-center` from TouchTarget)

### UI/UX

- **Row font defaults**: Added consistent `text-sm font-normal text-foreground` base styles to all table rows
- **Empty label chevron**: Show disabled chevron on labels with no categories (visual consistency)
- **Nav reorder**: Changed menu-builder nav order to Categories → Labels → Menu
- **Sortable header**: Border highlight only on sortable columns; sorted column shows primary border

## 0.72.0 - 2026-01-26 🚀 Menu Builder Launch

### Major Feature

- **Menu Builder**: Complete admin tool for managing product menu hierarchy
  - Multi-select with Shift+click range selection
  - Drag-and-drop reordering with undo/redo
  - Context menus with bulk operations
  - Keyboard shortcuts (Delete, C, V, H)
  - Mobile-friendly touch targets (44x44px)
  - 5 table views: Menu, All Labels, All Categories, Label Detail, Category Detail

### Bug Fixes

- **Chevron toggle**: Fixed expand/collapse chevron being disabled when labels were selected (only disable during active drag)

### UI/UX

- **AdminSidebar**: Moved Menu Builder under E-commerce section (consolidated navigation)

## 0.71.5 - 2026-01-26

### Refactoring

- **Route restructure**: Renamed `(product-menu)` route group to `product-menu` route segment
  - Menu Builder now accessible at `/admin/product-menu` (was hidden at `/admin/menu-builder`)
  - Deleted legacy `categories/` and `labels/` table views (replaced by Menu Builder)
  - Updated AdminSidebar with single "Menu Builder" link
  - Updated all import paths across 19 files

### Database

- **Seed improvements**: Added icons to category labels, cleanup logic for obsolete labels

## 0.71.4 - 2026-01-26

### Documentation

- **CLAUDE.md**: Added parallel work & version management guidelines
- **Git workflow**: Separated feature branch commits (no version) from integration branch commits (with version)
- **Trigger phrases**: Clarified `commit - patch/minor bump` only for integration branches

## 0.71.3 - 2026-01-26

### Refactoring

- **Config-driven table views**: Implemented ViewConfig pattern for declarative table rendering
  - Phase 1: Core infrastructure (`ViewConfig<T>`, `useConfiguredRow`, `ConfiguredTableRow`)
  - Phase 2: AllCategoriesTableView migration with sort/filter support
  - Phase 3: AllLabelsTableView migration with DnD support
  - Phase 4: Parent-context views (LabelView, CategoryView) with scoped data
  - Phase 5: MenuView with hierarchy support (labels → categories)

### Bug Fixes

- **useMoveHandlers stability**: Fixed handler reference stability by memoizing `getItems` and `reorder` functions
- **RowContextMenu**: Added missing visibility action for label:category view
- **Test expectations**: Updated non-existent item test to expect `{ isFirst: true, isLast: true }` (disables both move buttons)

### Chores

- Removed dead code: `useTableViewSetup.ts` (197 lines), `PlaceholderTableView.tsx` (32 lines)
- Merged remote context-menu handler extraction with config-driven views

## 0.70.4 - 2026-01-26

### Improvements

- **Label view context menu**: Removed visibility toggle from category context menu in label view (visibility managed in All Categories)

### Documentation

- **ROADMAP.md**: Updated Phase 3 to complete (context menus, range selection, mobile interactions, clone operations)
- **ARCHITECTURE.md**: Added Context Menu Architecture section with shared hooks documentation
- **context-menu-plan.md**: Updated to reflect complete implementation status

## 0.70.3 - 2026-01-26

### Refactoring

- **Context menu hooks**: Extracted shared context menu handlers into reusable hooks in `hooks/context-menu/`
- **New hooks**: useContextRowHighlight, useMoveHandlers, useBulkAction, useDeleteConfirmation, useContextClone, useContextVisibility, useContextRemove, useContextMoveTo, useRelationshipToggle
- **Unified useMoveHandlers**: Consolidated flat list and nested list move handlers into single hook with `getItems(parentId?)` pattern
- **Config alignment**: Aligned table view consumers with CONTEXT_MENU_CONFIG spec (removed non-spec handlers)

## 0.70.2 - 2026-01-25

### Bug Fixes

- **Range selection with sorting**: Fixed shift+click range selection not respecting visual row order when columns are sorted in AllCategoriesTableView, CategoryTableView, and LabelTableView

## 0.71.2 - 2026-01-25

### Refactoring

- **DnD state derivation**: Derive DnD hierarchy state from eligibility instead of syncing via useEffect
- Removed brittle 6-dependency useEffect that synchronized drag state
- Hierarchy info (`dragKind`, `dragParentId`, `draggedChildren`) now computed on-demand from eligibility

## 0.71.1 - 2026-01-25

### Refactoring

- **Shared DeleteConfirmationDialog**: Extracted reusable delete confirmation dialog component
- **useTableViewSetup hook**: Extracted common table view setup logic (later removed in v0.70.5)

## 0.71.0 - 2026-01-25

### Refactoring

- **level → kind rename**: Renamed `level` property to `kind` for semantic clarity
  - `MenuRowLevel` → `MenuRowKind` (entity type: "label" | "category" | "product")
  - `dragLevel` → `dragKind` in useMultiEntityDnd
  - Separates entity type concept from hierarchy depth (0, 1, 2)

## 0.70.1 - 2026-01-25

### Features

- **Product category management**: Products in CategoryTableView can now manage which categories they belong to via context menu
- **Search in relationship submenus**: manage-categories and manage-labels submenus now have search bars for filtering
- **Consistent icons**: manage-categories uses FileSpreadsheet icon (matches navigation)

### Improvements

- **Action order alignment**: Context menu actions now follow action bar order (manage-*→ clone → remove → visibility → move-* → delete)
- **Simplified category context menus**: Removed delete from menu/label view category context menus to prevent accidental deletion
- **Simplified product context menu**: Removed move-to action from products (use drag-and-drop instead)
- **Removed all-categories action bar remove**: Remove action removed from all-categories view (many-to-many with labels)

### Tests

- Updated RowContextMenu tests for new action configurations

### Documentation

- Updated context-menu-plan.md with Phase 3 completion and new patterns

## 0.70.0 - 2026-01-25

### Features

- **Context menus for all table views**: Right-click menus for AllCategoriesTableView, MenuTableView, LabelTableView, and CategoryTableView
- **Menu view context actions**: Clone, remove, delete, and reorder for labels; clone, visibility, delete, move-to, and reorder for categories
- **Label view context actions**: Clone, visibility, remove, delete, move-to, and reorder for categories within a label
- **Category view context actions**: Visibility, remove, move-to, and reorder for products within a category

### Improvements

- **Simplified all-categories config**: Removed non-applicable actions (move, remove) since view uses table sorting
- **Position-aware move actions**: Move up/down disabled at boundaries for accurate UX feedback
- **Delete confirmation dialogs**: AlertDialog prompts for all destructive delete operations
- **Merged context menus with WCAG touch targets**: Context menu integration now includes 44x44px touch targets

## 0.69.1 - 2026-01-25

### Features

- **TouchTarget component**: Wrapper that expands touch targets to 44x44px on mobile (WCAG 2.5.5 compliance), no change on desktop
- **Mobile touch targets**: Applied TouchTarget to CheckboxCell and ChevronToggleCell across all 5 table views

### Improvements

- **Inline button touch targets**: Added pseudo-element technique (`before:-inset-*`) to expand hit areas for:
  - Pencil edit trigger in InlineNameEditor
  - Check/X confirm/cancel buttons in InlineNameEditor
  - Icon picker triggers in InlineIconCell
- **Mobile-only expansion**: All touch target enhancements use `md:` breakpoint to preserve desktop sizing

### Documentation

- Updated mobile-interactions-plan.md with touch target implementation status

## 0.68.0 - 2026-01-25

### Features

- **RowContextMenu enhancements**: Bulk mode support, mixed selection handling, category management submenu
- **CheckboxListContent**: Shared component for dropdown and context menu checkbox lists with sectioned layout
- **Context row highlighting**: Visual distinction between selected rows and right-clicked row via `isContextRow` prop
- **AllLabelsTableView integration**: Full context menu with bulk actions, category management, and move operations

### Improvements

- **Entity+View pattern**: Context menus configured per `ViewType:EntityKind` for granular action control
- **Platform-aware shortcuts**: Kbd component displays Mac/Windows appropriate modifier keys
- **Action grouping**: Context menu actions organized into main, move, and delete groups with separators

### Documentation

- **Implementation details**: Comprehensive patterns documentation in context-menu-plan.md for future entity implementations

## 0.67.0 - 2026-01-24

### Features

- **Keyboard shortcuts**: Single-key Gmail/Slack style shortcuts to avoid browser conflicts
  - `N` - New item (label or category)
  - `D` - Duplicate selected
  - `R` - Remove selected
  - `X` - Delete permanently (all-labels, all-categories)
  - `V` - Toggle visibility
  - `E` - Expand all (menu view)
  - `C` - Collapse all (menu view)
  - `U` - Undo
  - `Shift+U` - Redo
  - `?` - Toggle help popover
- **Help button**: ConciergeBell icon on all 5 views with view-specific tips popover
- **Delete button**: Trash2 icon with AlertDialog confirmation on all-labels and all-categories views
- **Full undo/redo for delete**: `restoreLabel` and `restoreCategory` server actions recreate entities with all relationships

### Improvements

- **Accessible disabled buttons**: Changed from `disabled` to `aria-disabled` to keep buttons in tab order
- **Shifted character handling**: Keyboard shortcuts correctly handle characters that require Shift (like `?`)
- **Modal awareness**: Shortcuts disabled when dialogs are open

### New Files

- `hooks/useKeyboardShortcuts.ts` - Global keyboard shortcut handler
- `constants/help-content.ts` - View-specific help content
- `menu-action-bar/HelpPopoverButton.tsx` - Help popover component
- `menu-action-bar/DeleteAlertButton.tsx` - Delete confirmation dialog

## 0.66.20 - 2026-01-23

- **Fixed AllLabelsTableView DnD reorder**: Added `defaultSort: null` to preserve server-provided order, fixing visual/calculation mismatch
- **Consolidated DnD hooks**: `useGroupedReorder` now serves as shared core for both `useSingleEntityDnd` and `useMultiEntityDnd`
- **Unified `getIsDraggable` API**: Cursor styling logic centralized in hooks instead of duplicated in views

## 0.66.19 - 2026-01-23

- **Fixed DnD drop position accuracy**: Drop position now tracked synchronously via ref, bypassing throttle delay
- **Fixed empty label expansion on drop**: Target label auto-expands after cross-boundary move to show moved category
- **Intent-based cursor feedback**: Grab/not-allowed cursors only show on mousedown, not hover (drag handle icon indicates availability)
- **Added flush to throttle hook**: `useThrottledCallback` now returns `{ throttled, flush }` for pending call execution

## 0.66.18 - 2026-01-23

- **Fixed checkbox UI honesty**: Parent checkbox now shows "checked" only when explicitly selected, not when computed from all children being selected
- Clicking all children individually now shows parent as "indeterminate" (not "checked")
- This aligns UI state with actual DnD/action behavior

## 0.66.17 - 2026-01-23

- **Fixed auto-expanded parent collapse on drop**: Target label now stays expanded after successful drop
- **Fixed race condition in clearDragState**: `dropInProgressRef` now managed only by drop/dragEnd handlers

**Known Issues:**

- Multi-drag ghost may not appear when items selected via individual clicks and drag starts immediately (race condition)

## 0.66.16 - 2026-01-23

- **Refactored DnD hooks architecture**: Unified hooks with shared `useGroupedReorder` core
- **Added `useSingleEntityDnd`**: New hook for flat tables (AllLabels, Category, Label views)
- **Added `useMultiEntityDnd`**: New hook for hierarchical tables with cross-boundary moves
- **Renamed `MultiDragGhost` → `GroupedEntitiesGhost`**: Moved to table components directory
- **Centralized DnD types**: Moved to `types/dnd.ts` for better organization
- **Fixed theme-aware flash animations**: Auto-expand and drop-target flash now adapt to light/dark mode
- **Deleted legacy hooks**: Removed `useDragReorder`, `useMenuTableDragReorder`, `useMultiDragGhost`

## 0.66.15 - 2026-01-23

- **Fixed multi-DnD selection order**: Dragged items now preserve visual order (not selection order) when dropped
- **Fixed selection state after cross-boundary move**: Added `onSelectionUpdate` callback to update keys after move
- **Fixed mixed DnD operations**: Handle reorder + cross-boundary move in same operation
- **Added delayed auto-expand**: 500ms hover delay before expanding collapsed labels during drag
- **Added auto-collapse on drag cancel**: Auto-expanded labels collapse when drag ends without drop

**Known Issues (Auto-Expand UX):**

- Target label collapses upon drop completion (should stay expanded)
- Flash animation triggers on already-expanded labels (should only flash on actual expansion)

## 0.66.14 - 2026-01-23

- **Refactored DnD eligibility system**: Extracted `useDnDEligibility` hook following action-bar pattern
- **Fixed per-row drag handle state**: Added `isRowInEligibleSet` prop for accurate visual feedback
- **Fixed actionable roots computation**: Only filters children when parent is explicitly selected AND checked
- **Added parent demotion logic**: Deselecting child removes parent from selection when it becomes indeterminate
- **Fixed multi-drag ghost timing**: Ghost now pre-renders based on `actionableRoots` for synchronous `setDragImage`
- **Added `DragHandleCell` component**: Centralized drag handle rendering with eligibility-based styling

## 0.66.13 - 2026-01-21

- **Standardized focus rings**: All custom components now use shadcn's focus ring style (`ring-ring/50 ring-[3px]`)
- **Fixed dropdown click propagation**: Clicking outside dropdowns/popovers no longer triggers underlying elements
- **Fixed tooltip flash on dropdown close**: Tooltips stay hidden when their associated dropdown closes
- **Fixed focus ring clipping**: HierarchyName now uses `overflow-visible` to prevent focus ring cutoff

## 0.66.12 - 2026-01-21

- **Fixed cross-boundary DnD positioning**: Categories now land at correct drop position (not always at top)
- **Fixed scrollbar flash**: Added `scrollbar-gutter: stable` to admin layout to prevent scrollbar appearing/disappearing during animations
- **Fixed icon picker row toggle**: Added stopPropagation to prevent icon selection from toggling row expand state
- **Improved collapse animation**: Separate exit transition (0.15s easeIn) for snappier collapse

## 0.66.11 - 2026-01-21

- **Cross-boundary drag-and-drop**: Move categories between labels with undo/redo support
- **Motion animations for expand/collapse**: Cascade animation with staggered delays using motion library
- **Auto-expand/collapse on drag**: Labels expand on drag enter, collapse when leaving territory
- **Selection-synced expand state**: Check → expand, uncheck → collapse (not toggle)
- **AddLabelsDropdown improvements**: Search, "Added"/"Available" sections, alphabetical sort
- **White flash animation**: 2x blink for cross-boundary drop targets and auto-expanded rows

## 0.66.10 - 2026-01-21

- **Updated naming convention**: "New Label", "New Label2" and "Name copy", "Name copy2" (number directly attached)
- **Restored font styling for default names**: Italic muted text for generic names
- **Added duplicate label name validation**: Toast error shown when trying to save duplicate name
- **Refactored `expandKey` to `isExpandable: boolean`**: Simplified identity registry field
- **Fixed registry ordering**: Labels and categories now sorted by `order` to match visual table order
- **Fixed clone item ordering**: Items processed in visual order for consistent results
- **Fixed indeterminate state behavior**: Parent doesn't collapse when selecting all children from indeterminate state

## 0.66.9 - 2026-01-21

- **Fixed expand/collapse action icons**: Swapped icons (ListChevronsUpDown for expand, ListChevronsDownUp for collapse)
- **Improved label drag behavior**:
  - All labels collapse when starting label drag
  - Expand disabled on all labels until drag completes
  - Added `isDraggingLabel` state to drag hook
  - Added `disabled` prop to ChevronToggleCell
- **Auto-expand on category drag**: Labels expand on hover when dragging categories (visual feedback)
- **Single-click expand toggle**: Clicking on expandable rows now toggles expand/collapse independently

## 0.66.8 - 2026-01-21

- **Simplified MenuTableView to 2-level hierarchy**: Labels → Categories only (no products)
  - Products removed from row rendering (only product count shown)
  - Categories are leaf nodes (no chevron, no expand/collapse)
  - Updated `useFlattenedMenuRows` to not produce product rows
  - Updated `getExpandableIds` to only return label IDs
  - Product management moved to Category Detail view

## 0.66.7 - 2026-01-21

- **Removed dead code from useFlattenedMenuRows**: Deleted unused `MenuHierarchy` type and `buildMenuHierarchy` function (replaced by IdentityRegistry)

## 0.66.6 - 2026-01-21

- **Updated MenuTableView to use buildMenuRegistry**: Uses 2-level registry (labels + categories)
- **Removed deprecated buildMenuHierarchyRegistry**: No longer needed after consumer update
- **Updated MenuTableView docstring**: Reflects 2-level hierarchy with product count info column

## 0.66.5 - 2026-01-21

- **Simplified buildMenuRegistry to 2-level hierarchy**: Labels + Categories only
  - Products removed from menu registry (product count shown as info column)
  - Categories are leaf nodes with `expandKey: null`
  - Labels can receive category drops (`canReceiveDrop: true`)

## 0.66.4 - 2026-01-21

- **Updated RowIdentity type**: Replaced `ancestry: string[]` with `parentKey: string | null`
- **Added canReceiveDrop field**: For DnD drop target validation
- **Updated IdentityRegistry interface**: `getParentId` → `getParentKey`, added `canReceiveDrop()`
- **Updated useActionHandler**: Uses `parentKey` instead of `ancestry.at(-1)`

## 0.66.3 - 2026-01-19

- **HierarchyNameCell component**: CVA-based slot component for depth-based indentation
  - Depth variants (0/1/2) with Tailwind classes for consistent hierarchy indentation
  - Slots: HierarchyCheckbox, HierarchyChevron, HierarchyIcon, HierarchyName
  - Negative margin on chevron slot to compensate for button hover padding
- **Expand/collapse sync with selection**: Clicking or checking expands, unchecking collapses
- **Flatten MenuTableView structure**: Moved types to sibling file, deleted subdirectory
- **Spacing refinements**: Tighter icon-name gap, reduced checkbox margins for alignment

## 0.66.2 - 2026-01-18

- **Unified selection model with kind-prefixed keys**:
  - Refactored `useContextSelectionModel` to use kind-prefixed keys (`label:id`, `category:labelId-catId`, `product:...`)
  - Kind is now derived from keys, not stored separately - enables mixed selections in Menu Table View
  - Added `hasSameKindSelection` helper for action validation (clone/remove disabled when mixed)
  - Removed kind guards from `toggleSelection`/`selectAll` to allow selecting across entity types
  - Consolidated duplicate hooks - deleted `useMenuSelectionState` in favor of unified model
- **Auto-expand on check**: Checking a label/category checkbox auto-expands to show children
- **Action bar improvements**: Clone/remove show "select items of same type" message when mixed kinds selected

## 0.66.1 - 2026-01-18

- **Hierarchical selection state hook**: New `useMenuSelectionState` for Menu Table View
  - Tri-state checkbox support (checked/indeterminate/unchecked) for parent rows
  - Pre-built hierarchy maps for O(1) ancestry lookups
  - Composite keys for all entities to avoid ID collisions across parents
  - Labels: `labelId`, Categories: `labelId-categoryId`, Products: `labelId-categoryId-productId`
  - Simple visibility rule: same-kind checkboxes only when selection active
  - Master switch behavior for label toggle in category/product mode

## 0.66.0 - 2026-01-17

- **Menu Table View enhancements**: UI polish and action bar improvements
  - Fixed row click selection for label rows (removed errant `data-row-click-ignore`)
  - Product selection now uses composite keys (`parentId-id`) for unique selection per category
  - Icon cell hover styling with background color for better UX
  - Adjusted spacing between chevron, icon, and name elements
- **Action bar state-aware disabling**:
  - "Add Labels" disabled when row selection is active
  - "Expand All" disabled when all expandable items are already expanded
  - "Collapse All" disabled when all items are already collapsed
  - Added `expandedIds` and `expandableIds` to `BuilderState` type
  - New helpers: `allExpanded()` and `allCollapsed()` in action bar shared utilities
- **Drag-hover auto-expand** (foundation for cross-boundary DnD):
  - Hovering over collapsed label/category for 500ms during drag auto-expands it
  - Flash animation (`animate-auto-expand-flash`) on auto-expanded rows
  - Timer management with proper cleanup on drag end/leave

## 0.65.2 - 2026-01-17

- **Table view column reordering**: Standardized Visibility column placement across all views
  - Visibility column now positioned as second-to-last data column in all table views
  - AllCategoriesTableView: Moved "Added to Labels" to last column (takes remaining space)
  - AllCategoriesTableView: Center-aligned Added Date and Visibility columns
  - AllCategoriesTableView: Fixed header casing to "Added to Labels"

## 0.65.1 - 2026-01-17

- **Row visibility styling**: Added `isHidden` prop to TableRow and InlineNameEditor for muted text on hidden rows
  - All table views now show muted text when entity visibility is toggled off
  - TableRow applies `text-muted-foreground` when `isHidden` is true
  - InlineNameEditor respects `isHidden` prop for consistent styling
  - Removed hardcoded `text-muted-foreground` from Added Date column in AllCategoriesTableView

## 0.65.0 - 2026-01-17

- **Label Table View (2.3)**: Complete implementation of Label View for category management
  - Single-level table showing categories within selected label
  - TanStack sortable columns (Name, Added Order)
  - Drag-and-drop category reordering with undo/redo support
  - Products column showing comma-separated product names
  - Double-click navigates to category view
  - Column sort persists to database automatically
- **Schema change**: Added `createdAt` column to `CategoryLabelCategory` junction table
  - Used as `attachedAt` for chronological Added Order ranking
  - Migration: `20260117114116_add_createdat_to_category_label_category`
- **New hook**: `usePersistColumnSort` for persisting TanStack column sort to database
  - Reusable across any table view with sort-to-DB needs
  - Guards against concurrent persists
- **Cleanup**: Removed `sort-mode` action from action bar (replaced by column sorting)

## 0.64.6 - 2026-01-17

- **Product pinning**: Newly added products are pinned to top of CategoryTableView
  - Integrated `useContextRowUiState` and `usePinnedRow` hooks
  - Pinned row appears at top when no column sorting is active
- **Undo/redo for add products**: Add/remove products via dropdown now supports undo/redo
  - Added `pushUndoAction` to DropdownContext
  - Both attach and detach actions are undoable
- **Toast notifications**: Added feedback for category view actions
  - Add/remove product success/failure toasts with product name
  - Undo/redo success/failure toasts
  - Added `toast` to DropdownContext for reusable notifications

## 0.64.5 - 2026-01-16

- **Category view undo/redo**: Added undo/redo support for remove action in CategoryTableView
  - Undo re-attaches products via `attachProductToCategory`
  - Redo detaches them again via `detachProductFromCategory`
  - Added `captureUndo` to hydration (was missing from action definitions)
- **Tests**: Added 5 tests for category view undo/redo functionality

## 0.64.4 - 2026-01-16

- **Checkbox contrast improvement**: Improved unchecked checkbox border visibility in light mode
  - Changed from `border-input` to `border-muted-foreground/50` for better contrast
  - Dark mode retains original `border-input` for accessibility
- **Added Order text styling**: Removed `text-muted-foreground` from Added Order column in CategoryTableView
  - Numeric data now uses standard text color, consistent with product count columns
- **Roadmap update**: Updated docs/menu-builder/roadmap.md with Phase 2 progress (3/5 views complete)

## 0.64.3 - 2026-01-16

- **Standardize disabled button styling**: Unified action bar button disabled states
  - All buttons now use native `disabled` prop with consistent `opacity-50` effect
  - Removed inconsistent `aria-disabled` + `text-muted-foreground` pattern
  - Removed redundant `text-muted-foreground` classes from already-disabled buttons

## 0.64.2 - 2026-01-16

- **Icon vertical alignment fix**: Added `align-middle` to InlineIconCell for proper vertical centering
- **Category table view tweaks**: Adjusted column widths and icon inline display
- **Header truncation**: Added `truncate` class to non-sortable headers

## 0.64.1 - 2026-01-16

- **Column preset consolidation**: Single source of truth for table column config
  - Added `align` property to `ColumnWidthEntry` type in presets
  - `TableHeader` now reads width/align from preset via column id
  - `TableCell` now accepts `config` prop for cell class and alignment
  - Simplified header column definitions to just `id` and `label`
- **Sort button alignment fix**: Positioned toggle icon absolutely to not affect text centering
- **Skeleton loading state**: Replaced spinner with layout-matching skeleton in MenuBuilder
- **Cell alignment cleanup**: Removed redundant `flex justify-center` wrappers
  - VisibilityCell and InlineIconCell now centered via `text-center` from preset
  - InlineIconCell changed to `inline-flex` for proper centering
- Metrics: TypeScript + ESLint clean

## 0.64.0 - 2026-01-15

- **Category Table View**: Implemented CategoryTableView with sortable columns and inline editing
  - Columns: Checkbox, Product Name, Added Order, Visibility, Categories, Drag Handle
  - Sortable columns: Name (alphabetical), Added Order (by order in category)
  - Default sort: Added Order descending (newest first)
  - Single-click selects (200ms delay), double-click navigates to product detail
- **All Categories Added Date column**: Added "Added Date" column with default descending sort
  - Shows category creation date with date-only formatting
  - Default sort ensures newest categories appear first
- **Sortable header UX improvements**: Enhanced column sorting experience
  - Sort state indicator (↑/↓) prepended to column label when sorted
  - Toggle icon (↕) appears on row hover (md+), always visible on mobile
  - Click toggles between asc ↔ desc only (no unsorted in cycle)
  - Sort resets to unsorted via: DnD reorder, different column sort, or undo
- **useDragReorder callback**: Added `onReorderComplete` option for post-reorder actions
- **Bug fixes**:
  - Add-products action now disabled when row selection is active
  - Fixed last row left border not showing on selection (override shadcn TableBody reset)
- **Schema**: Added `createdAt` field to Category model for tracking creation dates
- Metrics: TypeScript + ESLint clean; all existing tests passing

## 0.63.1 - 2026-01-15

- **DnD border fix**: Fixed drag-and-drop border indicator not showing when dragging to the last row
  - Removed premature state clearing on `onDragLeave` that caused border flicker
  - Border now persists correctly when hovering over bottom edge of last row
- **Test coverage**: Added comprehensive unit tests for naming convention utilities
  - 20 tests covering `stripCopySuffix`, `makeCloneName`, `makeNewItemName`, `isUniqueConstraintError`, and `retryWithUniqueConstraint`
  - Tests verify naming patterns, error handling, retry logic, and edge cases
- Metrics: Jest (20 new tests passing); TypeScript + ESLint clean

## 0.63.0 - 2026-01-15

- **Declarative undo/redo system**: Refactored scattered conditional logic into config-driven architecture
  - Added `captureUndo` field to action config for view-specific undo capture logic
  - Eliminated 100+ lines of conditional undo/redo logic in MenuActionBar component
  - Undo actions now colocated with action definitions for better maintainability
  - History stack remains view-scoped (10 operations per view, cleared on navigation)
- **Menu Builder bug fixes**: Resolved multiple UX and accessibility issues
  - Visibility toggle: Now works with undo/redo in all views (menu, all-labels, all-categories)
  - Icon picker accessibility: Made trigger button tabbable with `opacity` pattern and proper `aria-label`
  - DnD border indicator: Fixed missing border on 2nd-to-last and last rows during drag operations
  - Clone action: Implemented for labels with full undo/redo support
  - Add new action: Implemented for labels with automatic name editing and undo support
  - Add new button: Now properly disabled when row selection is active
- **Code quality improvements**: Extracted and standardized common patterns
  - Created `actions/utils.ts` with centralized naming conventions and retry logic
  - Standardized naming: "copy", "copy (2)", "copy (3)" for clones; "New Label", "New Label (2)" for new items
  - Extracted `cloneItems()` and `captureCloneUndo()` helpers to eliminate duplication
  - Removed ~200 lines of duplicated code across labels and categories
  - Generic `retryWithUniqueConstraint()` for Prisma P2002 error handling
- Metrics: TypeScript + ESLint clean; all existing tests passing

## 0.62.0 - 2026-01-14

- **All Labels table view**: Implemented AllLabelsTableView with drag-drop reordering and inline editing
  - Columns: Checkbox, Icon (center 48px), Label Name, Categories, Visibility, Drag Handle
  - No column sorting - row order dictates DB label order via drag-drop
  - Single-click selects (200ms delay), double-click navigates to label detail
  - Drag handle always visible on mobile, hover-only on desktop
- **Reusable table view hooks**: Extracted common patterns to reduce boilerplate (~80 lines per view)
  - `useDragReorder`: Row drag-and-drop with `getDragHandlers()` and `getDragClasses()`
  - `useInlineEditHandlers`: Name/icon/visibility handlers with automatic undo/redo
  - `usePinnedRow` enhanced: Built-in default sort by order field (descending)
  - `useContextRowUiState` enhanced: `autoClearPinned` option for automatic cleanup
  - `TableRow` enhanced: Built-in click/double-click handling via `onRowClick`/`onRowDoubleClick`
- **New components**: `InlineIconCell` for inline icon editing with IconPicker dialog
- **Refactored AllCategoriesTableView**: Updated to use new hooks for consistency
- **Documentation updates**: Updated ROADMAP, ARCHITECTURE, IMPLEMENTATION-GUIDE with new hooks and patterns
- **CLAUDE.md updates**: Added instructions for refactor opportunities and docs sync; referenced COMMIT_PROCEDURE.md
- Metrics: Jest `npm run test:ci` (36 suites, 300 tests passing); lint + typecheck clean

## 0.61.1 - 2026-01-13

- **Prisma 7 compatibility fix**: Removed deprecated `url` from datasource block in schema.prisma
  - Prisma 7+ requires connection URLs to be in `prisma.config.ts` (already configured) rather than schema file
  - Client uses adapter pattern via `lib/prisma.ts` (Neon or pg adapter based on environment)
  - Fixes Vercel build error: "The datasource property `url` is no longer supported in schema files"

## 0.61.0 - 2026-01-13

- **Action Bar config refactor**: Colocated split config files into focused structure with explicit view layout
  - Consolidated 10 files into 5: `model.ts` (types), `shared.ts` (helpers), `actions.ts` (colocated definitions), `views.ts` (left/right layout), `index.ts` (hydration)
  - View layout now explicit with `left`/`right` arrays - no position scattered across files
  - Inline overrides visible in `views.ts` - no mental computation of override layers
  - Added structural snapshot test to catch regressions in action ordering/positioning/types
  - Metrics: Jest (29 tests passing); TypeScript + ESLint clean

## 0.60.3 - 2026-01-12

- **All Categories table stability**: Fixed checkbox/row interaction freezes and improved selection UX
  - Single click selects; double click navigates; guarded interactive targets to prevent accidental navigation
  - Performance: memoized derived maps and stabilized sorting to avoid re-sorting on selection updates
  - UI polish: removed selection layout shift; fixed checkbox focus/visibility edge case
- **Action Bar feedback**: Added success toasts per action and a generic destructive failure toast; disabled “Remove” when there’s nothing to detach
  - Metrics: Jest `npm run test:ci` (36 suites, 299 tests passing); lint + typecheck clean

## 0.60.2 - 2026-01-12

- **Menu Builder consistency**: Captured post-commit “Accept All” edits as a follow-up patch
  - Formatting/import-order cleanup across menu builder state, table primitives, and docs
  - Metrics: Jest `npm run test:ci` (35 suites, 298 tests passing); lint + typecheck clean

## 0.60.1 - 2026-01-12

- **Menu Builder hook coverage**: Standardized All Categories selection to use view hooks only and added unit tests for new table-view hooks
  - Refactored All Categories rows/checkboxes to use `useContextSelectionModel` outputs (no direct builder selection reads)
  - Added Jest tests for `useContextSelectionModel` and `useContextRowUiState`
  - Removed unused legacy `TableViewRenderer` component
  - Metrics: Jest `npm run test:ci` (35 suites, 298 tests passing); lint + typecheck clean

## 0.60.0 - 2026-01-10

- **Release**: Version bump release commit
  - Updated `package.json` version to `0.60.0`

## 0.59.0 - 2026-01-07

- **All Categories table view**: Added stable “All Categories” table with consistent sorting and inline editing UX
  - Implemented selection, inline rename, visibility toggle, sortable headers, and auto-edit on newly created categories
  - Fixed category creation to generate slugs and default ordering to newest-first (`createdAt desc`)
  - Centralized shared table primitives (width presets, sortable header cell, checkbox/visibility/name editor cells) to stabilize alignment and hover/focus behavior
  - Refined default-name styling so only system-generated names (e.g. “New category”, “copy”) render muted/italic + ellipsis
  - Metrics: Jest `npm run test:ci` (29 suites, 281 tests passing)

## 0.58.1 - 2026-01-05

- **Code Quality & Type Safety Improvements**: Removed obsolete files and fixed all TypeScript/lint errors
  - **Deleted obsolete files**: action-builders.ts (unused after refactoring), index.test.tsx (tested removed functions)
  - **Fixed Jest mock types**: Using `jest.fn<T>()` pattern for proper type inference in test mocks
  - **Removed unused code**: Unused imports and prefixed unused params with underscore per ESLint rules
  - **React Compiler optimization**: Removed manual useMemo wrapper (React Compiler handles memoization automatically)
  - **Type safety**: Replaced `Promise<any>` with proper `Promise<{ ok: boolean; error?: string; data?: unknown }>` return types in dropdown components
  - **Net impact**: Cleaner codebase; zero TypeScript errors; zero lint warnings; proper type safety throughout

## 0.58.0 - 2026-01-05

- **Menu Builder Architecture Consolidation**: Unified action configuration with single source of truth, eliminating duplication and improving maintainability
  - **Consolidated action-bar-config.ts** (355→496 lines): All button configs + view-specific execute logic in one place; eliminated action-strategies.ts (269 lines deleted)
  - **Added ActionContext & ProductMenuMutations types**: Proper TypeScript types for execution context (no `any` types); validated with unit tests
  - **View-specific execute logic**: Each shared action (remove, clone, visibility) has execute/refresh/errorMessage per view (menu, label, category, all-labels, all-categories)
  - **Removed duplication**: Deleted action-strategies.ts; logic now in action definitions; 3-layer indirection reduced to 1 (config → execute directly)
  - **Created dropdown components**: AddLabelsDropdown, AddCategoriesDropdown, AddProductsDropdown using base DropdownContent component (consistent UI/search/sections)
  - **DROPDOWN_REGISTRY pattern**: Declarative mapping of action IDs to components with typed props builders; no switch statements
  - **Renamed & relocated provider**: ProductMenuProvider → MenuBuilderProvider (moved to menu-builder/); properly scoped to menu-builder feature only
  - **Simplified index.tsx** (294→271 lines): Extracted buildDropdownContent() helper; eliminated duplicate dropdown rendering; single `as any` with explanation
  - **Unit tests**: 72 tests passing (56 action-bar-config, 16 dropdown-registry); validates types, execute logic, disabled states, props building
  - **Net impact**: -152 lines total; better organization (all action logic co-located); clearer intent (config contains behavior); easier to extend (add view → add execute)
  - **Type safety**: All mutations properly typed; no `any` in config or context (only 1 justified `as any` in component spread)

## 0.57.0 - 2026-01-04

- **Menu Builder Architecture Simplification**: Refactored state management to use existing ProductMenuProvider pattern, eliminating duplicate data fetching and reducing cognitive load
  - **Created `useMenuBuilderState.ts`** (144 lines): Minimal UI state hook providing only navigation (URL-backed), selection (local), and expand/collapse state (local); no data fetching - delegates to ProductMenuProvider
  - **Extended ProductMenuProvider**: Added `builder` namespace to context with useMenuBuilderState integration; single source of truth for all menu-builder data and mutations
  - **Simplified MenuBuilder.tsx** (114→83 lines): Removed useMenuBuilder dependency; pure compositional component with no prop drilling; components self-contained via useProductMenu()
  - **Updated MenuNavBar**: Removed 10+ props; self-contained component getting data directly from provider; loading states included
  - **Updated MenuActionBar**: Removed 6+ props; self-contained component with internal state/actions building; strategy pattern integration preserved
  - **Wrapped MenuBuilder in provider**: Added ProductMenuProvider wrapper in page.tsx for menu-builder route only; doesn't affect labels/categories pages
  - **Undo/redo stubs**: Added undoStack/redoStack arrays to useMenuBuilderState (empty for now) to satisfy BuilderState interface; prevents undefined errors
  - **Code reduction**: 61% reduction in state management code (373 lines → 144 lines); eliminated duplicate SWR calls and data fetching
  - **Minimal surface area**: Only menu-builder feature affected; labels and categories pages untouched; reused existing infrastructure
  - **Architecture benefits**: Provider pattern (familiar), no prop drilling (components autonomous), single data source (ProductMenuProvider), clear separation (data vs UI state), easier maintenance (add state → update hook, add component → compose)
  - **Documentation**: Created state-management-refactor.md, simplification-plan.md, minimal-extension-plan.md, and refactoring-complete.md in docs/menu-builder/

## 0.56.0 - 2026-01-03

- **Menu Builder Phase 1 Complete - Foundation & Integration**: Centralized state management with URL persistence and strategy pattern for actions
  - **Central state management hook** (`useMenuBuilder.ts`): Single source of truth for all menu builder state including view navigation, selection state, expand/collapse state, undo/redo history, and data fetching via SWR; 373 lines of clean, documented code
  - **URL state persistence**: View navigation state (currentView, labelId, categoryId) persists in URL params for bookmarking, sharing, and refresh safety; local transient state (selections, expand/collapse) intentionally cleared on refresh for clean UX
  - **Action strategy pattern** (`actionStrategies.ts`): Declarative configuration object eliminates if/else chains; ACTION_STRATEGIES\[view\]\[action\] lookup with execute function, refresh array, and custom error messages; reduced cyclomatic complexity from 5-6 to 1 per action
  - **Integrated components**: MenuBuilder.tsx refactored to single useMenuBuilder() call; MenuNavBar.tsx refactored for URL-based navigation; MenuActionBar fully integrated with strategy-based actions
  - **Strategy executor** (`executeAction`): Generic action executor looks up strategy, executes logic, refreshes data (labels/categories/products), and handles errors gracefully with typed return values
  - **Navigation system**: navigateToView, navigateToLabel, navigateToCategory, navigateBack all update URL params via Next.js router; automatic selection clearing on navigation; browser back/forward buttons work naturally
  - **Comprehensive tests**: useMenuBuilder.test.ts (285 lines) covers selection, navigation, expand/collapse actions; actionStrategies.test.ts (242 lines) validates all view/action combinations and strategy completeness; 100% coverage of hook and strategy logic
  - **Documentation**: Complete implementation guide in docs/menu-builder-implementation.md; hub document in docs/menu-builder-README.md; all Phase 1 docs consolidated to /docs directory
  - **Code quality**: Reduced action handler complexity by 67% (120 lines → 40 lines); improved maintainability (add view = 5 min config); type-safe throughout with no `any` types; self-documenting configuration
  - **Architecture benefits**: Single source of truth (no duplicate state), declarative over imperative (config vs conditionals), composition over monolith (props not inheritance), persistent vs transient state strategy, test-driven quality

## 0.55.2 - 2026-01-02

- **Menu Builder action bar dropdowns**: Implemented interactive "Add existing" dropdowns with multi-select functionality for managing label, category, and product assignments
  - **Add Labels dropdown**: Toggle label visibility in menu with immediate updates and SWR cache refresh
  - **Add Categories dropdown**: Attach/detach categories to/from labels with proper relationship management through CategoryLabelCategory junction table
  - **Add Products dropdown**: Enhanced with search bar, 3 dynamic sections (Added/Unassigned/Available), alphabetical sorting within sections, and category assignment through CategoriesOnProducts junction table
  - **Product actions**: Created attachProductToCategory and detachProductFromCategory mutations with automatic primary category assignment, order management, and primary reassignment on detach
  - **UX refinements**: Fixed checkbox interaction by removing conflicting onSelect handlers, implemented multi-select with dropdown persistence, 300px max width with text truncation and ellipsis, overflow-x-hidden to prevent horizontal scrollbar
  - **Data flow**: Extended menu actions query to include products with categoryIds, created MenuProduct type with Zod schema, integrated into useProductMenuData hook and BuilderState for disabled logic
  - **Conditional rendering**: Dropdowns disabled when DB count is 0 (totalLabels/totalCategories/totalProducts), tooltips always visible when enabled
  - **Comprehensive unit tests** (29 tests): Complete test coverage for action bar dropdown logic including disabled states validation, product filtering (case-insensitive, partial matching), 3-section separation (Added/Unassigned/Available), alphabetical sorting within sections, checkbox checked states, combined search and sectioning, and button type rendering logic (combo vs standalone); exported filterProductsBySearch and sectionProducts functions for proper testability; fixed useProductMenuData tests to include products array in mock data

## 0.55.1 - 2026-01-01

- **Menu Builder hook test coverage**: Comprehensive unit tests for useProductMenuData hook with Zod schema validation
  - **Settings normalization tests** (3 tests): Verify text→title mapping, icon default fallback to empty string, undefined settings handling
  - **Labels and categories tests** (5 tests): Validate label/category ID preservation through hook pipeline, nested structure integrity, cross-reference associations between categories and their labels
  - **Edge case coverage**: Empty arrays, error state handling, full integration scenario with both labels and categories populated
  - **Zod schema validation**: All test data generated via productMenuDataSchema.parse() ensuring tests match production data flow
  - **Test suite**: 8 passing tests (13→21 total in menu settings workflow)

## 0.55.0 - 2025-12-30

- **Menu Builder navigation and architecture refactor**: Complete overhaul of Menu Builder with URL-based navigation, simplified data flow, and centralized error handling
  - **MenuNavBar component**: 3-segment navigation bar (Menu | Labels | Categories) with URL param routing (`?view=menu|label|category`), dropdown menus for label/category selection, and skeleton loading states to prevent UI jumps
  - **NavItem component**: Generic Button-based navigation segment with conditional icon rendering, selected state styling, optional dropdowns with scrolling (max-h-[200px]), and responsive design (icon-only on mobile)
  - **Architecture simplification**: Removed MenuBuilderContext and moved draft state to local dialog state; deleted legacy builder components (Canvas, PreviewPanel, SidebarActions, useMenuData); reduced complexity by ~300 lines
  - **Provider normalization layer**: Enhanced useProductMenuData to map DB schema fields (`settings.text`) to UI terminology (`settings.title`) and apply defaults (icon: "", title: "Menu") in a single location; components now trust provider values without duplicate checks
  - **Centralized error handling**: Moved error detection and toast notifications from individual components to MenuBuilder page level; single useEffect watches provider error state
  - **Fixed schema field mismatch**: Corrected MenuSettingsDialog to use schema field `text` (not `title`) for validation and save operations; fixed DynamicIcon fallback by conditionally rendering only when icon string is truthy
  - **Improved loading UX**: Added Skeleton component to MenuNavBar while data is loading; removed layout shift issues during initial render

## 0.54.1 - 2025-12-29

- **Menu Settings feature completion**: Finalized Menu Settings dialog with comprehensive testing, error handling, and UX refinements
  - **Provider-level loading states**: Exposed `isSaving` in useProductMenuMutations for clean mutation tracking; integrated hook `isLoading`/`isValidating` for data fetch and revalidation gating
  - **Toast notifications**: Added success toast on save ("Menu settings saved") and destructive toasts for server errors and validation failures; replaced console logging with user-facing feedback
  - **UX optimizations**: Relaxed disable logic to prevent input lockup during post-save revalidation; inputs/buttons disabled only during active save or initial load
  - **Comprehensive test suite**: 17 passing tests covering getProductMenuSettings and updateProductMenuSettings with zod schema-derived test data; validates boundary conditions, error handling, and type safety
  - **Backend validation**: All tests confirm proper Prisma upsert behavior, optional icon handling (undefined → empty string), text trimming, and database error resilience
  - **Type safety**: All test data generated via productMenuSettingsSchema.parse() to ensure tests stay synchronized with schema rules

## Unreleased

- **Menu Settings feature**: Complete implementation of validated menu settings dialog with icon picker and character-limited text input
  - **MenuSettingsDialog component**: Modal dialog with Zod validation, FormInputField with 12-char counter, optional IconPicker, proper error handling, and save/cancel flow
  - **Backend integration**: Integrated with existing ProductMenuProvider (SWR) and MenuBuilderContext for draft state management; uses `updateSettings` mutation for persistence
  - **Enhanced PageTitle component**: Added optional `action` prop to PageTitle for consistent header layout with action buttons across admin pages
  - **Incremental replacement**: Retired old SettingsBar and 3-column MenuBuilder layout; new implementation uses ProductMenuProvider + MenuBuilderContext (no useEffect, no props drilling)
  - **Pattern compliance**: Follows established patterns with FormHeading, FormInputField, InputGroupInput, FieldDescription under fields, and zod validation schema

## 0.53.1 - 2025-12-23

- **Shared NameSlugField component**: Created reusable form component with inline slug preview for consistent name/slug handling across product, category, and page editors
- **Slug generation centralization**: Consolidated slug logic in `useSlugGenerator` utility with enhanced unicode normalization and diacritic removal; retired hook pattern in favor of direct function import
- **Simplified visibility model**: Refactored category and label visibility from placement-specific flags (showInHeaderMenu, showInMobileMenu, showInFooterMenu) to single `isVisible` boolean; consolidated getCategoryLabelsFor\* functions into unified `getCategoryLabels()`
- **Admin UI simplification**: Reduced visual complexity in CategoriesTable and LabelsTable by replacing multi-option visibility UI with single toggle
- **Admin page titles**: Added consistent PageTitle components to categories and labels admin pages with descriptive subtitles

## 0.53.0 - 2025-12-23

- **Admin product menu feature refactor**: Consolidated categories/labels/menu-builder under a hidden route group and cleaned up legacy shims.
- **Single data/mutation model**: Standardized reads via SWR + Zod DTO parsing and mutations via server actions with shared invalidation.
- **Client cleanup**: Removed client-side REST fetch logic from table components; UI now delegates all data work to shared hooks/actions.
- **Dev/build stability**: Marked Prisma packages as server externals to avoid SSR bundling issues with Turbopack.

## 0.52.0 - 2025-12-21

- **Product Menu Builder scaffold**: Split builder into context-driven client components (SettingsBar, Canvas, SidebarActions, PreviewPanel) for clear separation of concerns and reusable state via MenuProvider.
- **Shared server actions with Zod validation**: Added menu actions wrapping existing category/label endpoints (create/update/delete/reorder, attach/detach categories) using runtime validation only, enabling reuse across Product Menu Builder and Category Management.
- **Preview and settings UX**: Desktop/mobile preview toggles, header-style preview, and inline menu text/icon controls wired through context without duplicating state.
- **Tech debt reduction**: Removed monolithic builder state, avoided duplicate fetch logic, and kept implementation aligned with existing category/label management flows; no database migrations.

## 0.51.0 - 2025-12-20

- **Category management UI refinements**: Dramatically improved admin category/label management experience with modern UX patterns
  - **Auto-order feature**: Added persistent auto-order toggle for labels with database storage (`CategoryLabel.autoOrder` field); when enabled, categories are automatically sorted alphabetically and manual drag-drop is disabled
  - **Visual indicators**: Category chips show grip icon only when drag-drop enabled (auto-order off); added `cursor-grab` and `cursor-grabbing` states for better drag feedback on both label rows and category chips
  - **Icon editing improvements**: IconPicker auto-opens on click and closes on blur/selection; added separate edit states for label name vs icon with independent save functions to prevent validation conflicts
  - **Dropdown menu enhancements**: 3-dot menu with visibility toggles (Header/Mobile/Footer), auto-order switch, rename/delete actions, and scrollable category group submenu; menu stays open during multi-select operations
  - **Delete confirmation**: AlertDialog with dynamic label name display warns about category detachment before deletion
  - **Layout polish**: Removed unnecessary borders from category table, moved icon column before label column, made label name fully clickable for edit mode
- **Database migration**: Added `autoOrder` boolean field to CategoryLabel model (defaults to false)
- **API updates**: Extended category-labels endpoints to persist/retrieve autoOrder state; updated validation schemas and type definitions
- **Test coverage**: All existing tests passing (11 tests in category-labels suite)

## 0.50.0 - 2025-12-19

- **Product menu visibility + ordering**: Added per-surface visibility flags (header/mobile/footer) and global visibility for labels and categories; introduced product ordering within categories via `CategoriesOnProducts.order` and created `ProductMenuDraft` model for staged menu edits.
- **API payloads**: Category labels GET now returns visibility/per-surface flags; products GET now returns `thumbnailUrl` (first image) and `categoriesDetailed` with category order for builder UIs.
- **Migration scope**: Applied migration locally only (Docker Postgres); Neon untouched pending release.
- **Tests**: Updated admin category-label and products route tests for new payload fields; targeted suites passing (18 tests across 2 suites).

## 0.49.0 - 2025-12-19

- **Signup page refactor**: Updated public signup to use the shared `SignIn` shell and `FormHeading` + `Field` + `FieldGroup` pattern for consistent spacing, labels, and error handling.
- **Password validation**: Integrated reusable `PasswordFields` with real-time strength checks (8+ chars, uppercase/lowercase/number/special, no spaces) and blur-based match validation.
- **Server action**: Added `signUpPublic` server action with Zod validation, strong password enforcement, unique email guard, user creation, and automatic sign-in redirect to `"/account"`.
- **Unit tests**: Added signup API route tests covering invalid email, weak password, duplicate email, and success; all tests pass (now 215 total).
- **Type safety**: Ensured Zod-based runtime validation and removed use of `any` in tests.

## 0.47.0 - 2025-12-18

- **Password reset backend**: Complete forgot-password/reset-password flow with secure SHA-256 token hashing, 30-minute expiry, and consumption tracking
- **Strong password validation**: 8+ characters with uppercase, lowercase, number, and special character requirements (no spaces allowed)
- **Email delivery**: Branded PasswordResetEmail template via Resend with store name and support email
- **Comprehensive tests**: 24 passing unit tests for password validation (9 tests) and reset service (10 tests) with mocked dependencies
- **Auth consolidation**: Merged auth actions, updated admin sign-in redirect, added reusable SignIn/LoginForm components with email retention on errors
- **Auth concerns**: Separate site user and admin sign in pages
- **Password reset UX enhancements**: Reusable PasswordFields component with real-time strength indicators, green checkmarks on requirements met, two-field entry with blur-based matching validation, text inputs for visibility, non-interactive status icons via InputGroupAddon
- **Forgot-password flow**: Icon-based success/error messages (green checkmark or red triangle), no auto-redirect to let users choose next action
- **Accessibility improvements**: Submit buttons stay focusable with aria-disabled pattern, required field asterisks auto-applied via FormHeading
- **Auth directory restructure**: Renamed sign-in to auth for shared authentication components, store branding (logo, name) displayed on all auth pages

## 0.46.3 - 2025-12-17

- **PageContainer standardization**: Applied PageContainer component across all client pages (OrdersPageClient, AccountPageClient, OrderDetailClient, contact, checkout success/cancel) replacing manual container divs for consistent layout patterns.

## 0.46.2 - 2025-12-16

- **PageContainer component**: Created reusable page wrapper component with standardized `mx-auto max-w-screen-2xl px-4 sm:px-8 py-8` layout; supports custom pageWidth prop (default, "full", or custom string) and className override for flexible spacing control.
- **Site-wide container standardization**: Applied PageContainer across all client pages in (site) directory: OrdersPageClient, AccountPageClient, OrderDetailClient, contact page, checkout success/cancel pages; replaced manual container divs with consistent wrapper component for maintainable layout patterns.

## 0.46.1 - 2025-12-16

- **Homepage layout improvements**: Added gap-4 to small batch collection grid for proper spacing between product cards; removed sparkle/trending icon wrapper to eliminate indentation on recommendations section header.
- **Recommendations API fix**: Added preferredRoastLevel field to userPreferences in personalized recommendations response; frontend now correctly displays "Based on your love for [roast] roasts" message when user has purchase history.
- **Image positioning fix**: Corrected invalid `object-top-left` Tailwind class to `object-cover` in ImageCarousel and Thumbnail components for proper centered image display.
- **Layout consistency**: Updated section padding across ChatBarista, FeaturedProducts, and RecommendationsSection to use consistent max-width wrappers for proper full-width backgrounds.

## 0.46.0 - 2025-12-16

- **Product image gallery refactor**: Switched to Next.js `Image` with a new reusable `Thumbnail` component. Single thumbnail set with responsive positioning (sm: dots only; md–lg: thumbnails below; xl+: thumbnails upper-left). Removed Fade to allow smooth scroll animation; fixed overflow and scrollbar issues.
- **Related products carousel**: Replaced shadcn slider with `ScrollCarousel`, implemented responsive slides per view (xs:1, md:2.5, lg:3, xl+:4), reduced gaps, and ensured card images render 1:1 without extra per-card padding by default.
- **Site-wide layout normalization**: Standardized header, content, and footer to a `max-w-screen-2xl` wrapper. Removed page-level container constraints and set `(site)` layout wrapper padding to `px-0` for consistent width across pages.
- **Product selection UI**: Created reusable `ProductSelectionsSection`, `ProductPurchaseTypeSelector`, and `ProductDeliverySchedule` components to handle coffee product metadata, purchase type (one-time vs subscription), and delivery cadence selection. Configured flexible spacing via optional `spacing` prop.
- **Bugs fixed**: Restored dots on small screens, corrected `CarouselDots` props/visibility, eliminated horizontal scrollbar caused by arrows, and addressed parsing error in `ImageCarousel` after refactor.

## 0.45.2 - 2025-12-15

- **Merch add-product routing**: Admin merch list now routes Add/Edit/Back actions to the merch path instead of the coffee products form, keeping context when adding merch.
- **Seeds synced to latest backup**: CMS seeds now mirror current content/navigation (About/Café/FAQ metadata, Brewing Guides page, Features/Contact link pages) and site settings seed social links + add-on headings; menu seeding upserts categories by name to respect unique constraint.
- **Install doc fix**: Corrected local Postgres dev URL example to use the default `postgres` database in the port-3001 snippet.

## 0.45.1 - 2025-12-15

- **Save button accessibility**: Keep Save buttons focusable/active even when fields are unchanged, only blocking during in-flight saves; clicks with no edits now surface an "Already saved" status in FormHeading for consistent feedback across inputs and textareas.
- **Build reliability**: Added direct-build path (`build:direct`/`vercel-build`) that sets `DATABASE_URL=$DIRECT_URL` and `PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT=60000` to avoid Neon pooler advisory-lock timeouts during migrate.

## 0.45.0 - 2025-12-15

- **Option card spacing normalization**: Standardized OptionCardGroup default vertical gap to 2 and reused it across AI Assist so variation pickers match settings pages; per-instance className overrides remain available for custom spacing.
- **Field description nesting fix**: Wrapped non-text settings descriptions in a local container to avoid nested `<p>` tags and hydration warnings while keeping the shadcn FieldDescription unchanged.
- **Settings architecture refactor**: Replaced 1600-line monolithic SettingsManagementClient with page-based settings architecture inspired by Next.js; created reusable SettingsField component that handles all boilerplate (fetch, state, save, dirty tracking, toast notifications); settings now organized into 6 dedicated pages (General, Store Front, Location, Commerce, Marketing, Contact) with sidebar navigation and active state highlighting; each field reduced from ~50 lines of repetitive code to ~10 lines of declarative configuration; supports custom input components via render props with automatic isDirty state passing; settings layout uses client component with usePathname for active nav state; eliminates 15+ duplicated state variables and fetch/save handlers.
- **Customizable product menu**: Added admin settings UI for configuring product menu icon and text displayed in header and footer navigation; created reusable IconPicker component with search and 50+ icon options; added API endpoint `/api/admin/settings/product-menu` with Zod validation; created `lib/product-menu-settings.ts` helper function; updated SiteHeader and FooterCategories components to dynamically display configured icon and text instead of hardcoded "Coffee Selection"; default values are ShoppingBag icon and "Shop" text.
- **Build script fix**: Restored `npm run build` to run Prisma migrate + generate before the Next.js build (typo regression caused the command to fail).

## 0.43.0 - 2025-12-14

- **Multi-image product uploads**: Created reusable MultiImageUpload component with configurable grid layout (1-6 columns), hover-only controls, filename display with high contrast, and support for multiple aspect ratios; updated ProductFormClient to support up to 5 images with deferred upload pattern; updated API endpoints (POST/PUT) and validation schemas to handle images array; images stored with order, altText, and URL in ProductImage table.
- **Product form UX improvements**: Combined name and slug fields into inline InputGroup with real-time slug preview; updated Coffee Details section to use FormHeading component for consistent label/error styling; fixed slug generator to properly clear when name field is empty; moved slug watch to component level for proper re-rendering.
- **Product edit URL persistence**: Refactored ProductManagementClient to use URL parameters instead of component state for view/product selection; enables page refresh without losing context; URLs now follow pattern `/admin/products?view=edit&id=<productId>` for editing and `/admin/products?view=new` for creating.
- **Category data integrity enforcement**: Added unique constraint on `Category.name` to prevent duplicate category names; cleaned up 3 existing duplicate category sets (Fruity & Floral, Nutty & Chocolatey, Spicy & Earthy) by merging into canonical categories with most product/label associations; created cleanup script in `dev-tools/cleanup-duplicate-categories.ts` for merging duplicate categories while preserving all product and label links.
- **Category label cleanup**: Deleted redundant "Roasts" label from database and seed file that was conflicting with "By Roast Level" label causing duplicate categories and empty label groups in admin product form; the two labels had same order value and contained identical Light/Medium/Dark Roast categories leading to deduplication issues.
- **Admin product form enhancements**: Improved product creation form with clear separation of coffee-specific fields in dedicated section with border styling; added comprehensive Zod validation to product API endpoints with discriminated unions for COFFEE vs MERCH types; moved `isOrganic` to common fields (available for both types); enhanced field labels and descriptions for better admin UX; added "Back to catalog" navigation button; changed form title from "New Product" to "Add a Product" with simplified subtitle.
- **Admin layout standardization**: Normalized all admin page headers to consistent structure (text-3xl font-bold, text-muted-foreground mt-2 subtitle, mb-6 spacing); removed container wrappers from all pages to rely on admin layout padding; fixed double scrollbar issue by making admin layout fixed with `fixed inset-0`; updated ProductManagementClient to show headers outside Card component matching other admin pages.
- **Product validation architecture**: Created `lib/validations/product.ts` with base schema for common fields, coffee-specific fields schema, and separate update schemas using discriminated unions; fixed `.partial()` error by creating separate update schemas for coffee and merch products; all API endpoints now validate with detailed error messages on failure.

## 0.42.0 - 2025-12-14

- **Next.js upgrade**: Updated Next.js from 16.0.7 to 16.0.10 (latest stable); updated eslint-config-next to match.
- **Node.js upgrade**: Updated project requirements to Node.js v22 LTS (current stable); added engines field to package.json enforcing Node >=22.0.0 and npm >=10.0.0; updated documentation in SETUP.md and copilot instructions; updated GitHub Actions workflow to use Node v22.
- **Test console cleanup**: Suppressed expected console.error logs in add-ons API error-handling tests to reduce test output noise.
- **Test environment fixes**: Added matchMedia, IntersectionObserver, and ResizeObserver mocks to jest.setup.ts for Embla Carousel compatibility; updated ScrollCarousel tests to match new Embla implementation structure (flex container, no px-4 class); suppressed Framer Motion prop warnings in test output; all 10 tests passing.
- **Add-ons test fixes**: Added missing images and categories arrays to all mock addOnProduct objects in actions tests; updated test expectations to include imageUrl and categorySlug fields returned by getProductAddOns.

## 0.41.0 - 2025-12-13

- **Embla Carousel integration**: Replaced custom CSS scroll-snap carousel with Embla Carousel library for reliable touch/swipe gestures on mobile and mouse drag on desktop; added autoplay support with configurable delay and stop-on-interaction; integrated CarouselDots component with Framer Motion animations.
- **Carousel touch improvements**: Fixed pointer event handling with touch-none class, vendor-prefixed userSelect, draggable={false} on images, and stopPropagation on buttons to enable smooth swipe navigation without interference.
- **Visual refinements**: Updated carousel to use CarouselDots with smooth animations, removed container padding to eliminate partial slide views, adjusted slide width calculations for consistent 2.5 slides-per-view layout.
- **Add-ons settings management**: Added admin UI section for customizing add-on section headings (product page and cart), with dedicated API endpoint, individual save buttons, and dirty state indicators following site settings patterns.
- **Recommendations URL fix**: Fixed product links in RecommendationsSection to use primary category instead of non-existent "recommendations-personalized" or "recommendations-trending" slugs that created invalid /recommendations/\* URLs.

## 0.40.0 - 2025-12-12

- **Add-ons carousel**: Created reusable ScrollCarousel component with configurable slides-per-view, added carousel to product add-ons section with single slide display, theme-aware dots navigation (noBorder prop), debounced scroll tracking, and full-width slide support.
- **Carousel refactor**: Refactored CarouselBlock to use ScrollCarousel internally, eliminating duplicate scroll logic and centralizing carousel behavior in one reusable component.
- **ScrollCarousel children handling**: Fixed ScrollCarousel to properly handle React children using `Array.isArray()` check instead of requiring array type, enabling single-child usage; fixed gap/padding props to use Tailwind classes as defaults and actually apply custom values.
- **Test coverage fixes**: Updated actions.test.ts mock data to match new AddOnLink schema (primaryProductId, addOnProduct, addOnVariant fields); fixed WeightUnit enum mock to use IMPERIAL instead of "ounces"; all 150 tests passing.

## 0.39.0 - 2025-12-12

- **Server actions for add-ons**: Migrated product add-ons to server actions with `getProductAddOns()` fetching data server-side for better performance and type safety; both product routes now render add-ons without client-side API calls.
- **Component co-location**: Moved ProductClientPage from `components/app-components` to route directory following Next.js App Router best practices; added AddOnCard component for displaying add-on products with discount pricing.
- **Add-ons test coverage**: Created comprehensive test suite for server actions (10 tests covering empty results, filtering, weight conversion, error handling, and ONE_TIME purchase options); all 140 tests passing.
- **Architecture cleanup**: Removed unused `/api/products/[id]/addons` API route; added formatPrice utility to lib/utils for consistent price formatting across components.

## 0.38.2 - 2025-12-12

- **Product add-ons test coverage**: Added comprehensive unit tests for add-ons CRUD API (19 tests covering GET, POST, DELETE endpoints with authentication, validation, error handling, and business logic); fixed ESLint warnings in test files and ProductAddOnsClient.

## 0.38.1 - 2025-12-12

- **Product add-ons UX refinements**: Replaced product selector with searchable Combobox component, added GET endpoint for variants, reorganized form into single-line layout with inline labels, fixed SelectValue display for variants, improved accessibility by removing unnecessary disabled states.

## 0.38.0 - 2025-12-11

- **Product add-ons management**: Added ProductAddOnsClient component and API routes for creating add-on relationships between products, with optional variant-specific links and discounted pricing; integrated into product edit page below variants section.

## 0.37.0 - 2025-12-11

- **Weight-balanced category menus**: Implemented self-balancing 3-column navigation with CategoryMenuColumns component using greedy weight-based distribution algorithm that keeps label groups semantically together while balancing visual height across columns.
- **Category label icons**: Added optional icon support to CategoryLabel model, integrated DynamicIcon rendering in header (desktop/mobile), footer, and all navigation menus with uniform padding and vertical alignment.
- **Comprehensive test coverage**: Added 27 unit tests for CategoryMenuColumns (rendering, icons, expand/collapse, weight distribution, accessibility, edge cases) plus integration tests for SiteHeader and FooterCategories; all tests passing.
- **Database migration**: Updated backup/restore scripts to include CategoryLabel tables, successfully migrated all data to Neon with proper FK ordering.
- **Environment indicator**: Enhanced dev badge to show database type (Neon/Local/Postgres) via /api/dev/db-info endpoint for instant connection visibility.

## 0.36.1 - 2025-12-11

- **Header hydration fix**: Gated Radix navigation, search dialog, cart, and mobile sheet behind a client-mount flag to eliminate ID mismatches between SSR and client.
- **Product card safety**: Product links now fall back when category relations are missing, preventing runtime crashes while still honoring incoming category context.

## 0.36.0 - 2025-12-11

- **Canonical weight storage**: Store variant weights in grams and convert on the fly based on the site weight-unit setting; admin product/variant APIs now translate inputs/outputs with rounding helpers to keep UI and DB consistent.
- **Weight unit UX & safety**: Client components use shared, client-safe enums/guards to avoid Prisma in the browser while reflecting the selected unit across variant dialogs and settings.
- **Schema & seeds**: Dropped `Product.weight`, made `ProductVariant.weight` required, added a migration for the new shape, and kept seeds configurable via `SEED_WEIGHT_UNIT` (default imperial).

## 0.35.1 - 2025-12-11

- **Category label tests**: Added API unit coverage for creating/updating labels (optional icon, unique names), attaching/detaching and reordering categories, cross-label attachments, label reorder, and auto-sort; ensures delete detaches categories without fallback labels.

## 0.35.0 - 2025-12-10

- **Category labels model**: Replaced `Category.labelSettingId` with `CategoryLabel` + `CategoryLabelCategory` join, added migration `20251210214740_add_category_label_and_join_tables`, and updated Prisma client/seeds to attach default Collections/Roasts/Origins labels.
- **Admin label APIs**: New `/api/admin/category-labels` endpoints for CRUD, reorder, attach/detach categories, and per-label auto-sort; category POST/PUT now accept `labelIds` and clean up joins on delete.
- **Admin UI overhaul**: Category management now has Groups/Categories tabs, inline label add/edit with icon picker, drag-and-drop reorder for labels and category pills, attach/detach controls, and per-label auto sort; category form supports multi-label selection.
- **Navigation & product UX**: Header/footer menus group categories by labels; product detail selects roast label for related products; data helpers now return label-grouped categories.
- **Seeding & local setup**: Seeds create labels and attach categories via join table; migration and seed flow verified against local Postgres (standard adapter) without touching Neon.

## 0.34.8 - 2025-12-10

- **Custom category groups**: Admins can type any group label when creating/editing categories; backend auto-creates or reuses label settings and returns group suggestions so storefront grouping matches admin intent.

## 0.34.6 - 2025-12-10

- **Product disable flag**: Added `Product.isDisabled` with admin toggle, filtered it out of search/recommendations/public product queries, and 404s product pages for disabled items.
- **Order safety**: Checkout and Stripe webhook now block disabled products and enforce variant stock before creating sessions/orders; historical orders still show disabled items for transparency.
- **Tests**: Added checkout guard tests and purchase-history coverage for disabled products; regenerated Prisma client and applied migration `20251210162204_add_product_disabled_flag`.
- **Merch catalog & add-ons**: Expanded merch seed to 12 SKUs with featured ordering, bundle add-ons, and default weights/stock; minimal seed mode now keeps a single merch item for clean installs.
- **Backup coverage**: Included `AddOnLink` and `AiTokenUsage` tables in the backup script so dev snapshots capture add-ons and AI telemetry.

## 0.34.3 - 2025-12-10

- **Unified product catalog**: Collapsed merch into the main `Product` model with `ProductType`, preserved `CategoryKind`, and replaced `ProductAddOn` with a single `AddOnLink` table plus variant SKU support.
- **Seeds and admin UX**: Added optional `SEED_INCLUDE_MERCH` module for merch upserts, surfaced a merch admin page and sidebar entry, and kept coffee-only fields conditional in product card/detail rendering.
- **API/tests alignment**: Updated search/recommendations/track-activity tests to current response shapes and query handling; refreshed search input copy and regenerated Prisma client after migration.

## 0.34.1 - 2025-12-09

- **Product weight enforcement**: Made product weight required in Prisma schema/migration, kept variant weight optional, and validated admin form/API while seeding derived weights with safe defaults.
- **Admin product tests**: Added co-located POST route test for merch creation and weight validation; Jest config now allows API route tests and setup guards Node environments.
- **UI lint cleanups**: Normalized Tailwind classes in About editor and toast viewport to satisfy style rules.

## 0.34.2 - 2025-12-09

- **Product add-ons schema**: Added `ProductAddOn` model to link a primary product to multiple add-on products/variants with optional discounted bundle pricing; updated Product/Variant relations and created migration for the new table.

## 0.34.0 - 2025-12-09

- **Docker deploy tooling**: Added multi-stage Dockerfile and docker-compose with Postgres, runtime build + migrate, and volumes for data/uploads.
- **Health & env checks**: Introduced `/api/health` with env/DB/Stripe/Resend checks and `lib/validate-env.ts` for required/optional vars.
- **Runbooks**: Added `.env.docker.example` and `docs/docker-smoke-test.md`; linked installation guide to the Docker smoke checklist.

## 0.33.5 - 2025-12-09

- **Prisma adapter safety**: Moved `LocationType` to a client-safe module to keep Prisma/pg out of browser bundles and updated all imports accordingly.
- **Admin/bootstrap tooling**: Added `npm run setup` and `npm run create-admin` to provision schemas, seeds, and owner/admin accounts in one command; exposed CRUD smoke test via `npm run db:smoke`.
- **Install docs polish**: Documented explicit copy/paste commands for switching between Neon and local Postgres, including env toggles and setup runbook.

## 0.33.4 - 2025-12-09

- **Clean-install seed toggles**: Added env flags to skip synthetic data (`SEED_INCLUDE_SYNTHETIC=false`) and user seeding (`SEED_INCLUDE_USERS=false`) for owner-first admin creation.
- **Minimal product mode**: Introduced `SEED_PRODUCT_MODE=minimal` to seed just two demo items (coffee + merch) while keeping full catalog as default.
- **Merch support**: Seeded a `merch` category to classify non-coffee product in minimal mode.
- **Adapter-neutral seeding**: Maintained Neon/Postgres adapter detection across seed entry to keep single-build compatibility.

## 0.33.3 - 2025-12-09

- **AI Assist test coverage**: Added overlay/data-testid for regeneration state, adjusted radio interactions, and expanded client/cache route tests to align with current hook props and replace-blocks/ai-state handlers.
- **Activity tracking stability**: Kept fetch-error handling silent in tests to avoid noisy output while preserving failure logging in implementation.
- **CI workflow housekeeping**: Ensured build-safe main pipeline remains aligned with current env defaults and test expectations after AI Assist updates.

## 0.33.2 - 2025-12-08

- **AI Assist persistence & caching**: Added `/api/admin/pages/[id]/ai-state` for storing selected style/answers, improved localStorage hydration, fingerprinting, and block snapshots to reuse cached variations safely.
- **AI Assist UX polish**: Dialog now closes after regenerate, reset draft on close, and regeneration skips when content/style unchanged; improved logging with dev-default toggle.
- **Toast behavior & styling**: Auto-dismiss toasts after 5s, inverted toast theme with plain "X" close, and consistent Radix viewport padding.
- **Minor fixes**: Resolved type issues in `useAiAssist` application path to align with block types.

## 0.33.1 - 2025-12-08

- **AI Assist client rename**: Replaced `AiAssistShell` with `AiAssistClient`, extracted fallback answer defaults, and wired `PageEditor`/dialog components to the new client wrapper for clearer ownership of AI state.
- **AI Assist refactor**: Moved orchestration into `useAiAssist`, reused the shared `BlockDialog` shell in `AiAssistDialog`, simplified `PageEditor` to rely on the hook (single richText path, no merge), tightened effect deps, and validated via pre-commit lint/typecheck.

## 0.33.0 - 2025-12-07

- **About AI Assist (fingerprints & reuse)**: `generate-about` now validates requests via zod schema, computes stable answers/content fingerprints to short-circuit unchanged runs, preserves hero alt reuse, and logs Gemini token usage per provider/feature for reporting.
- **Admin AI workflow**: Added `AiAssistDialog` and `AboutAnswerEditor` to `PageEditor` with style picker, answer editing, and cached variations; applies chosen variation through the new replace-blocks API without full page reload.
- **Block replacement API**: New `/api/admin/pages/[id]/replace-blocks` endpoint normalizes incoming blocks, enforces hero/image requirements, and swaps page blocks transactionally before updating meta descriptions.
- **Schema & migrations**: Introduced `AiTokenUsage` Prisma model with indices plus migrations to store provider/feature/latency/token fields; generation route writes token rows for main and alt-text calls.
- **Seeds & docs**: Updated About page seed stats (250+ cups daily), documented the about generator endpoint/models, and refreshed AI recommendations architecture notes on feature naming and nullable token fields.

## 0.32.1 - 2025-12-05

- **CI Resilience**: `check:backup-models` now skips gracefully when `dev-tools/check-backup-models.ts` is absent, preventing build-safe workflow failures on environments without private dev tools.

## 0.32.2 - 2025-12-05

- **CI Resilience (Backup)**: `db:backup` now skips gracefully when `dev-tools/backup-database.ts` is absent so build-safe can run in environments without private backup tooling.

## 0.32.3 - 2025-12-05

- **CI Env Defaults**: `build-safe-main` workflow now provides dummy `STRIPE_SECRET_KEY`/`RESEND_API_KEY`/`RESEND_FROM_EMAIL` fallbacks to prevent build failures when secrets are not present in CI.

## 0.32.4 - 2025-12-05

- **CI Build Cache**: `build-safe-main` restores/saves Next.js/Turbopack cache (`.next/cache`, `.turbo`) to speed up repeated CI builds.

## 0.32.0 - 2025-12-05

- **CMS Seeds Modularization**: Split CMS seeding into focused About/Café/FAQ functions with refreshed multi-location copy and consistent block rebuilds for both single and multi layouts.
- **Demo Credentials Hardening**: Seeded demo/admin accounts now hash passwords with bcrypt to align with auth expectations while keeping existing demo profiles intact.
- **Backup & Restore Guidance**: Expanded seed README with restore usage, integrity checks, selective seeding tips, and drift mitigation notes to keep environments recoverable.
- **Safety Automation**: Added `build-safe-main` GitHub workflow to run `npm run build:safe` (schema coverage → backup → build) and documented the gate in the commit procedure for main merges.

## 0.31.0 - 2025-12-05

- **Modular Seed System**: Complete database seeding architecture overhaul with 7 focused modules
  - Transformed monolithic 2459-line seed.ts into maintainable modules (settings, categories, products, users, cms-pages, synthetic-data)
  - Migrated complete 30-product specialty coffee catalog with variants and pricing
  - Added comprehensive synthetic data generation (user activities, orders, newsletter subscribers) for realistic testing
  - Implemented dependency-ordered execution with upsert operations for safe re-seeding
  - Fixed foreign key constraint issues for reliable database population
  - Updated package.json seed script to use new modular orchestrator
  - Created comprehensive README.md with usage instructions and troubleshooting

## 0.30.9 - 2025-12-05

- **Documentation Enhancement**: Improved commit procedure with practical suggestions
  - Added branching strategy guidelines (feature → integration → main workflow)
  - Included quality assurance steps (npm i, precheck, build before commits)
  - Added version synchronization best practices
  - Documented documentation update guidelines
  - Provided large feature development strategies
  - Enhanced AI assistant workflow integration

## 0.30.8 - 2025-12-05

- **Final Code Quality Cleanup**: Resolved remaining 2 ESLint warnings ✅ **0 errors, 0 warnings**
  - Fixed `CarouselBlock.tsx`: Suppressed false positive exhaustive-deps warning for stable `clearAllErrors` function from `useValidation` hook
  - Fixed `useImageUpload.ts`: Added `images` dependency to cleanup useEffect for proper preview URL revocation
  - All code quality issues now resolved with automated enforcement in place

## 0.30.7 - 2025-12-05

- **Code Cleanup**: Removed all unused variables and imports, suppressed legitimate lint warnings ✅ **0 errors, 2 warnings** (down from 67!)
  - Deleted 600+ lines of unused code
  - Removed duplicate `components/PageEditor.tsx` (was shadowed by `components/app-components/PageEditor.tsx`)
  - Prefixed all unused function parameters with `_` to satisfy linter
  - Removed unused imports: Select, Card components, DynamicIcon, lucide icons, useEffect
  - Removed unused state variables: setMounted, setFooterOrderValue, setIconValue, isAdmin
  - Removed unused computed values: availableBlocks, reorderBlocks
  - Added `eslint-disable-next-line` comments for legitimate `<img>` tag usage in admin preview contexts:
    - `SettingsManagementClient.tsx`: Logo and favicon preview (user-uploaded URLs)
    - `ImageField.tsx`: Pending file preview with object URL
    - `ImageGalleryBlock.tsx`: Gallery image preview with object URL
  - Remaining 2 warnings are non-critical exhaustive-deps (pre-existing)

## 0.30.6 - 2025-12-05

- **Automated Code Quality Enforcement**: Prevent common mistakes at write-time and commit-time ✅ **0 errors, 67 warnings**
  - **ESLint Strict Rules**: Configured all common errors as "error" (not "warn") in `eslint.config.mjs`
    - `@typescript-eslint/no-explicit-any` - Force proper typing, never use `any`
    - `react-hooks/set-state-in-effect` - Prevent setState in useEffect (cascading renders)
    - `react-hooks/static-components` - Prevent component creation during render
    - `@typescript-eslint/no-unused-vars` - Fail on unused imports/variables (allow `_` prefix)
  - **Ignored Paths**: Excluded AI wizard and edit page directories from linting (features not in use)
    - `app/admin/pages/new/wizard/**` - AI page generation (revisit later)
    - `app/admin/pages/edit/[id]/**` - Page editing (has type issues with JsonValue)
    - `app/api/admin/pages/generate-about/**` - AI generation API
  - **Pre-commit Hook**: Git automatically runs typecheck + lint before every commit (via Husky)
    - Blocks commits with TypeScript errors or ESLint errors
    - Catches mistakes before they enter codebase
    - Tested and working (caught real errors during setup)
  - **VS Code Auto-fix**: Added `editor.codeActionsOnSave` to `.vscode/settings.json`
    - ESLint auto-fixes on save for instant feedback
  - **Documentation**: Created comprehensive `docs/CODE_QUALITY_STANDARDS.md`
    - Common patterns and anti-patterns with examples
    - Setup instructions for Husky and ESLint
    - Troubleshooting guide for git hooks
    - Explains why each rule exists and how to fix violations
- **StatCard Refactor**: Replaced Lucide icon imports with DynamicIcon component
  - Fixes react-hooks/static-components violation
  - Changed `icon` prop from `LucideIcon` type to `string` (icon name)
  - Simpler, more consistent with rest of codebase
- **Dependencies**: Added `husky@^9.1.7` for git hooks
- **Benefits**: Red squiggles in editor → Pre-commit validation → No more chasing these errors later

## 0.30.5 - 2025-12-05

- **Code Quality Improvements**: Continued ESLint and TypeScript cleanup (112→98 problems, 25→11 errors)
  - Fixed remaining react-hooks violations in SiteBannerPortal and StatCard
  - Replaced 10+ `any` types with proper TypeScript types in blocks, API routes, and layouts
  - Fixed @typescript-eslint/no-explicit-any errors in blocks/actions, CarouselBlock, cafe/reseed
  - Used `Prisma.JsonValue` for JSON fields, proper interfaces for component props
  - Fixed react/no-unescaped-entities in PageEditor files (replaced quotes with &ldquo;/&rdquo;)
  - Added BlockHandlers type to two-column layout
- **Documentation**: Created standard commit procedure in `.github/COMMIT_PROCEDURE.md`
  - Defines when and how to commit with changelog updates
  - Includes version numbering guidelines (semantic versioning)
  - Best practices for commit messages and changelog entries
  - Template checklist for consistency across sessions
- **Remaining Work**: 11 errors (AI wizard files to revisit later) and 87 warnings (unused imports/variables)

## 0.30.4 - 2025-12-05

- **Code Quality Improvements**: Major ESLint and TypeScript cleanup (135→112 problems, 49→25 errors)
  - Fixed all react-hooks/set-state-in-effect violations (5 files) using proper React patterns
  - Fixed react-hooks/static-components error in StatCard component
  - Replaced 15+ `any` types with proper TypeScript types (Record<string, unknown>, etc.)
  - Fixed all @next/next/no-html-link-for-pages violations (replaced `<a>` with `<Link>`)
  - Added missing Link imports to AdminHeader and AdminSignInClient
  - Fixed optional field handling in AdminSidebar NavItem interface
- **Remaining Work**: 25 errors and 87 warnings to address in next iteration

## 0.30.3 - 2025-12-05

- **Page Icon Selection**: Admins can now assign Lucide icons to pages for display in navigation
  - Added searchable icon picker to PageEditor with 1000+ Lucide icons
  - Icons display in header navigation and mobile menu (not footer)
  - Human-readable icon names ("Circle Question Mark" vs "CircleQuestionMark")
  - Uses shadcn Command (combobox) + Popover components
- **AdminSidebar Ordering**: Content pages now sort by their header/footer order settings
  - Pages shown in AdminSidebar reflect their navigation order
  - Header pages listed first, footer pages second, unassigned pages last
- **Mobile Navigation Enhancement**: Dynamic pages with icons now appear at bottom of mobile menu
  - Visual separator between coffee categories and page links
  - Left-aligned icons with consistent spacing
- **Documentation**: Added demo pages architecture documentation
  - Explains separation between demo pages (developer tool) and CMS pages (product feature)
  - Documents legacy content block implementation plan (backlog)

## 0.30.2 - 2025-12-04

- **LINK Page Management**: Admin interface for managing navigation links to hardcoded pages
  - Add url field to Page model for external/internal link destinations
- Add LINK page type to PageType enum
- Include missing migration file for LINK page type changes
- Update LinkPageEditorClient to use FieldLabel pattern (shadcn convention)
- Add LINK page type handling in layouts configuration
- Update SiteHeader types to include url and type fields"

## 0.30.1 - 2025-12-04

- **LINK Page Management**: Admin interface for managing navigation links to hardcoded pages
  - Created `/admin/pages/link/[slug]` route for LINK page settings (show/hide in header/footer, display order, URLs)
  - AdminSidebar now dynamically displays LINK pages from database with ExternalLink icons
  - Updated SiteHeader and SiteFooter to use `url` field for LINK pages instead of hardcoded paths
  - Fixed route conflicts by moving edit pages from `/admin/pages/[id]/edit` to `/admin/pages/edit/[id]`

## 0.30.0 - 2025-12-04

- **FAQ Page**: New FAQ page type with accordion layout, category grouping, search/filter, and expand/collapse functionality
  - `FaqPageContent`: Public display with search bar, category tabs, grouped accordions
  - `FaqItemBlock`: Individual FAQ blocks with question, answer, and category selector
  - `FaqAccordionItem`: Reusable accordion component with animated chevron
  - Fixed categories: Orders, Shipping, Returns, Products, Subscriptions, Account, General
  - Accordion layout supports hero + up to 50 FAQ items
- **Hero Block Improvements**: Renamed `title` to `heading`, made optional for image-only heroes
- **Seed Updates**: About and FAQ pages now use block-based architecture with placeholder images

## 0.29.6 - 2025-12-04

- **Add Block Dialog**: New `PendingBlockDialog` component opens form with empty fields when clicking "Add" buttons; creates block in DB only on confirm (no wasted trips)
- **Stat Block Emoji Fix**: Admin edit mode now shows emoji instead of auto-icon (was missing emoji prop)
- **PullQuote Delete Button Removed**: Required blocks (hero, richText, pullQuote) now consistently have no delete button
- **Updated baseline-browser-mapping**: Removed build warning spam

## 0.29.5 - 2025-12-04

- **Preview Mode for Unpublished Pages**: Admin users can preview unpublished pages via `?preview=true` query param with visual banner indicator
- **Reusable SiteBanner System**: Created `SiteBanner` component with variants (preview, promo, info, warning, error) and context-based `SiteBannerPortal` for dynamic banners
- **PageSlug-based Image Uploads**: Images now upload to `/public/pages/[pageSlug]/` directories for better organization; cleanup handles both old and new paths
- **Fixed Reseed Route**: Corrected invalid default values (empty googleMapsUrl, images array) that violated block schema validation

## 0.29.4 - 2025-12-04

- **Block Wrapper Centralization (Option B)**: Complete architectural refactor for consistent edit/delete controls
  - `BlockRenderer` now wraps all blocks with `EditableBlockWrapper` when in editing mode
  - Deleted state overlay handled centrally in `BlockRenderer` instead of individual blocks
  - Dialog state controlled via `isDialogOpen`/`onDialogOpenChange` props from `BlockRenderer`
  - Removed redundant `EditableBlockWrapper`, `DeletedBlockOverlay`, and action button handling from all blocks
  - Simplified block components to just render display content + dialog (no wrapper logic)
  - Added `canDeleteBlock` handler to `BlockHandlers` for per-block delete control
  - Updated blocks: CarouselBlock, LocationBlock, HeroBlock, FaqItemBlock, ImageGalleryBlock, StatBlock, HoursBlock, PullQuoteBlock, RichTextBlock
  - Net reduction: 16 files changed, 461 insertions, 703 deletions (-242 lines)

## 0.29.3 - 2025-12-04

- **Block Component Architecture Standardization**: Complete separation of concerns across all CMS blocks
  - Extracted `HoursCard` and `FaqAccordionItem` presentational components to app-components
  - Migrated all blocks to `useValidation` hook for consistent error handling and toast notifications
  - Fixed LocationBlock stray backticks typo
  - Updated `cms-blocks-architecture.md` with required development standards for new blocks
- **UX: Delayed "Unsaved changes" indicator**: FormHeading now waits 30 seconds before showing the dirty indicator, reducing noise while actively editing and only reminding users who may have forgotten to save

## 0.29.2 - 2025-12-04

- **DRY Image Upload & Validation System**: Centralized hooks and reusable components for consistent image handling across all block dialogs
  - Created `useImageUpload` and `useMultiImageUpload` hooks with deferred upload pattern, auto-sync, and cleanup
  - Added `useValidation` hook for centralized error toast notifications and save button disable on validation failure
  - Built reusable `ImageCard` component with position controls (move up/down, add after, delete) and highlight animation
  - Highlight-pulse animation scrolls to and highlights newly added items for better UX

## 0.29.1 - 2025-12-03

- **Form Field Standardization**: Consistent UI across all block dialogs
  - Created ImageField component for standardized image uploads with deferred upload pattern
  - All blocks now use FormHeading with validation states (dirty, error, required)
  - Added character counts and isDirty tracking to all text fields
  - FormHeading htmlFor now optional for standalone labels (e.g., switches)

## 0.29.0 - 2025-12-03

- **Location Setup with Dynamic Cafe Page Configuration**: Complete cafe page management with automatic layout switching based on business structure
  - Location Setup in site settings allows switching between single and multiple location modes
  - Automatic cafe page reset when changing location type with user-friendly warning dialog
  - Single location mode: Photo gallery carousel, one location section, welcome message
  - Multiple location mode: Interactive location carousel with navigation, dedicated sections per location, welcome message
  - EditableBlockWrapper component provides consistent hover effects and edit controls across all blocks
  - ImageCarousel shared component for single-image display with dot navigation
  - LocationBlock improvements: Clickable address (opens Google Maps) and phone links
  - Fixed image upload API response field name (path → url) for carousel compatibility
  - Enhanced seed data with realistic content for both location types
  - Reseed API with automatic image cleanup when switching location types

## 0.28.1 - 2025-12-02

- **Animated Carousel Navigation Dots**: Enhanced carousel UX with smooth animations and improved visibility
  - Reusable CarouselDots component with Framer Motion animations
  - Active dot elongates smoothly with 0.3s easeInOut transition
  - Semi-transparent background with backdrop blur for visibility on any image
  - Fixed scroll navigation - clicking dots now properly scrolls carousel
  - Applied to both image carousels and location gallery dots
  - Positioned at bottom center with proper spacing

## 0.28.0 - 2025-12-02

- **Cafe Page with Location Carousel**: Complete cafe page implementation with single and multi-location support
  - Location carousel with auto-scrolling slides and click-to-scroll navigation
  - Location blocks with photo galleries, addresses, hours, and contact info
  - Support for both SINGLE (atmosphere images) and MULTI (location previews) modes
  - Simplified carousel dialog - removed type-switching for cleaner UX
  - Placeholder image integration with placehold.co for lean development
  - Next.js Image optimization with SVG support and security hardening

## 0.27.0 - 2025-11-29

- **Dynamic Page Navigation**: Configure pages to appear in site header and footer with custom icons and display order
  - Admin can enable/disable pages in navigation via checkboxes in PageEditor
  - Custom icon selection from Lucide library (e.g., Coffee, MapPin, Info)
  - Configurable display order for both header and footer (lower numbers appear first)
  - Database-driven navigation eliminates need for code changes to add/remove links
  - Mobile-optimized carousel for stats blocks in two-column layouts
  - Static page generation for improved performance and SEO
  - Pages appear as `/pages/{slug}` in navigation menus

## 0.26.12 - 2025-11-27

- **PageEditor Bug Fixes**: Fixed block availability filtering and improved empty state
  - Fixed `canAddBlock` function calls to pass correct count parameter
  - Enhanced empty state with better visual design and prominent "Add Your First Block" button
  - Improved block filtering logic to correctly show available block types
  - Added graceful handling of legacy HTML content in pages

## 0.26.11 - 2025-11-27

- **Page Editors with Live Editing**: Created dedicated admin editors for About, Cafe, and FAQ pages
  - Built `/admin/pages/about`, `/admin/pages/cafe`, `/admin/pages/faq` routes with PageEditor integration
  - Added API endpoint `/api/pages/[id]` (PATCH) for publish/unpublish functionality
  - Auto-creates page records on first access with type-specific defaults
  - Updated AdminSidebar with direct links to all 3 page editors
  - Each editor supports inline block editing, reordering, and publish toggle
  - Created database migration for PageType enum column

## 0.26.10 - 2025-11-27

- **Block Components & Editor**: Completed block-based page editor with rendering components
  - Built 8 block renderer components (HeroBlock, StatBlock, PullQuoteBlock, RichTextBlock, LocationBlock, HoursBlock, FaqItemBlock, ImageGalleryBlock)
  - Created PageEditor component with inline editing, drag-to-reorder, add/delete block UI
  - Added shadcn Collapsible component for FAQ accordion functionality
  - Each block has edit/display modes with save/cancel controls

## 0.26.9 - 2025-11-27

- **Block-Based Page System Foundation**: Created reusable block architecture for structured page editing
  - Implemented Zod schemas for 8 block types (hero, stat, pullQuote, richText, location, hours, faqItem, imageGallery)
  - Built page layout configurations defining allowed blocks per page type (About, Cafe, FAQ)
  - Created server actions for block CRUD with runtime validation
  - Eliminates need for generic rich text editor in favor of purpose-built blocks

## 0.26.8 - 2025-11-27

- **Admin/Customer Layout Separation**: Implemented Next.js route groups to completely separate admin and customer interfaces
  - Created `app/(site)/` route group for all customer-facing pages with dedicated layout (header/footer)
  - Admin routes use separate layout with sidebar navigation and admin header
  - Removed all admin references from customer site (header, footer, user menu)
  - Added dedicated `/admin/signin` page with admin-only authentication flow

## 0.26.7 - 2025-11-27

- **AI Wizard Edit Improvements**: Enhanced variation selection page with inline editing, regeneration animations, AI-generated content structure display (stats cards, pull quotes), and formatted HTML editing in TipTap with Typography styles

## 0.26.6 - 2025-11-26

- **AI About Page Wizard**: 10-question interview wizard at `/admin/pages/new/wizard` that generates 3 AI-powered About page variations using Gemini 2.0 (story-first, values-first, product-first styles)

## 0.26.5 - 2025-11-26

- **Admin Pages CRUD**: Full admin interface for Pages CMS at `/admin/pages` with TipTap rich text editor, create/edit/delete operations, and publishing workflow (Note: Not yet integrated into main admin dashboard - see BACKLOG for admin reorganization plan)

## 0.26.4 - 2025-11-26

- **App Features Demo**: Added `/app-features` showcase page with CMS overview, feature descriptions, and links to documentation

## 0.26.3 - 2025-11-26

- **Dynamic Page Route**: Added `/pages/[...slug]` route to render CMS pages from database with hero images, rich content, and child page navigation

## 0.26.2 - 2025-11-26

- **Pages CMS Foundation**: Added Page model and seed data for content management system (database-only, zero UI impact)

## 0.26.1 - 2025-11-26

- **Documentation**: Added comprehensive architecture documentation for Pages CMS and AI content generation
  - Pages CMS architecture decision document with implementation plan
  - AI-powered About page generator specification
  - Complete Q&A wizard question reference

## 0.26.0 - 2025-11-26

- **Configurable Marketing Content**: Section headings and marketing copy now managed through site settings
  - Full white-label capability for homepage marketing copy
  - No code changes needed to customize section headings
  - Scoped naming convention (homepage*, footer*, product\_) for future expansion
  - Maintains consistent architecture with existing branding system
  - See `docs/marketing-content-architecture-decision.md` for architecture rationale

## 0.25.1 - 2025-11-26

- **Dynamic Branding Completion**: Extended dynamic store name to all remaining hardcoded references
  - Order confirmation and notification emails now use dynamic store name
  - AI recommendation prompt references configured store name
  - Newsletter welcome email uses dynamic store name
  - Contact form email uses dynamic store name
  - All page metadata (account, search, admin) now dynamic
  - Setup page references dynamic store name
  - Order detail component uses dynamic store name
  - VAPI voice assistant config and prompts use dynamic store name
  - Admin order fulfillment emails (pickup/shipment) use dynamic store name

## 0.25.0 - 2025-11-25

- **Configurable Store Branding**: Complete system for managing store identity without code changes
  - Admin UI for store name, tagline, description, logo, and favicon with individual save buttons and file upload
  - Dynamic branding across header, footer, layout metadata, and authentication pages
  - Server-side `getSiteMetadata()` helper and client-side `useSiteSettings()` hook with caching
  - Footer displays tagline under logo; homepage uses description for SEO metadata
  - Public API endpoint (`/api/settings/public`) and protected admin endpoint (`/api/admin/settings/branding`)

## 0.24.3 - 2025-11-25

- **Hotfix**: Wrapped useSearchParams in Suspense boundary for newsletter unsubscribe page to fix build error

## 0.24.2 - 2025-11-25

- **Product Tag System**: Added altitude, variety fields and tag system with many-to-many relations

## 0.24.1 - 2025-11-25

- **Feature Toggle System**: Newsletter and social links features now configurable from admin settings
  - Newsletter feature toggle with heading and description customization
  - Social links feature toggle with heading and optional description
  - Footer conditionally renders features based on toggle state
  - Dynamic 2-column vs 3-column footer grid when third column hidden
  - FormHeading component for consistent field headers with amber dirty indicators
  - Auto-save for feature toggles, manual save for text fields
  - Footer Contact Information updated with FormHeading and improved controls layout
  - Active/Inactive labels and delete buttons relocated to right side inline with text
  - Auto-save for hours and email display toggles
  - Admin dashboard cards reordered (Your Role moved to first position)
  - Analytics Daily Activity Trend visualization improved with teal bars and minimum visible width
  - Social links cards padding removed for cleaner layout
  - Database backup and settings migration scripts for safe feature additions

## 0.24.0 - 2025-11-25

- **Newsletter System**: Complete newsletter subscription system with email notifications and admin management
  - Newsletter signup API endpoint with email validation and duplicate checking
  - Welcome email sent via Resend with personalized unsubscribe token
  - Unsubscribe functionality with secure token-based links (soft delete with isActive flag)
  - Admin dashboard view with subscriber list, search, stats (total/active/inactive), and CSV export
  - Admin email notifications for new signups (configurable toggle in settings)
  - NewsletterSignupNotification email template with subscriber details and total count
  - Database schema with unsubscribeToken (unique, auto-generated via cuid())
  - Manual migration to add database-level default for unsubscribeToken using gen_random_uuid()
  - Contact email configuration in admin settings (used as sender for all newsletter emails)
  - Comprehensive documentation in docs/newsletter-system.md
  - Reactivation support for previously unsubscribed users

## 0.23.1 - 2025-11-24

- **Cart Button Fix**: Fixed cart button in chat dialog opening cart drawer instead of 404 error
  - Added cart open state to global cart store
  - Shopping cart now opens programmatically from anywhere in app
  - Fixed ESLint warnings for type safety

## 0.23.0 - 2025-11-24

- **Chat Barista Animation Enhancements**: Smooth, polished animations for natural conversation flow
  - Messages slide in with smooth fade and scale effects
  - User messages appear from right, AI responses from left
  - Staggered timing creates natural back-and-forth rhythm
  - Product recommendations slide up with emphasis
  - Improved page load performance for product images

## 0.22.3 - 2025-11-24

- **Admin Footer Settings Refinements**: Enhanced footer contact management with per-field save states and file upload
  - Individual save buttons for each footer contact field (shop hours, email) with separate loading states and unsaved changes tracking
  - File upload system for custom social media icons with validation, preview, and storage to `public/images/`
  - Consistent Field component usage across Social Links and Footer Contact cards
  - Three-column layout with trash icon buttons to reset field pairs

## 0.22.2 - 2025-11-24

- **Admin Social Links Settings**: Complete social media management interface with database-driven footer
  - Admin CRUD for social links with system platforms (Facebook, Instagram, etc.) and custom platforms
  - Separate state tracking for system vs custom fields to prevent field linking
  - Individual save buttons per social link with unsaved changes tracking
  - Order management with move up/down buttons and automatic order preservation
  - Custom icon support with URL input and preview, toggle between Lucide icons and custom images
  - Active/Inactive toggle per link with dynamic labels
  - Per-record validation preventing duplicate platform names with unique constraint
  - InputGroup components for clean URL inputs with https:// prefix styling
  - Footer contact settings (shop hours, email) with Active/Inactive toggles
  - Dynamic Lucide icon rendering with case-insensitive matching and fill="currentColor"
  - Unique constraint on SocialLink.platform field with data cleanup script
  - Clean component structure with proper ButtonGroup and InputGroup nesting

## 0.22.1 - 2025-11-23

- **Footer Presentation Refinements**: Improved layout and visual consistency of mega footer
  - Enhanced newsletter signup form with connected input and button styling
  - Improved responsive grid layout for better spacing and alignment
  - Added session-aware account links with admin dashboard access for authenticated admin users
  - Refined separator presentation and container styling for better visual hierarchy

## 0.22.0 - 2025-11-23

- **Mega Footer with Social Links & Newsletter**: Admin-managed footer with social media links, newsletter signup, and dynamic category navigation
  - Social media link management in admin panel with platform selection, ordering, and active/inactive toggle
  - Newsletter subscription with email validation and duplicate handling
  - Responsive mega footer with category groups, quick links, newsletter signup, and social icons
  - Server-rendered footer component for optimal performance

## 0.21.0 - 2025-11-23

- **Dynamic Category System & Navigation Improvements**: Complete category infrastructure overhaul with breadcrumb context preservation
  - **Schema Migration**: Migrated Category model from hardcoded `label` field to relational `labelSetting` with SiteSettings table
  - **Category Labels**: Three label types (Origins, Collections, Roasts) configurable via SiteSettings with default label support
  - **Navigation Routes**: Unified routing pattern from `/categories/[slug]` to `/[category]/[slug]` for cleaner URLs
  - **Breadcrumb Context**: Added query parameter system (`?from={categorySlug}`) to preserve user navigation path
  - **Product Cards**: Enhanced to pass navigation context when user browses from non-primary category
  - **Related Products**: Changed algorithm from roast-level matching to category-based matching for better contextual recommendations
  - **Per-Category Purchase Options**: Added `showPurchaseOptions` boolean field to control price/buy button display per category
  - **Data Flow**: Complete props threading from Category model → page → CategoryClientPage → ProductCard
  - **Seed Data**: Generated 30 products with proper categorization, 75 synthetic users, and demo user
  - **Migration**: Two migrations applied (`add_site_settings_and_category_label_reference`, `add_show_purchase_options_to_category`)

## 0.20.3 - 2025-11-22

- **Product URL Generation Fix**: Resolved incorrect product URLs using primary category lookup
  - **ProductCard Simplification**: Removed unnecessary categorySlug prop and fallback logic
  - **Direct Database Access**: ProductCard now always uses primary category from database
  - **Zod Validation**: Added `ProductCardSchema` and `RecommendationsResponseSchema` for type safety
  - **Runtime Validation**: Added Zod validation to recommendations API response to catch data shape mismatches
  - **Data Optimization**: Reduced data fetching to only select fields required by ProductCard component
  - **Props Cleanup**: Removed unused categorySlug from CategoryClientPage and all parent components

- **Social Links Management**: Added admin interface for managing social media links in footer
  - **Admin CRUD**: Full create, read, update, delete functionality for social links
  - **Footer Integration**: Dynamic social links rendering with active/inactive toggle
  - **Database Schema**: Added `SocialLink` model with platform, url, icon, order fields

- **Image Configuration**: Added github.com to Next.js image remotePatterns for profile images

## 0.20.2 - 2025-11-22

- **Prisma 7 & Neon Adapter Stabilization**: Fixed build and connection issues with Prisma 7 upgrade
  - **WebSocket Configuration**: Implemented explicit `ws` configuration for `@neondatabase/serverless` to ensure compatibility with Node.js build environments
  - **Adapter Initialization**: Updated `PrismaNeon` instantiation to match Prisma 7 factory pattern
  - **Documentation**: Added detailed technical guide in `docs/prisma-7-neon-upgrade.md` showcasing the solution
  - **Dependency Cleanup**: Removed unused `pg` and `@prisma/adapter-pg` dependencies to enforce serverless driver usage

## 0.20.1 - 2025-11-22

- **VAPI Production Configuration**: Fixed webhook URL configuration to support production environments ([8d90e02](https://github.com/yuens1002/ecomm-ai-app/commit/8d90e02))
  - Added environment awareness to `vapi-config.ts`
  - Automatically uses `NEXT_PUBLIC_APP_URL` in production
  - Falls back to localtunnel URL for local development
  - Ensures voice assistant functions correctly on Vercel deployments

## 0.20.0 - 2025-11-22

- **VAPI Voice Assistant Integration**: Full voice-to-voice AI barista experience ([df8ab1c](https://github.com/yuens1002/ecomm-ai-app/commit/df8ab1c))
  - **Voice Interface**: Integrated VAPI web SDK for real-time voice conversations
  - **Bilingual Support**: System prompt configured for English and Spanish support
  - **Function Calling**: AI can query product catalog, get recommendations, and check order status via tools
  - **Visual Feedback**: Real-time volume visualizer and status indicators (connecting, listening, speaking)
  - **Documentation**: Added comprehensive setup guide in `docs/VAPI_LOCAL_SETUP.md`

- **Database Schema Hardening**:
  - **Roast Level Enum**: Migrated `roastLevel` from free-text string to strict `RoastLevel` enum (LIGHT, MEDIUM, DARK)
  - **Data Integrity**: Updated all product queries and mutations to enforce type safety
  - **Seed Script Fixes**: Resolved legacy data issues and updated seed data to match new schema

## 0.19.1 - 2025-11-22

- **Site Header & 404 Fixes**: Improved theme consistency and error page experience
  - **Custom 404 Page**: Added branded 404 page with proper layout and theme support
  - **Header Styling**: Fixed navigation link colors to adapt correctly in light/dark modes
  - **Dark Mode Polish**: Inverted beans icon color in dark mode for better visibility

## 0.19.0 - 2025-11-22

- **Catalog Management System**: Complete admin interface for managing products, categories, and variants ([4ea1f87](https://github.com/yuens1002/ecomm-ai-app/commit/4ea1f87))
  - **Product Management**: Create, edit, and delete products with rich details (images, description, organic/featured status)
  - **Category Management**: Create and manage product categories with hierarchy support
  - **Variant System**: robust variant management with pricing, SKU, and inventory tracking
  - **Product Form Refactoring**: Modernized product editor with 2-column grid layout, custom `Field` components, and improved validation
  - **Bulk Operations**: Support for managing multiple variants and options efficiently

- **Admin Dashboard Enhancements**:
  - **Analytics View**: Enhanced analytics dashboard with visual charts and deeper insights
  - **Order Management**: Improved order list and detail views for better fulfillment workflow
  - **Navigation**: New navigation menu component for better admin area traversal

- **Developer Experience**:
  - **Seed Data Generation**: Added Python scripts (`generate_seed_data.py`) for generating realistic test data
  - **Type Safety**: Improved TypeScript coverage across admin components

## 0.18.0 - 2025-11-21

- **Environment Awareness**: Visual indicator for non-production environments ([efecdb2](https://github.com/yuens1002/ecomm-ai-app/commit/efecdb22570ff2c2511f9cb8bfd62c88aa6fcb58))
  - Added floating badge showing current environment (Development/Preview)
  - Integrated into RootLayout for global visibility
  - Helps developers distinguish between production and test environments

## 0.17.0 - 2025-11-21

- **About Page & Header Refinement**: Added comprehensive About page and refined site navigation
  - Created `/about` page with "Core Features", "AI-Powered Personalization", and "Admin Dashboard" sections
  - Refined Site Header layout for better responsiveness (stacked logo on mobile, grouped nav links)
  - Updated mobile menu with improved hierarchy and iconography
  - Added "About" link to main navigation and mobile menu
  - Replaced Info icon with FileText icon for About link

## 0.16.0 - 2025-11-20

- **Contact Page & Form**: Added a dedicated contact page with email notifications ([e70088a](https://github.com/yuens1002/ecomm-ai-app/commit/e70088a))
  - Created `/contact` page with a responsive form using shadcn/ui components
  - Implemented API route `/api/contact` to handle form submissions
  - Integrated Resend for email delivery with a custom React Email template
  - Added "Contact" link to the site header and mobile menu
  - Includes form validation with Zod and error handling

## 0.15.3 - 2025-11-20

- **Prisma 7 Upgrade & Security Fixes**: Major ORM upgrade and vulnerability resolution ([e168038](https://github.com/yuens1002/ecomm-ai-app/commit/e168038c0b0fb3375f818ecf6fb7d284585a9d0b))
  - Upgraded to Prisma 7.0.0 and Node.js 22.12.0 for improved performance and stability
  - Migrated configuration to `prisma.config.ts` and removed deprecated `package.json` config
  - Resolved critical security vulnerability in `hono` dependency via package override
  - Fixed all resulting TypeScript errors and build warnings

## 0.15.2 - 2025-11-20

- **Error Handling & Type Safety Hotfix**: Centralized error handling and resolved all TypeScript build errors ([e41dd15](https://github.com/yuens1002/ecomm-ai-app/commit/e41dd15))
  - Created `lib/error-utils.ts` with `getErrorMessage()` helper for type-safe error handling
  - Migrated 25+ error handlers across API routes, account tabs, and admin components
  - Fixed Stripe type incompatibilities using optional chaining and proper type extensions
  - Fixed Invoice webhook properties (subscription, charge, payment_intent) with safe access patterns
  - Fixed OrderStatus enum usage in user orders route
  - Fixed null handling in OrderDetailClient for tracking URLs
  - Fixed SearchProduct and RecommendedProduct type definitions with complete property sets
  - Fixed lib/data.ts purchase history type assertions
  - Production build now compiles successfully with 0 TypeScript errors

## 0.15.1 - 2025-11-20

- **ESLint Cleanup Complete**: Fixed all TypeScript errors and improved demo account UX ([7980f27](https://github.com/yuens1002/ecomm-ai-app/commit/7980f27153e8c6b4981f926f29e1303425a90ce7))
  - Fixed all 163 ESLint problems (100% reduction) - app/, lib/, hooks/, tests now fully typed
  - Moved 14 dev-only scripts to dev-tools/ folder (gitignored)
  - Added graceful demo account handling for subscription management and account deletion
  - Stripe customer verification before portal access with helpful 404 error messages

## 0.15.0 - 2025-11-20

- Fixed all 163 ESLint problems (100% reduction) - app/, lib/, hooks/, tests now fully typed
- Moved 14 dev-only scripts to dev-tools/ folder (gitignored)
- Added graceful demo account handling for subscription management and account deletion
- Stripe customer verification before portal access with helpful 404 error messages

- **Chat Barista Phase 5 Complete**: Text-based chat MVP with full order history, brewing rules, and automatic caching ([12d1d3d](https://github.com/yuens1002/ecomm-ai-app/commit/12d1d3d65d30bdec21e3f66a8459c3275801edbb))
  - Full order history context (removed 5-order limit) for complete personalization
  - Enhanced brewing method rules with prominent warnings (drip ≠ espresso)
  - Gemini automatic caching achieving 98% token reduction on turns 2+ (11,232/11,420 tokens cached)
  - Thinking budget control (200 tokens) to prevent MAX_TOKENS errors
  - Name usage limited to first message only (no spam on subsequent turns)
  - Comprehensive error handling with specific messages for rate limits and service issues
  - Component renamed from VoiceBarista to ChatBarista (reflects text-based nature)
  - Cleaned up debug logging for production readiness

- **AI Barista Chat MVP**: Text-based conversational interface with comprehensive error handling and brewing knowledge ([6560e73](https://github.com/yuens1002/ecomm-ai-app/commit/6560e730f3fe67fe86c5e11512388d90048ccefa))
  - Modal-based chat UI with fixed height, scrollable messages, and always-visible input
  - Gemini AI integration with user context (order history, favorites, addresses)
  - Retry mechanism for service errors with spinning state and right-aligned button
  - Comprehensive brewing method guide in system prompt (drip vs espresso distinction)
  - Bilingual support with auto-detection (English/Spanish)
  - Error handling for rate limits, service unavailable, and empty responses

- **Voice Barista UI Foundation**: Session-based hero section with voice chat interface for authenticated users ([2519901](https://github.com/yuens1002/ecomm-ai-app/commit/2519901328b456f853c1df27bdca19d036468bd6))
  - VoiceBarista component replaces hero for authenticated users with "Start Voice Chat" and "Get AI Recommendation" options
  - Voice AI platform research complete - selected VAPI for multilingual support and function calling
  - Conversation flow designed with 6 backend functions and bilingual templates (English/Spanish)

## 0.14.0 - 2025-11-20

- **AI Recommendation Buy Now**: Complete checkout flow integration with AI recommendations
  - **Buy Now Functionality**: Direct checkout from AI modal creates Stripe Checkout session and redirects to hosted payment page
  - **Add to Cart Integration**: Adds recommended product to cart and closes modal for continued shopping
  - **Smart Variant Selection**: Automatically selects cheapest variant with one-time purchase option (never subscriptions)
  - **Product Linking**: Product name displays as clickable button link to product detail page
  - **Smart Product Matching**: API fetches full product data (variants, images, purchase options) based on AI recommendation
  - **Featured Product Fallback**: If AI doesn't match specific product, automatically suggests first featured product
  - **Improved Button Layout**: When product found - "Add to Cart" (outline), "Buy Now" (primary); When no product - "Start Over" only
  - **Loading States**: Buy Now button shows spinner during Stripe session creation
  - **Image URL Fix**: Converts relative image URLs to absolute URLs for Stripe API validation
  - **Error Handling**: Concise red error message ("Something went wrong. Please try again.") displays above buttons without losing recommendation
  - **Error Recovery**: Users can retry Buy Now without restarting the recommendation flow

## 0.13.2 - 2025-11-20

- **AI Recommendation Modal Improvements**: Enhanced user experience and functionality
  - **Product Linking**: "View Product" button now appears when AI recommends a specific coffee, linking directly to the product page
  - **Better Flow**: "Start Over" button resets to step 1 instead of closing modal, allowing users to get multiple recommendations
  - **Conditional Badge**: Personalization badge only shows when user has actual purchase history (>0 orders)
  - **Visual Polish**: Improved badge styling with CheckCircle2 icon from lucide-react, subtle green background (green-500/10) with better visibility in both light/dark modes
  - **Cleaner Layout**: Removed unnecessary whitespace between title and content in result step
  - **Increased Token Limit**: Raised Gemini maxOutputTokens from 1000 to 2000 to prevent response cutoff
  - **Graceful Error Handling**: Added friendly fallback message when MAX_TOKENS is reached instead of showing error
  - **API Enhancement**: Recommendation endpoint now returns product slug for direct linking

## 0.13.1 - 2025-11-20

- **AI-Generated Product Images**: All 30 coffee products now have custom branded images
  - Generated using Grok AI (xAI) with consistent "Artisan Roast" branding
  - Minimalist white packaging with product name in colored label
  - Images saved as 1024x1024 WebP format for optimal web performance
  - Cost: ~$2.10 for all 30 images
- **Product Card Redesign**: Updated ProductCard component for better image display
  - Square aspect ratio (aspect-square) with 200px max height
  - Bordered layout with rounded corners on bottom
  - Text overflow handling with ellipsis for long product names
  - Improved spacing and visual hierarchy
- **Image Generation Infrastructure**: Added dependencies and scripts
  - Dependencies: `sharp` (image processing), `form-data`, `node-fetch@2`
  - Scripts for Grok API integration and batch image generation
  - Updated `.env.example` with GROK_API_KEY documentation

## 0.13.0 - 2025-11-19

- **Real-Time Activity Tracking**: Session-based tracking for PRODUCT_VIEW, ADD_TO_CART, REMOVE_FROM_CART
  - Client-side `useActivityTracking` hook with automatic session ID generation
  - Silent failure design to not disrupt user experience
  - Integrated into ProductClientPage and ShoppingCart components
  - POST `/api/track-activity` endpoint with validation
  - Visible in admin analytics dashboard immediately
- **Unit Tests**: Jest and React Testing Library setup
  - 7 passing tests for `useActivityTracking` hook
  - Tests cover authenticated/anonymous users, error handling, session persistence
  - Excluded API route tests (Next.js edge runtime complexity) and data tests (require live database)
  - Scripts: `npm test` (watch mode), `npm run test:ci` (CI mode)

## 0.12.0 - 2025-11-18

- **AI-Powered Product Recommendations**: Behavioral recommendation system with personalized shopping experience
  - **Product Catalog Expansion**: 30 specialty coffees (from 11) with detailed tasting notes, origins, and roast levels
  - **User Activity Tracking**: New UserActivity model tracking PAGE_VIEW, PRODUCT_VIEW, SEARCH, ADD_TO_CART, REMOVE_FROM_CART events
    - Session-based tracking supports both anonymous and authenticated users
    - Indexed for query performance
  - **Behavioral Analytics Functions**: Added 5 data functions in `lib/data.ts`
    - Purchase history, recent views, search history aggregation
    - User preference analysis (roast level, tasting notes)
    - Trending products for anonymous users
  - **Personalized AI Assistant**: Enhanced Gemini modal with user context injection
    - Includes purchase history, views, searches, and preferences in prompt
    - Displays personalization badge with user stats
    - Graceful fallback for anonymous users
  - **Homepage Recommendations**: "Recommended For You" section with behavioral scoring
    - Algorithm: +10 roast match, +5 per tasting note, +3 viewed, -20 recent purchase
    - Shows personalized subtitle with preferences
    - Falls back to trending products for anonymous users
  - **Product Search**: Full-text search across name, description, origin, and tasting notes
    - Search dialog in header (desktop) and mobile menu
    - Automatic search activity tracking
    - Real-time results with loading states
  - **Admin Analytics Dashboard**: New `/admin/analytics` page
    - Trending products and top search queries
    - Conversion metrics (view→cart→order rates)
    - Activity breakdown and daily trend visualization
    - Period selection (7/30 days)
- **Database Migration**: `20251119034105_add_user_activity_tracking`
- **API Endpoints**:
  - `/api/recommendations` - Behavioral scoring algorithm
  - `/api/admin/analytics` - Admin analytics data
  - `/api/search` - Product search with tracking
- **Seed Scripts**: Synthetic user data generation for testing and demo purposes

## 0.11.9 - 2025-11-18

- **Admin Owner Assignment**: Complete admin management and bootstrap system
  - **Initial Setup Flow**: First-time admin account creation for new deployments
    - `/setup` page with full name, email, and password form
    - Password validation with real-time UI feedback (min 8 chars, uppercase, lowercase, number, special char)
    - Confirm password field with match validation
    - Auto-verifies email for initial admin account
    - Only accessible when no admin exists in the system (checked via HEAD /api/admin/setup)
    - Shows "Setup Already Complete" message if admin exists
    - Redirects to sign-in after successful creation
  - **Admin Dashboard**: Tabbed interface at `/admin` with overview and quick actions
    - **Overview Tab**: Dashboard stats (total users, orders, products, admin count)
    - **Users Tab**: Link to user management page
    - **Orders Tab**: Link to orders page
    - **Products Tab**: Placeholder for future product management
    - **Profile Tab**: Admin account information display
    - Quick action cards for common tasks
  - **User Management UI**: `/admin/users` page for managing user privileges
    - Lists all users with admin status, order counts, and subscription counts
    - Toggle admin privileges with safety checks (cannot revoke last admin)
    - Real-time status updates using optimistic UI patterns
    - Table and Badge components added from shadcn/ui
  - **API Endpoints**:
    - `HEAD /api/admin/setup` - checks if admin exists (200 = no admin, 403 = admin exists)
    - `POST /api/admin/setup` - creates first admin account with validation
    - `GET /api/admin/users` - fetches all users with order/subscription counts
    - `POST /api/admin/users/[id]/toggle-admin` - grants or revokes admin privileges with last-admin protection
  - **Admin Layout**: Shared layout with setup redirect and admin authorization
  - **Helper Functions**: Added `hasAnyAdmin()` to `lib/admin.ts` for initial setup detection
  - **Security Features**:
    - Strong password requirements with real-time validation
    - Prevents revoking last admin (maintains at least one admin)
    - Admin-only access to all admin endpoints
    - Auto-email verification for bootstrap account
  - **UI Components**: Added `components/ui/table.tsx` and `components/ui/badge.tsx` for data display
- **Testing Notes**: Complete flow tested locally (initial setup → admin dashboard → user management → privilege toggling)

## 0.11.7 - 2025-11-18

- **Split Orders for Mixed Carts**: Implemented order splitting for mixed carts with architectural pivot based on Stripe's subscription model
  - **Order Structure**: Mixed carts now create separate orders:
    - One order for all one-time items
    - ONE order for ALL subscription items (architectural decision based on Stripe creating one subscription with multiple line items)
    - **Tradeoff**: Recurring orders must lookup PurchaseOption by name using fuzzy match - risk if product name changes significantly
    - Documented directly in Prisma schema for future maintainability
  - **Webhook Refactoring**: Complete overhaul of both subscription webhooks to handle multiple products:
    - `checkout.session.completed`: Loops through `subscription.items.data` to extract all products into arrays, creates single order with all subscription items
    - `invoice.payment_succeeded`: Handles both initial subscription and renewals with array support, loops through productNames to find PurchaseOptions for recurring orders
  - **Duplicate Subscription Prevention**: Updated checkout validation to check all products across productNames arrays (uses `flatMap` and `includes()` to detect duplicates)
  - **Order Cancellation**: Added admin endpoint `/api/admin/orders/[orderId]/cancel` for manually canceling orders
  - **UI Enhancements**:
    - Subscription tab now displays subscription ID without "sub\_" prefix for cleaner look
    - Lists all products in subscription with quantities (e.g., "Death Valley Espresso - 2lb Bag × 2")
    - Removed product description field for cleaner UI
    - Kept billing period display for subscription transparency
  - **Helper Scripts**: Created `scripts/cancel-active-subscriptions.ts` for bulk subscription cancellation during testing
- **Database Migrations**:
  - `20251118024917_add_subscription_id_to_order` - Added `stripeSubscriptionId` to Order model for linking orders to subscriptions
  - `20251118054840_change_subscription_to_arrays` - Changed Subscription from single values to arrays (productName → productNames[], etc.)
- **Testing Results**:
  - ✅ Mixed cart with 2 different subscription products (Death Valley 2lb + Guatemalan 12oz weekly)
  - ✅ Single subscription record created with both products in arrays
  - ✅ Single order created containing all subscription items
  - ✅ UI correctly displays all products with quantities
  - ✅ Checkout validation prevents duplicate subscriptions across all products
  - ✅ Both webhooks handle arrays correctly
  - ✅ TypeScript compilation passing (fixed 13 errors across 4 files)
- **Architecture Notes**: This feature represents a significant pivot from the initial design (separate order per subscription item) after discovering Stripe creates one subscription with multiple line items, not separate subscriptions per product. The array-based approach provides flexibility for multi-product subscriptions while maintaining data integrity and simplifying fulfillment workflows.

## 0.11.6 - 2025-11-17

- **Recurring Order Creation**: Automatic order creation for subscription renewals
  - Enhanced `invoice.payment_succeeded` webhook to differentiate between initial subscription payments and renewals using `billing_reason` field
  - Initial subscriptions (`billing_reason: "subscription_create"`): Update Subscription record in database
  - Renewal payments (`billing_reason: "subscription_cycle"`): Create new Order record with PENDING status
  - Subscription ID extraction with fallback: checks `invoice.subscription` and `invoice.parent.subscription_details.subscription`
  - Automatic inventory decrementation when recurring orders are created
  - Fuzzy product matching: maps Stripe product names to PurchaseOptions by splitting on " - " separator
- **Subscription-Aware Email Notifications**: Enhanced all email templates with subscription context
  - **OrderConfirmationEmail**: Shows "Your Subscription Order is Being Prepared! 📦" heading with green banner displaying subscription cadence (e.g., "☕ Every week delivery")
  - **MerchantOrderNotification**: Shows "🔄 Subscription Renewal Order" heading with blue banner (e.g., "Every week • Auto-renewal")
  - **ShipmentConfirmationEmail**: Shows "📦 Your Subscription Order Has Shipped!" with subscription cadence in preview and body text
  - All templates accept `isRecurringOrder?: boolean` and `deliverySchedule?: string` props for conditional rendering
- **Smart Email Strategy**: Optimized notification flow to reduce email fatigue
  - Recurring order creation: Only merchant receives notification, customer email skipped
  - Order shipment: Customer receives single email combining order confirmation + tracking + subscription context
  - Reduces customer emails from 2 to 1 per subscription renewal cycle
  - Logs clearly indicate: "⏭️ Skipping customer email - will send with tracking when order ships"
- **Comprehensive Testing Documentation**: Created `docs/testing-recurring-orders.md` (~300 lines)
  - Multiple testing methods: Stripe CLI webhook triggers, test clocks, event replay
  - Verification steps: webhook logs, database queries, admin dashboard checks, email delivery, inventory tracking
  - Test scenarios: weekly/monthly subscriptions, multiple items, delivery/pickup, stock depletion edge cases
  - Troubleshooting guide: missing purchase options, inventory errors, email failures
  - Stripe CLI command reference for local development
  - Production testing checklist

## 0.11.5 - 2025-11-17

- **Webhook Event Refactor**: Hybrid approach for subscription creation using both `checkout.session.completed` and `invoice.payment_succeeded`
  - **Immediate payment methods (cards)**: Subscription created in `checkout.session.completed` when `payment_status === "paid"` and `subscription.status` is `"active"` or `"trialing"` - provides instant UX feedback
  - **Async payment methods (ACH, SEPA, etc.)**: Subscription created in `invoice.payment_succeeded` when payment confirms later - ensures data integrity
  - Renewal payments: Handled by `invoice.payment_succeeded` for all billing cycles
  - Status changes: Handled by `customer.subscription.updated` event
  - Prevents orphaned subscription records from failed or incomplete payments
  - **Bug Fix**: Exclude CANCELED subscriptions from duplicate check to allow re-subscription to previously canceled products
  - **Bug Fix**: Extract billing period from `subscription.items` instead of top-level subscription object
  - **Bug Fix**: Check both `cancel_at_period_end` and `cancel_at` fields for scheduled cancellations (Stripe uses `cancel_at` for portal cancellations)
  - Safety checks: Verify `payment_status === "paid"` and valid subscription status before creating records
  - **Known Limitation**: Mixed orders (one-time + subscription items) create single order; canceling order doesn't cancel subscription. See backlog for planned split-order implementation.
- **Subscription Schema Refactor**: Removed `variantName` field from Subscription model since `productName` already contains the full product+variant combination (e.g., "Death Valley Espresso - 12oz Bag")
  - Simplified webhook handler to only use `productName` from Stripe
  - Updated all UI components (AccountPageClient, SubscriptionsTab) to display `productName` only
  - Database migration: `20251117061523_remove_variant_name_from_subscription`
- **Mixed Billing Interval Validation**: Added comprehensive validation to prevent checkout with subscriptions of different billing intervals (Stripe limitation)
  - Client-side validation in cart store with custom event error handling
  - Server-side validation in checkout API with specific error code (`MIXED_BILLING_INTERVALS`)
  - Toast notifications for all validation errors
- **Duplicate Subscription Prevention**: Fixed duplicate subscription check to be per-variant instead of per-product
  - Changed uniqueness logic from `productName` to `productName::variantName` combination
  - Updated checkout route to check by `stripeProductId` or exact productName match
  - Users can now have multiple subscriptions for different variants of the same product
- **Subscription Purchase Option Schema Cleanup**: Removed deprecated `deliverySchedule` string field from PurchaseOption model
  - All subscription scheduling now uses structured `billingInterval` (enum) and `billingIntervalCount` (number)
  - Database migration: `20251117031833_remove_delivery_schedule_from_purchase_option`
  - Updated seed data to use structured interval fields consistently
- **Cart Store Refactor**: Replaced deprecated `deliverySchedule` with `billingInterval` and `billingIntervalCount` fields
  - Added `formatBillingInterval()` utility for consistent schedule display across app
  - Cart items now show subscription cadence labels (e.g., "Subscription - Every week")
- **Enhanced Subscription UX**:
  - Hide "Subscribe & Save" option when variant already has subscription in cart
  - Auto-switch to one-time purchase after adding subscription to cart
  - Dynamic delivery schedule dropdown generated from available subscription options
  - Checkout requires authentication for subscription purchases with helpful redirect notice
  - Improved duplicate subscription error messages with proper singular/plural grammar and bullet-point lists
- **Order Confirmation Emails**: Enhanced to distinguish between one-time and subscription items
  - Display purchase type inline with product name (e.g., "• One-time" or "• Subscription - Every week")
  - Shows delivery schedule for subscription items using `formatBillingInterval()` utility
  - Applied to both customer and merchant order notification emails
- **Toast Notification System**: Replaced browser alerts with styled toast notifications
  - Custom inverted theme colors (`bg-foreground`, `text-background`)
  - Positioned in upper right corner
  - Visible close button with proper contrast
  - User-friendly error messages for cart/checkout issues

## 0.11.4 - 2025-11-16

- **Subscription Management System**: Complete subscription lifecycle management with Stripe integration
  - Added `Subscription` model to Prisma schema with fields: `stripeSubscriptionId`, `stripeCustomerId`, `status`, product details, billing cycle, shipping address
  - Added `SubscriptionStatus` enum: ACTIVE, PAUSED, CANCELED, PAST_DUE
  - Webhook handlers for subscription lifecycle:
    - `customer.subscription.created`: Create subscription record when customer subscribes
    - `customer.subscription.updated`: Sync subscription status, billing period, and details
    - `customer.subscription.deleted`: Mark subscription as canceled in database
  - Subscription webhooks automatically find user from Stripe customer ID and upsert subscription data
  - Parse subscription item details including product name, variant, quantity, price, and delivery schedule
  - Store shipping address from subscription metadata for fulfillment
- **Stripe Customer Portal Integration**:
  - Created `/api/customer-portal` endpoint to generate Stripe Billing Portal sessions
  - Portal allows customers to: update payment method, view invoices, manage subscriptions, cancel subscriptions
  - Protected with authentication - only logged-in users can access portal
  - Automatic redirect back to account page after portal session
- **Subscriptions Tab in Account Settings**:
  - New "Subscriptions" tab in `/account` page showing all customer subscriptions
  - Display subscription status with color-coded badges: Active (green), Paused (yellow), Canceled (gray), Past Due (red)
  - Show product details: name, variant, quantity, price per billing cycle
  - Display delivery schedule (e.g., "Every 2 weeks", "Monthly")
  - Current billing period dates with calendar icon
  - Shipping address display for delivery subscriptions
  - "Manage Subscription" button opens Stripe Customer Portal in new window
  - Cancel notice for subscriptions scheduled to end at period end
  - Empty state with call-to-action to browse products
  - Loading states with spinner during portal session creation
- **Database Migration**:
  - Created migration `20251116061845_add_subscription_model` with Subscription table and SubscriptionStatus enum
  - Added `subscriptions` relation to User model
  - Indexed fields: `userId`, `stripeSubscriptionId`, `stripeCustomerId` for efficient queries
- **UI/UX Enhancements**:
  - Updated account page tab grid from 5 to 6 columns to accommodate Subscriptions tab
  - Toast notifications for subscription portal errors
  - Responsive subscription cards with proper spacing
  - Format dates with `date-fns` (e.g., "Nov 16, 2025")
  - Format prices with proper currency symbol and cents
  - Package icon for empty subscriptions state
  - External link icon on "Manage Subscription" button
- **Dependencies**:
  - Leveraged existing `resend` and `@react-email/components` packages (added in 0.11.3 hotfix)
  - Stripe API version `2024-12-18.acacia` for subscription management

## 0.11.3 - 2025-11-16

- **Admin Order Fulfillment Interface**: Complete admin dashboard for order management
  - Added `isAdmin` boolean field to User model with database migration
  - Created admin authentication helpers (`lib/admin.ts`) with `isAdmin()` and `requireAdmin()` functions
  - Built `/admin/orders` page with comprehensive table layout showing order #, date, customer, items, shipping address, total, status, and actions
  - Order filtering: All, Pending, Completed (shipped or picked up), Canceled (US spelling)
  - Mark as shipped workflow: dialog with carrier selection (USPS, UPS, FedEx, DHL) and tracking number input
  - Mark as pickup ready workflow: confirmation dialog for store pickup orders
  - Track button for shipped orders: generates carrier-specific tracking URLs
  - Copy-to-clipboard feature for tracking numbers to save horizontal space
  - Real-time toast notifications for success/error feedback using @radix-ui/react-toast
  - Admin navigation: "Admin: Manage Orders" link in user menu (visible only to admin users)
- **Email Notifications**:
  - Shipment confirmation email: sent automatically when order marked as shipped, includes tracking info, carrier, estimated delivery, and tracking URL
  - Pickup ready email: sent automatically when order ready for pickup, includes store address, hours, and ID reminder
  - Updated order confirmation email to use `orderId` instead of `orderNumber` for correct URL generation
  - Updated merchant notification email to link to admin orders dashboard instead of non-existent order detail page
  - Fixed email template styling: added `box-sizing: border-box` to prevent content overflow in email clients
- **API Routes**:
  - `GET /api/admin/orders` - Fetch all orders with filtering by status
  - `PATCH /api/admin/orders/[orderId]/ship` - Mark order as shipped with tracking info
  - `PATCH /api/admin/orders/[orderId]/pickup` - Mark order as picked up / ready for pickup
  - All routes protected with `requireAdmin()` middleware
- **Database Updates**:
  - Added proper null checks for `customerEmail` field in order API routes
  - Fixed TypeScript errors with proper type narrowing for nullable fields
  - Ensured all tracking and fulfillment fields properly handled
- **UI/UX Improvements**:
  - Status badges with color coding: Pending (yellow), Shipped (green), Picked Up (purple), Canceled (red)
  - Applied US spelling "Canceled" consistently across customer and admin interfaces
  - Shipping address display in admin table: full address for delivery orders, "Store Pickup" label for pickup orders
  - Responsive table design with proper spacing and hover states
  - Toast notifications positioned at bottom-right on desktop, top on mobile
- **Bug Fixes**:
  - Fixed order number handling: use `order.id.slice(-8)` since `orderNumber` field doesn't exist in schema
  - Added `await` for `render()` calls in email generation (returns Promise)
  - Fixed tracking URL TypeScript errors by storing result in variable for proper type narrowing
  - Resolved naming conflict between `trackingNumber` prop and style object in ShipmentConfirmationEmail
  - Fixed email link 404 errors by using `orderId` parameter instead of `orderNumber`
- Dependencies: Added `@radix-ui/react-toast` for toast notifications
- Scripts: Added `scripts/set-admin.ts` and `scripts/make-admin.ts` for admin user management
- Note: Temporary `/api/make-me-admin` route exists for development (should be removed before production)

## 0.11.2 - 2025-11-15

- **Email Notifications & Order Management (Phase 6 - Partial)**:
  - Integrated Resend for transactional email delivery (free tier: 3,000 emails/month)
  - Created React Email templates: OrderConfirmationEmail (customer) and MerchantOrderNotification (admin)
  - Automatic order confirmation emails sent to customers with order details, items, shipping info
  - Merchant notification emails sent to admin for new orders requiring fulfillment
  - Added tracking fields to Order model: `trackingNumber`, `carrier`, `shippedAt`
  - Inventory management: automatically decrement stock quantity when orders are placed
  - Environment configuration for email service with development-friendly defaults (<onboarding@resend.dev>)

## 0.11.1 - 2025-11-15

- **Guest Order Fulfillment Fix**: Complete restructure of order shipping data storage
  - Added shipping fields directly to Order model: `recipientName`, `shippingStreet`, `shippingCity`, `shippingState`, `shippingPostalCode`, `shippingCountry`
  - Removed `shippingAddressId` relation - shipping data now stored denormalized on Order table
  - Fixed critical issue: guest orders now properly save shipping addresses for fulfillment
  - Webhook updated to populate shipping fields for ALL orders (guests and logged-in users)
  - Order detail pages updated to display shipping from Order model fields
  - Benefits: enables merchant fulfillment queries, marketing campaigns (e.g., 15-30 day discount emails), complete order data without Stripe dashboard dependency
  - Logged-in users still get addresses saved to Address table for future reuse
- **Code Cleanup**:
  - Removed unused `OrdersTab.tsx` component (order management now uses dedicated `/orders` pages)
  - Simplified order queries by removing unnecessary relation includes

## 0.11.0 - 2025-11-15

- **Account Settings & Order Management (Phase 5)**: Complete user account management and order tracking system
  - Account Settings page with 5 tabs: Profile, Security, Connected Accounts, Addresses, Danger Zone
  - Profile management: edit name and email with validation and conflict detection
  - Security tab: change password functionality with current password verification
  - OAuth providers display showing connected accounts (Google, GitHub)
  - Address book: full CRUD operations with default address selection
  - Account deletion with confirmation dialog and cascading cleanup
- **Shopping Cart Enhancements**:
  - Delivery method selection: DELIVERY (shipping) or PICKUP (store pickup)
  - Address picker with saved addresses or "Enter new address at checkout" option
  - Visual delivery method UI with icons (truck for delivery, store for pickup)
- **Stripe Integration Enhancements**:
  - Shipping rates: Standard ($5.99), Express ($12.99), Overnight ($24.99)
  - Automatic address saving from Stripe checkout via webhook
  - Stripe Link support with customer email pre-fill
  - Auto-update user name from Stripe checkout data
  - Duplicate address detection before saving
  - Payment card last 4 digits capture and display
- **Order Management System**:
  - New `/orders` page with responsive table layout
  - Status filtering: All Orders, Pending, Completed, Cancelled dropdown
  - Order details page with items table, shipping info, and payment method
  - Order cancellation with immediate Stripe refund for PENDING orders
  - Mobile-optimized layout with vertical card design
  - Order display: Order #, Date, Items, Status, Total, Actions
- **Security & Data Integrity**:
  - Server-side price validation in checkout (prevents client-side price manipulation)
  - Optimized Stripe metadata to stay under 500 character limit
  - Session provider integration throughout app for auth state management
- **Database Schema Updates**:
  - Added `paymentCardLast4` field to Order model
  - Order status enum: PENDING, SHIPPED, PICKED_UP, CANCELLED
  - Shipping address relation on orders (only for delivery orders)
  - Delivery method field (DELIVERY/PICKUP)
- **Documentation**:
  - Documented Stripe Link test mode address mismatch issue
  - Setup guide for shipping rates creation
  - Guest checkout decision: email-only, no order history access
- **API Routes**:
  - `/api/user/profile` - Update user profile (name, email)
  - `/api/user/password` - Change password
  - `/api/user/addresses` - Address CRUD operations
  - `/api/user/orders` - Fetch orders with status filtering
  - `/api/user/orders/[orderId]/cancel` - Cancel order with refund
  - `/api/user/account` - Delete user account
- Dependencies: Added shadcn/ui components (alert-dialog, input, tabs, textarea, select)
- UI/UX: Fully responsive design with mobile-first approach, optimized table layouts

## 0.9.0 - 2025-11-14

- **Auth.js Integration Complete (Phase 3)**: Full authentication and order tracking implementation
  - User authentication with Google and GitHub OAuth providers
  - Sign-in page with OAuth buttons and guest checkout option
  - User menu in header with account settings and sign out
  - Order tracking: webhook automatically saves orders to database
  - Orders linked to authenticated users (guest orders saved with email only)
  - Order history page showing all user orders with status and details
  - Protected routes (orders page requires authentication)
  - Database schema with Stripe integration fields (sessionId, paymentIntentId, customerId, customerEmail)
- Dependencies: Added `date-fns` for date formatting
- **Next Steps (Phase 4)**: Email notifications, inventory management, subscription management portal

## 0.8.0 - 2025-11-14

- **Auth.js Integration (Phase 3 - Partial)**: Started authentication implementation
  - Installed `next-auth@beta` and `@auth/prisma-adapter`
  - Updated Prisma schema with Stripe fields for Order model
  - Configured Auth.js with Google and GitHub OAuth providers
  - Created sign-in page with OAuth buttons
  - Database migration for order tracking preparation

## 0.7.0 - 2025-11-14

- **Stripe Checkout (Phase 2)**: Integrated Stripe payment processing for one-time purchases and subscriptions
  - Checkout API endpoint creates Stripe Checkout Sessions with cart items
  - Support for both one-time purchases and subscription products
  - Product images and metadata passed to Stripe
  - Success page with order confirmation and cart clearing
  - Cancel page with cart preservation
  - Webhook handler for payment events and subscription lifecycle
  - Secure signature verification for webhooks
  - Loading states and error handling in checkout flow
- Documentation: Complete Stripe setup guide with test card numbers and webhook configuration
- Environment: Added `.env.example` with required Stripe keys
- Dependencies: Installed `stripe` and `@stripe/stripe-js` packages

## 0.6.0 - 2025-11-14

- **Shopping Cart (Phase 1)**: Implemented full shopping cart functionality with Zustand state management and localStorage persistence
  - Created cart store with add/remove/update/clear operations and computed totals
  - Special handling for subscriptions (replace instead of increment quantity)
  - Cart drawer UI with product images, variant details, quantity controls, and subtotal
  - Hydration-safe cart badge in header
  - Client-side persistence (survives page refresh, lost on localStorage clear)
- Architecture: Refactored cart logic into dedicated `ShoppingCart` component (separation of concerns from `SiteHeader`)
- Integration: Wired `ProductCard`, `ProductClientPage`, and `FeaturedProducts` to use cart store
- Checkout button placeholder (disabled, ready for Phase 2 Stripe integration)

## 0.5.3 - 2025-11-14

- Security: patched moderate vulnerability by upgrading transitive `js-yaml` (npm audit fix). No breaking changes.
- Mobile menu: revamped using shadcn Sheet (left-aligned title, icon-only Home shortcut, improved hierarchy & spacing, accessible focus and description).
- Breadcrumbs: truthful category context (load all product categories; use `from` only when linked; robust searchParams handling).
- Product cards: full-card focus ring, keyboard navigation improvements, prevent accidental navigation on Add to Cart, refined hover scaling.
- Lint/IDE: typed `params` & `searchParams` as Promises to remove false `await` warnings in server components.
- Theming: hero CTA button now uses theme tokens (removed hardcoded `bg-white text-primary`).
- Housekeeping: ignore npm audit report artifacts; minor accessibility enhancements (screen-reader menu description).
