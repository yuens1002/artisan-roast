# Provider Plan SDK Alignment — Architecture (store-side view)

Cross-repo data contract and testing architecture for keeping the **store**, a compliant **provider implementation**, and the **SDK** honest about every piece of plan data in every state.

This document is the **store's view** of the contract. It describes the store's responsibilities, the testing layers the store maintains, and the drift surfaces visible from the store side.

**Cross-repo coverage today (honest accounting):**

| Concern | Doc | Status |
|---------|-----|--------|
| Cross-repo roles + dependency order (all 3 actors) | Provider repo: `docs/appendix/cross-repo/provider-sdk-integration.md` | Exists; high-level overview |
| Provider's own architecture (auth, DB, hosting model, plan/feature/support tables) | Provider repo: `docs/platform/architecture.md` | Exists |
| Store-side testing architecture + drift surfaces + per-field ownership | This file | Exists |
| Provider's resolver branch logic as a documented spec | — | Lives in source code only (`app/api/plans/resolved/route.ts` in the reference provider); not a separate doc |
| Provider's business spec enforcement test suite | Filed as PLAT-1 in `plan.md` | Not yet started |
| SDK contract spec (for SDK consumers) | SDK repo: `docs/provider-plan-spec/` | Exists (multiple sub-specs) |

So this doc and the provider's `provider-sdk-integration.md` are **complementary, not duplicative.** The store-side concerns (testing layers, renderer contract, drift surfaces visible from the store) live here. The cross-repo overview lives in the provider's appendix. The provider's resolver internals are *currently undocumented as a spec*; they live in code — that's a known gap (PLAT-1).

> **Audience:** anyone touching plan rendering in this store, or implementing a compliant provider (resolver returning `HydratedPlan[]` per the SDK contract).
>
> **Neutrality intent:** this repo is a reference store implementation (public, MIT-licensed). It does not assume a specific provider — references to "the provider" mean *any* implementation that honors the `artisan-roast-sdk` contract for `/api/plans/resolved`.

---

## 1 — The three actors

| Actor | Role | Owns |
|------|------|------|
| `artisan-roast-sdk` (npm package) | Type contract + scaffolds | `HydratedPlan` type, `PlanState` discriminated union, example `SCENARIOS` shapes, MCP validation tools |
| Provider implementation | Resolver + plan data store | The `GET /api/plans/resolved` endpoint that returns `HydratedPlan[]`, plus whatever DB/business logic backs it. Provider-specific. |
| `artisan-roast` (this repo; local dir name `ecomm-ai-app`) | Store — renderer + UI placement | `PlanPageClient` and child cards that map `HydratedPlan` → DOM |

```text
┌─────────────────────────────┐
│   artisan-roast-sdk         │   types + reference SCENARIOS
│   (npm package)             │   + MCP validation tools
└────────────┬────────────────┘
             │ types consumed by both
   ┌─────────┴─────────┐
   ▼                   ▼
┌──────────────┐    ┌────────────────────────┐
│  Provider    │    │   artisan-roast        │
│  (resolver + │───▶│   (store: renderer)    │
│   data)      │API │                        │
└──────────────┘    └────────────────────────┘
                            ▲
                            │
                    end user via browser
```

Data flows **Provider data → Resolver → Wire (HydratedPlan JSON) → Renderer → DOM**. Each arrow is a drift surface.

---

## 2 — Roles: who decides what

The role separation is the foundation of the testing strategy. Misattributing a concern to the wrong layer leads to tests that either duplicate effort or leave gaps.

