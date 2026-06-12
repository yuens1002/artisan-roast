# À La Carte Parity — Feature Plan

**Branch:** `feat/alacarte-parity`
**SDK target:** `artisan-roast-sdk v0.6.2`
**Created:** 2026-06-11
**ACs:** `docs/plans/alacarte-parity-ACs.md`

## Goal

Bring the store's à la carte add-ons implementation into parity with the SDK v0.6.2 contract, which added a required `pools: AlaCartePool[]` field to `AlaCartePackage`. Surface pools grant data on each add-on card in the admin UI.

## Deliverables

| ID | Deliverable | Role | File(s) |
|----|-------------|------|---------|
| D1 | Bump `artisan-roast-sdk` to v0.6.2 | `/devops` | `package.json` |
| D2 | Remove local `AlaCartePackage` interface; import + re-export from SDK | `/backend-architect` | `lib/license-types.ts` |
| D3 | Replace unsafe `as` cast on `/api/add-ons` response with `AddOnsResponseSchema.parse()` | `/backend-architect` | `lib/add-ons.ts` |
| D4 | Type `startAlaCarteCheckout` response with SDK `CheckoutResponse` | `/backend-architect` | `app/admin/support/add-ons/actions.ts` |
| D5 | Render pools grant list (`<ul>`) on each add-on card between description and purchase row | `/frontend-dev` | `app/admin/support/add-ons/AddOnsPageClient.tsx` |
| D6 | Migrate `checkout.test.ts` from literal slugs to `ALACARTE_SCENARIOS` SDK scaffold refs | `/test-engineer` | `app/admin/support/add-ons/__tests__/checkout.test.ts` |
| D7 | Add `AddOnsPageClient.test.tsx` covering pools grant list + empty state | `/test-engineer` | `app/admin/support/add-ons/__tests__/AddOnsPageClient.test.tsx` |
| D8 | Add `addons:capture` script wired to `package.json` | `/devops` | `scripts/capture-addon-scenarios.ts` |

## Commit Schedule

1. `feat(alacarte): bump SDK to v0.6.2, migrate types to SDK contract` — D1, D2, D3, D4
2. `feat(alacarte): render pools grant list on add-on cards` — D5
3. `test(alacarte): add AddOnsPageClient tests, update checkout tests to use SDK scaffolds` — D6, D7
4. `feat(alacarte): add addons:capture script` — D8

## Verification

- AC-UI-1: Pools grant list visible on each add-on card (browser + unit test proxy)
- AC-FN-1/2/3: SDK type contract enforced at all three touch-points
- AC-TST-1/2/3/4: Test coverage — SDK scaffold refs, pools rendering, empty state, capture script
- AC-REG-1/2: Full suite passes, precheck clean
