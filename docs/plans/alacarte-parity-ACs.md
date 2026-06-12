# À La Carte Parity — Acceptance Criteria

**Branch:** `feat/alacarte-parity`
**Plan:** `docs/plans/alacarte-parity-plan.md`
**SDK:** `artisan-roast-sdk v0.6.2`
**Created:** 2026-06-11

---

## UI Acceptance Criteria

| AC | Plan ref | Role | What | How | Pass | Agent | QC | Reviewer |
|----|----------|------|------|-----|------|-------|----|----------|
| AC-UI-1 | D5 | `/frontend-dev` | Pools grant list visible on each add-on card | Browser: navigate to `/admin/support/add-ons`, capture screenshot `ac-ui-1.png` at 1440px viewport | Each card shows a compact list of grant items (e.g. "5 Priority Tickets") between the description and the purchase row | | | |

---

## Functional Acceptance Criteria

| AC | Plan ref | Role | What | How | Pass | Agent | QC | Reviewer |
|----|----------|------|------|-----|------|-------|----|----------|
| AC-FN-1 | D3 | `/backend-architect` | `AddOnsResponseSchema.parse()` is the validation boundary | Code review: `lib/add-ons.ts` | No unsafe `as` cast on the API response; `AddOnsResponseSchema.parse()` is called before the result is assigned to cache | | | |
| AC-FN-2 | D2 | `/backend-architect` | Local `AlaCartePackage` definition removed | Code review: `lib/license-types.ts` | No `interface AlaCartePackage` defined locally; file imports+re-exports it from `artisan-roast-sdk/alacarte` | | | |
| AC-FN-3 | D4 | `/backend-architect` | `startAlaCarteCheckout` result typed with SDK `CheckoutResponse` | Code review: `app/admin/support/add-ons/actions.ts` | `CheckoutResponse` imported from SDK; `as { url: string }` cast replaced with typed import | | | |

---

## Test Coverage Acceptance Criteria

| AC | Plan ref | Role | What | How | Pass | Agent | QC | Reviewer |
|----|----------|------|------|-----|------|-------|----|----------|
| AC-TST-1 | D6 | `/test-engineer` | `checkout.test.ts` uses SDK scaffold references | Code review: `app/admin/support/add-ons/__tests__/checkout.test.ts` | No literal `"alacarte-tickets-5"` string; test imports `ALACARTE_SCENARIOS` from SDK and reads `.TICKETS_5.id` | | | |
| AC-TST-2 | D7 | `/test-engineer` | `AddOnsPageClient.test.tsx` covers pools rendering | Test run: `npm run test:ci` | Test renders `ALACARTE_SCENARIOS.TICKETS_5` and asserts pool grant text (e.g. "Priority Tickets") is present in DOM | | | |
| AC-TST-3 | D7 | `/test-engineer` | `AddOnsPageClient.test.tsx` covers empty state | Test run: `npm run test:ci` | Test renders with `alaCarte: []` and asserts "No add-on packages available" fallback text | | | |
| AC-TST-4 | D8 | `/devops` | `addons:capture` script exists and is wired | Code review: `scripts/capture-addon-scenarios.ts` + `package.json` | Script hits `GET /api/add-ons`; writes to `e2e/add-ons/captured/packages.json`; `package.json` has `"addons:capture"` script entry | | | |

---

## Regression Acceptance Criteria

| AC | Plan ref | Role | What | How | Pass | Agent | QC | Reviewer |
|----|----------|------|------|-----|------|-------|----|----------|
| AC-REG-1 | — | `/test-engineer` | All existing tests pass | Test run: `npm run test:ci` | 127 suites / 1435+ tests pass, 0 failures | | | |
| AC-REG-2 | — | `/devops` | Precheck passes clean | Run: `npm run precheck` | 0 TypeScript errors, 0 ESLint errors | | | |