| Concern | SDK | Provider (resolver) | Store (renderer) |
|---------|:---:|:---:|:---:|
| What fields can exist on a plan / state / pool / action | ✓ Defines type union + field optionality | — | — |
| Which state a plan is in | — | ✓ Computes status from DB | — |
| Which fields are populated for that state | ✓ Allows the shape | ✓ Decides what to populate | — |
| Where the account pool attaches | ✓ Allows pools on whichever states admit them | ✓ Attaches the pool to the customer's active plan | — |
| Pool exhaustion (`pool.used >= pool.limit + purchased`) → `action.disabled` | ✓ Allows the field | ✓ Sets the flag | — |
| Replenishment cadence (monthly tickets reset on month boundary) | — (SDK gap — see D10) | ✓ Owns the temporal behavior | — |
| Plan business spec (Priority Support = 5 tickets, $49/mo) | — | ✓ Enforces in own test suite (see §9) | — |
| Visual arrangement, copy positioning, icon placement | — | — | ✓ |
| Modal flow on action click | — | ✓ Sets `action.modalSlug` to match an `actionModals[]` entry | ✓ Opens dialog + propagates confirmation |

The store never derives state behavior, computes exhaustion, infers cadence, or validates business config. It renders what it's given.

---

## 3 — The four drift surfaces

| # | Surface | What can drift | Who catches it |
|---|---------|----------------|----------------|
| 1 | DB ↔ Resolver | Plan content edits, schema changes, missing required columns | Provider tests + monitoring |
| 2 | Resolver ↔ SDK type | Resolver emits a status outside the union; wrong type for a primitive; omits a required field | Layer 4 (captured payload) — SDK boundary cast doesn't catch |
| 3 | SDK ↔ Renderer | SDK type evolves; renderer reads new fields but old captures don't have them; renderer ignores fields the SDK ships | TypeScript (Layer 1); SCAFFOLD pin (Layer 3); component contract (Layer 2) |
| 4 | Renderer ↔ DOM (visual) | CSS regressions, layout drift, hydration mismatch | Screenshot harness (Layer 6) + Playwright plumbing (Layer 5) |

The store repo's testing strategy targets surfaces **2, 3, and 4**. Surface 1 is provider-owned.

---

## 4 — Per-field data ownership

For every field the renderer reads, this table states **where the value comes from**, **who owns the decision**, and **what catches a change**. Layer references map to §5 (Testing strategy).

### `Plan` (catalog metadata)

| Field | Origin | Owner | Catches change |
|-------|--------|-------|----------------|
| `slug` | DB | Provider | Layer 4 — captured-payload diff; also drives renderer key |
| `name` | DB | Provider admin | Layer 4 |
| `description` | DB | Provider admin | Layer 4 |
| `price` | DB | Provider admin | Layer 4 |
| `currency` | DB | Provider admin | Layer 4 (store renderer is currently `$`-only — known gap) |
| `interval` | DB | Provider admin | Layer 2 + Layer 4 |
| `features` | DB | Provider admin | Layer 4 |
| `details.benefits.activeItems` | DB | Provider admin | Layer 4; Layer 2 verifies presence in DOM |
| `details.benefits.activeHeader` | DB | Provider admin | Layer 4; Layer 2 verifies header placement |
| `details.benefits.inactiveItems` | DB | Provider admin | Layer 4; Layer 2 verifies INACTIVE fallback |
| `details.benefits.inactiveHeader` | DB | Provider admin | Layer 4; Layer 2 verifies header placement |
| `details.sla.*` | DB | Provider admin | Layer 4 |
| `details.quotas[]` | DB | Provider admin | Layer 4 + **cross-field consistency** (asserts `quotas[].limit === state.pools[].limit` per slug) |
| `highlight` | DB | Provider admin | Layer 4 |
| `visibility` | DB | Provider admin | Layer 4 |
| `salePrice` | DB | Provider admin | Layer 4; Layer 2 verifies sale rendering |
| `saleEndsAt` | DB | Provider admin | Layer 4; Layer 2 verifies expired-sale absence |
| `saleLabel` | DB | Provider admin | Layer 4; Layer 2 verifies label composition |
| `actionModals[]` | DB | Provider admin | Layer 4; Layer 2 verifies dialog rendering on `modalSlug` click |

### `PlanState` (resolver-computed)

| Field | Origin | Owner | Catches change |
|-------|--------|-------|----------------|
| `state.status` | Resolver branch logic | Provider code | Layer 4 (enum-in-union check); Layer 2 verifies dispatch to correct sub-card |
| `*.badge` | Resolver | Provider code | Layer 4; Layer 2 verifies badge rendering |
| `*.badgeIcon` | Resolver | Provider code | Layer 4; Layer 2 verifies icon-by-name (lucide stub) |
| `*.statusInfo.descIcon` | Resolver | Provider code | Layer 4; Layer 2 verifies icon rendering |
| `*.statusInfo.descText` | Resolver | Provider code | Layer 4; Layer 2 verifies text rendering |
| `*.pools[]` | Resolver from Quota + Credit tables | Provider code + DB | Layer 4 + cross-field with `details.quotas[]`; Layer 2 verifies PoolBar projection |
| `*.actions[]` | Resolver | Provider code | Layer 4; Layer 2 verifies button rendering, icons, modal opening |
| `*.deprovisionAt` (Trial/Expired/Cancelled) | Resolver from HostedTrial | Provider code + DB | Layer 4; Layer 2 verifies date formatter output |
| `CancelledState.daysRemaining` | Resolver computed | Provider code | Layer 4; Layer 2 verifies singular/plural projection |
| `CancelledState.daysLimit` | Resolver computed | Provider code | Layer 4 |
| `InactiveState.deactivatedAt` | Resolver from LicenseKey | Provider code + DB | Layer 4; Layer 2 verifies "Ended on" rendering |

### `UsagePool`

| Field | Origin | Owner | Catches change |
|-------|--------|-------|----------------|
| `slug` | Resolver | Provider code | Layer 4 |
| `label` | Resolver / DB | Provider code | Layer 4 |
| `limit` | Resolver / DB Quota | Provider code | Layer 4 + cross-field with `details.quotas[]` |
| `used` | Resolver from Credit | Provider code | Layer 4 (normalised at capture); Layer 2 verifies count rendering |
| `purchased` | Resolver from Credit | Provider code | Layer 4; Layer 2 verifies `limit + purchased` arithmetic in count display |
| `icon` | Resolver | Provider code | Layer 2 verifies icon-by-name |
| `countLabel` | Resolver | Provider code | Layer 2 verifies suffix concatenation |
| `cta` | Resolver | Provider code | Layer 2 verifies dropdown placement across all pool-bearing states |

### `PlanAction`

| Field | Origin | Owner | Catches change |
|-------|--------|-------|----------------|
| `slug` | Resolver | Provider code | Layer 4 |
| `label` | Resolver | Provider code | Layer 4; Layer 2 verifies button label |
| `url` | Resolver | Provider code | Layer 4 |
| `endpoint` | Resolver | Provider code | Layer 4 |
| `iconBefore` | Resolver | Provider code | Layer 2 — positional + identity assertion |
| `iconAfter` | Resolver | Provider code | Layer 2 — positional + identity assertion |
| `variant` | Resolver | Provider code | Layer 2 verifies styling slot (ghost vs primary/secondary) |
| `modalSlug` | Resolver | Provider code | Layer 2 verifies click opens correct dialog |
| `disabled` | Resolver | Provider code (set on pool exhaustion etc.) | Layer 2 verifies disabled attribute + Layer 4 verifies provider sets it correctly |
| `disabledReason` | Resolver | Provider code | Layer 2 verifies tooltip on disabled control |

### `ConfirmActionConfig`

| Field | Origin | Owner | Catches change |
|-------|--------|-------|----------------|
| `slug` | DB | Provider admin | Layer 4 — must resolve from `actionModals[]` by any referencing `action.modalSlug` |
| `heading` | DB | Provider admin | Layer 2 verifies dialog title |
| `description` | DB | Provider admin | Layer 2 verifies body text |
| `reasonsLabel` | DB | Provider admin | Layer 2 verifies label above reasons |
| `reasons[]` | DB | Provider admin | Layer 2 verifies dropdown options |
| `keepLabel` | DB | Provider admin | Layer 2 verifies dismiss button |
| `confirmLabel` | DB | Provider admin | Layer 2 verifies confirm button |
| `confirmIcon` | DB | Provider admin | Layer 2 verifies icon on confirm |
| `other.label` | DB | Provider admin | Layer 2 verifies free-text reveal |
| `other.placeholder` | DB | Provider admin | Layer 2 verifies placeholder text |
| `other.maxLength` | DB | Provider admin | Layer 2 verifies character counter |

---

## 5 — Testing strategy: six layers

Each layer targets a specific failure class. Together they cover the four drift surfaces.

### Layer 1 — TypeScript (compile-time)

**Catches:** SDK type-breaking changes (required field added/removed; renamed; removed scaffold export).
**Mechanism:** `npm run typecheck`. Husky pre-commit. CI.
**Limitation:** Does not validate runtime values. `as ResolvedPlansResponse` casts are unchecked at the boundary.

### Layer 2 — Component contract tests (Jest, hermetic)

**Catches:** Renderer regressions on any typed field — missing icon, wrong position, broken fallback, wrong CTA wiring, lost disabled state.

**Structure:**

```text
__tests__/contract/
  _helpers.tsx                 ← typed factories (makePlan, makeNone, …); lucide-react stub
  common-fields.test.tsx       ← parameterized over states: name, description, actions,
                                  pools, icons, benefits, modalSlug wiring, action.disabled
  none-card.test.tsx           ← NoneCard-unique: pricing/sale logic, benefits fallback
  active-card.test.tsx         ← ActiveCard-unique: 3-dot dropdown grouping, addon-on-Community case
  trial-card.test.tsx          ← TrialCard-unique
  expired-card.test.tsx        ← ExpiredCard-unique: amber accent on statusInfo
  cancelled-card.test.tsx      ← CancelledCard-unique: deprovision date, daysRemaining singular/plural
  inactive-card.test.tsx       ← InactiveCard-unique: inactiveItems/activeHeader fallback
  confirm-action-dialog.test.tsx ← ConfirmActionConfig field coverage
  plan-page-client.test.tsx    ← page-level composition, ordering, empty state, warnings
```

**How column format:** every assertion is structured as **Presence / Absence / Placement** — does the element appear, does it NOT appear where it shouldn't, and is it in the correct structural slot.

**Cost:** ~80–100 tests, runs in <2 seconds. Hermetic.

### Layer 3 — SDK SCAFFOLD pin (Jest snapshot)

**Catches:** SDK `SCENARIOS.*` values change between versions — different badge text, benefit copy, action labels.
**Mechanism:** `__tests__/sdk-scaffold-pins.test.ts` snapshots every imported SCENARIO with date normalisation. SDK upgrades surface as snapshot diff for review.

### Layer 4 — Captured-payload tests (Jest, prod data replay) — partially shipped

**Catches:** Resolver returns shapes the SDK type doesn't anticipate — extra fields, wrong types, omitted required fields, statuses outside the union, wrong response wrapping. Cross-field inconsistencies. Plan content drift.

**Mechanism (current state):**

1. **Shipped today**: `npm run plans:capture` (`scripts/capture-plan-scenarios.ts`) calls each dev license key's `/api/plans/resolved`, normalises `resolvedAt` to a placeholder, writes `e2e/plans/captured/<key>.json`.
2. **Deferred (ST-4 in `plan.md`)**: Jest test that loads each JSON and asserts (a) structural type satisfaction against `HydratedPlan`, (b) `state.status` ∈ SDK union, (c) cross-field `quotas[].limit === state.pools[].limit`, (d) `action.modalSlug` resolves in `plan.actionModals[]`, (e) renders through `PlanPageClient` without crash with shape-driven projections.
3. **Deferred (additional normalisation)**: capture script could also normalise `pool.used` (currently only `resolvedAt` is normalised) to make refreshes diff-friendly across runs.
4. **Deferred (optional MCP cross-check)**: `npm run plans:validate` calling `mcp__artisan-roast-sdk__validate_plan_payload` for SDK-authoritative validation.

**Refresh discipline:** Re-run `plans:capture` before cross-repo merges or releases. The JSON diff *is* the drift signal — review and accept or investigate.

### Layer 5 — Playwright plumbing test — deferred

**Catches:** Next.js integration breakage — `searchParams` not awaited, env-gating regression, RSC → Client serialization, hydration mismatches, fetch timeout silently empties the page, dev override leaking into production.

**Status:** Deferred (ST-5 in `plan.md`). Naive Playwright route-mock of `/api/plans/resolved` doesn't intercept the page's server-side RSC fetch — the spec must drive via the dev `?scenario=` override, OR the mock platform server (`e2e/mock-platform.mjs`) must serve `/api/plans/resolved`, OR a store-local route must proxy the resolver. Pick one before authoring the spec.

### Layer 6 — Visual screenshot harness

**Catches:** CSS / spacing / icon-rendering regressions that don't break the DOM but break the look.
**Mechanism:** `scripts/screenshot-plan-scenarios.ts` loops fixture keys, hits the dev `?scenario=<key>` override, captures viewport. Single script replaces the seven throwaways from prior sessions.

---

## 6 — Drift coverage matrix

| Drift class | Layer | Failure mode |
|-------------|-------|--------------|
| SDK adds required field | 1 (TS) | Compile error |
| SDK adds optional field renderer reads | 2 (Contract) | Test failure on inputs that include the field |
| SDK changes a SCAFFOLD value | 3 (Pin) | Snapshot diff |
| SDK renames an export | 1 (TS) | Module not found |
| Renderer regression on iconBefore positioning | 2 (Contract — Placement assertion) | Position assertion fails |
| Renderer regression on benefits fallback (INACTIVE) | 2 (Contract) | Fallback test fails |
| Renderer drops `action.disabled` styling | 2 (Contract) | Disabled-attribute assertion fails |
| Pool CTA missing from Trial/Expired card | 2 (Contract — parameterized) | Pool.cta dropdown assertion fails for those states |
| Resolver returns status outside SDK union | 4 (Captured) | Enum assertion fails |
| Resolver returns `price` as string | 4 (Captured) | Type assertion fails |
| Resolver omits required field | 4 (Captured) | Structural assertion fails |
| Resolver attaches `pool.cta` but `disabled` is unset on exhausted pool | 4 (Captured) | Cross-field: `pool.used >= pool.limit + (purchased??0)` ⟹ `cta.disabled` true |
| `quotas[].limit` drifts from `state.pools[].limit` | 4 (Captured — cross-field) | Consistency assertion fails |
| Plan DB content edit (admin changes a benefit) | 4 (Captured) | JSON diff visible after re-capture |
| `searchParams` not awaited | 5 (Playwright) | Dev override silent → AC fails |
| Dev override leaks into prod | 5 (Playwright) | Production-mode test asserts override is gated |
| Hydration mismatch on date | 5 (Playwright) | console.error watch fires |
| Fetch timeout empties page silently | 5 (Playwright) | Test asserts no console errors when payload is valid |
| CSS regression | 6 (Screenshot) | Visual diff |

---

## 7 — Refresh + release workflow

The cross-repo workflow has three trigger points where captured payloads must be refreshed:

1. **SDK release.** Bump SDK in store → SCAFFOLD pin (Layer 3) diffs → review → `plans:capture` if resolver also changed → ship.
2. **Provider release.** Resolver change merges → deploy → `plans:capture` in store → diff visible in store PR → reviewer accepts.
3. **Plan content edit** (admin UI). `plans:capture` next time someone touches plan-page work → diff is the audit trail.

Unexpected diff → cross-repo drift signal. Investigate before merging.

---

## 8 — File index

```text
docs/features/provider-plan-sdk-alignment/
├── architecture.md                        # this document
├── plan.md                                # session breakdown
├── session-1/
│   └── ACs.md                             # acceptance criteria for harness implementation
└── archive/                               # historical sessions
    ├── old-plan.md                        # original session-chain plan (pre-rebuild)
    ├── session-1/ … session-5/            # original sessions, kept for reference
    ├── scenario-walkthrough.md
    └── TEMP-ISSUES.md

app/admin/support/plans/
├── PlanPageClient.tsx                     # the renderer (Session 1: consumes formatters + PoolCtaMenu)
├── formatters.ts                          # extracted pure formatters (Session 1 ✓)
├── _components/
│   ├── ConfirmActionDialog.tsx            # modal — covered by AC-CT-MODAL (deferred ST-2)
│   └── PoolCtaMenu.tsx                    # shared 3-dot helper (Session 1 ✓)
├── page.tsx                               # RSC entry; ?scenario= dev override (Session 1 ✓)
└── __tests__/
    ├── fixtures/
    │   └── plan-scenarios.ts              # SDK-derived examples for dev override + screenshots (Session 1 ✓)
    ├── contract/                          # Layer 2 — per-state files shipped today
    │   ├── _helpers.tsx                   # ✓
    │   ├── none-card.test.tsx             # ✓
    │   ├── active-card.test.tsx           # ✓
    │   ├── trial-card.test.tsx            # ✓
    │   ├── expired-card.test.tsx          # ✓
    │   ├── cancelled-card.test.tsx        # ✓
    │   ├── inactive-card.test.tsx         # ✓
    │   ├── common-fields.test.tsx         # deferred ST-1 (restructure into shared suite)
    │   ├── confirm-action-dialog.test.tsx # deferred ST-2
    │   └── plan-page-client.test.tsx      # deferred ST-3 (page composition)
    ├── formatters.test.ts                 # AC-FMT ✓
    ├── sdk-scaffold-pins.test.ts          # Layer 3 ✓
    └── captured-payloads.test.tsx         # Layer 4 — deferred ST-4

e2e/plans/
├── plumbing.spec.ts                       # Layer 5 — deferred ST-5
└── captured/                              # Layer 4 input — directory exists; JSONs collected via `npm run plans:capture`

scripts/
├── capture-plan-scenarios.ts              # `npm run plans:capture` — refreshes Layer 4 input ✓
├── validate-plan-scenarios.ts             # `npm run plans:validate` — MCP cross-check (deferred, optional)
└── screenshot-plan-scenarios.ts           # Layer 6 ✓ (replaces 8 throwaways)
```

---

## 9 — Today's state of the three repos + minimum observability

> The architectural reality of *today* — pinned for honesty. Compatibility-over-time (boundary validation, version handshake, admin version banner, deprecation policy) is **deferred** until there are self-hosted customers to protect or a real version-skew incident forces it. Everything below is the minimum that meets the priority: **ship hosted/trial reliably, know when it breaks.**

### 9.1 Current dependency mechanisms

| Pair | Mechanism | Skew speed | Implication |
|------|-----------|------------|-------------|
| Store ↔ SDK | `"artisan-roast-sdk": "file:../artisan-roast-sdk"` (symlink during local dev) | Instant (no skew) | Store always rebuilds against current SDK working copy. No upgrade path because nothing to upgrade. Production builds pin to the published SDK version. |
| Provider ↔ SDK | Provider pins SDK via package manifest (e.g. `github:owner/artisan-roast-sdk#v0.4.0` for the current reference provider implementation) | Manual, deliberate | Provider bumps the pin when SDK has a release worth picking up. |
| MCP ↔ SDK | MCP code lives in `artisan-roast-sdk/src/mcp/`; deployed as a hosted MCP server | Tied to SDK redeploy cadence | MCP `serverInfo.version` is currently hardcoded out-of-sync with the SDK package version — bundled fix in next SDK touch (see SDK-RFC-MCP-VER in plan.md). |

### 9.2 Customer reality

**Self-hosted is LIVE in production** (Community plan + Priority Support subscription + a la carte add-ons), with **zero current customers**. Hosted/trial is **not yet open to customers** (the gate hasn't been flipped).

This is "live but unstressed" — the system is real, the renderer ships to prod on merge, but no one is paying yet. The compatibility-over-time work (boundary validation, version handshake, admin banner, fallback card, deprecation policy) is *deferrable* rather than *unfunded*: we have observability hooks in place (§9.3), and we'll have signal — either via the `[plans.fetch.failed]` logs from a real customer or a drift incident — before we need the heavier machinery.

When the first paying self-hosted customer signs up, or a hosted/trial gate opens to customers, that's the trigger to revisit §9.4's deferred items.

### 9.3 Minimum observability — "know when it breaks"

Three cheap mechanisms. Total cost ~30 lines, no new dependencies.

1. **Structured boundary error log.** In `lib/plans.ts`, when `fetchResolvedPlans()` catches an exception, gets a non-2xx response, or parses an unexpected wrapper shape, log a structured event:

   ```ts
   console.error("[plans.fetch.failed]", {
     status: response?.status,
     hadLicense: !!licenseKey,
     errorClass,
     url,
   });
   ```

   These surface in Vercel/host logs. `grep [plans.fetch.failed]` is the observability surface.

2. **"Valid license + empty plans" warning.** If `licenseKey` is set and the resolver returns `plans: []`, log a warning:

   ```ts
   console.warn("[plans.empty.unexpected]", { licenseKey: hash(licenseKey) });
   ```

   Distinguishes "page legitimately empty" (no license) from "resolver gave us nothing despite a valid license" (drift signal). UX unchanged; just makes the silent failure mode visible.

3. **Capture refresh recency as staleness signal.** The git log of `e2e/plans/captured/*.json` is the implicit "last verified against prod" timestamp. When captures are >N weeks old, the alignment claim is aging. No script enforces this today — surfaces as a review check during cross-repo work.

### 9.4 Deferred until real demand exists

- Runtime payload validation (Zod / hand-rolled) at the fetch boundary.
- Version handshake (request/response headers carrying SDK versions).
- Graceful fallback `<FallbackCard/>` for unknown `state.status` in the renderer.
- Admin UI banner surfacing store-vs-provider SDK version mismatch.
- SDK deprecation timeline + migration docs.
- Telemetry of incoming SDK versions on the provider side.

Each of these protects deployed customers who don't exist today. Revisit at self-hosted launch or after a real skew incident.

---

## 10 — Provider-side concerns (out of store scope)

These are provider responsibilities. The store does not enforce or test them; it surfaces drift via Layer 4 when one of them breaks.

- **Plan business spec validation.** "Priority Support has 5 tickets and 1 session" is a provider-config concern. The provider should have its own test suite that asserts each shipped plan matches its product spec. Filed as a cross-repo coordination item in `plan.md`.
- **Replenishment cadence.** Monthly tickets reset on month boundary; weekly resets, etc. Time-dependent behavior cannot be verified from a single capture. Provider owns.
- **Pool credit accounting.** `pool.used` correctness — that a Credit row decrements when a ticket is submitted, that purchased credits don't expire, etc. Provider owns.

If the store discovers drift in any of these (via Layer 4 diff), the action is to file a provider issue, not to add store-side validation.

---

## 11 — Decisions log

These are the architectural decisions this document encodes. Each is here because alternatives were considered and rejected for stated reasons.

**D1. SDK is types-only, not implementation.**
Alternative: ship a JS resolver from SDK. Rejected — each provider implementation must compute state from its own data store; the SDK's job is to define the wire shape, not the computation.

**D2. Captured payloads are committed JSON files, not live network calls in CI.**
Alternative: Playwright spec that hits live prod resolver per run. Rejected for flakiness, network-dependence, dev-license-key management. Captures + JSON-diff review give the same drift signal with better determinism.

**D3. Layer 4 (captured payloads) runs in Jest, not Playwright.**
Alternative: keep captured-payload check in Playwright. Rejected — shape validation + render-without-crash doesn't need a browser. Jest is faster and simpler to debug.

**D4. Component tests construct inputs inline; fixtures are not the spec.**
Alternative: drive contract tests from `SCENARIO_FIXTURES`. Rejected — fixtures couple correctness to specific data shapes. Contract tests must verify the renderer's contract against any well-typed input, not just realistic ones.

**D5. Hand-derived compositions in `plan-scenarios.ts` are examples, not authoritative.**
Their content does not gate any correctness test. Captured payloads are the prod-shape source.

**D6. Dev `?scenario=<key>` override on `page.tsx` reads from `plan-scenarios.ts`.**
Lets developers iterate without a provider stack. Gated on `NODE_ENV !== "production"`. Layer 5 has an AC asserting this gate.

**D7. Common-fields contract test parameterizes over states; state-specific test files only cover state-unique behavior.**
Avoids duplicating "plan.name renders as h3" six times.

**D8. SDK MCP is a developer tool, not a test dependency.**
`mcp__artisan-roast-sdk__validate_plan_payload` provides authoritative shape validation. Wrapped as `npm run plans:validate` for ad-hoc engineer use before capture refreshes. Jest tests maintain their own structural assertions for deterministic CI; the MCP cross-check is opt-in and supplementary. Tests must run without the MCP.

**D9. Disabled action state is provider-determined, not store-computed.**
The store reads `action.disabled` and `action.disabledReason`. It does NOT derive disabled state from `pool.used >= pool.limit` or any other condition. Future providers may have different exhaustion semantics (overage, soft caps); the renderer stays agnostic.

**D10. Cadence is not modelled in the SDK type today — known gap.**
"Per month" / "per year" replenishment is encoded in `benefits.activeItems[]` strings and `Plan.interval` only. The SDK does not have a `quotas[].cadence` field. The store cannot verify replenishment from a single capture; this is provider-owned. Filed as a cross-repo SDK enhancement in `plan.md` — proposed `quotas[].cadence: "month" | "year" | "one-time"`.

**D11. Pools restricted to ACTIVE / TRIAL / EXPIRED states — known SDK gap.**
The SDK's `PlanState` union only allows `pools` on these three states. Add-on pool credits follow the account, not the plan, and persist regardless of state. A FREE customer with addon tickets sees them via the today-pattern (resolver puts FREE in ACTIVE state with pools). A lapsed customer's residual credits cannot be modelled at all today. Filed as a cross-repo SDK enhancement — proposed `pools?: UsagePool[]` on every state (NONE, INACTIVE, CANCELLED included).

**D13. Compatibility-over-time work is deferred — triggered by signal, not timeline.**
Self-hosted is live in production but has zero current customers; the hosted/trial gate isn't open to customers yet. The system is real, just unstressed. Today: store ↔ SDK is `file:` symlink (no skew); provider ↔ SDK is a pinned package reference (deliberate, slow). Runtime payload validation, version handshake headers, admin version banners, deprecation policy, graceful renderer fallback — all valuable, but defer until **signal** appears: a `[plans.fetch.failed]` log from a real customer, a drift incident, growth in self-hosted usage, or the hosted/trial gate opening. Replaced for now with **minimum observability** (see §9.3): three structured log hooks at the fetch boundary, ~30 lines, no new deps. The MCP `serverInfo.version` hardcoding (currently `"0.2.0"`) is filed as **SDK-RFC-MCP-VER** and bundled with the next SDK touch, not gated on this session.

**D12. Plan-spec baseline checks are provider-owned, not store-owned.**
Whether "Priority Support has 5 tickets" matches the marketing spec is the provider's responsibility (data content + provider's own test suite). The store renders whatever the provider sends. Drift detection in the store is via Layer 4 captured-payload diff — surfaces unexpected change, doesn't enforce a spec. Filed as a cross-repo coordination item: provider should ship its own spec-validation test suite.
