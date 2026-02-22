# Roaster's Brew Guide — Plan

**Branch:** `feat/product-reviews-tier1`
**Base:** `main`
**Status: IMPLEMENT FIRST** — ships independently before full review system

## Context

The demo site needs roaster's brew guides on product pages ASAP. Currently, "Best For" is hardcoded in `CoffeeDetails.tsx` as a static `brewMethodsByRoast` map, and `ProductClientPage.tsx` is a 557-line monolith with scattered `isCoffee && ...` conditionals.

This plan:
1. Adds `roasterBrewGuide Json?` to the Product schema
2. Refactors `ProductClientPage` into a slot-based layout
3. Adds the RoasterBrewGuide storefront component as a new slot
4. Seeds brew guides on 8-10 flagship coffees

Admin editor deferred to follow-up.

## Commit Schedule

| # | Message | Scope | Risk |
|---|---------|-------|------|
| 0 | `docs: add plans for product reviews tier 1` | Plans + ACs doc | — |
| 1 | `feat: add roasterBrewGuide field to Product schema` | Prisma schema + migration + types | Low |
| 2 | `refactor: extract slot-based ProductDetailLayout` | ProductClientPage decomposition | Medium |
| 3 | `feat: display roaster brew guide on product pages` | CoffeeDetails refactor + RoasterBrewGuide component | Low |
| 4 | `feat: seed brew guides on flagship coffee products` | prisma/seed.ts | Low |

## Acceptance Criteria

### UI (verified by screenshots)

| AC | What | How | Pass |
|----|------|-----|------|
| AC-UI-1 | "Best For" shows roaster-curated methods | Static: `/products/ethiopian-yirgacheffe` | Shows "V60, Chemex" from brew guide, not roast-level defaults |
| AC-UI-2 | "Best For" falls back for products without guide | Static: product without brew guide | Roast-level methods unchanged |
| AC-UI-3 | Brew Guide section displays | Static: `/products/ethiopian-yirgacheffe` | Methods, recipe details, origin notes, accolades, tasting commentary visible |
| AC-UI-4 | Recipe steps render as table | Static: `/products/ethiopian-yirgacheffe` | Summary line + step table (label, water, time, notes) |
| AC-UI-5 | Brew Guide hidden when no data | Static: product without guide | No empty section |
| AC-UI-6 | Responsive at all breakpoints | 3 breakpoints on `/products/ethiopian-yirgacheffe` | Readable, no overflow |
| AC-UI-7 | Merch page unaffected | Static: merch product | Identical to current |

### Functional (verified by code review)

| AC | What | How | Pass |
|----|------|-----|------|
| AC-FN-1 | Migration adds `roasterBrewGuide Json?` | Migration SQL | Nullable, non-destructive |
| AC-FN-2 | TypeScript interface complete | `lib/types/roaster-brew-guide.ts` | `recommendedMethods`, `recipes?` (with `steps?`, weights, time), `originNotes?`, `accolades?`, `roasterTastingNotes?` |
| AC-FN-3 | ProductDetailLayout uses named slots | Layout component | Props: `header`, `details?`, `purchaseControls`, `brewGuide?`, `story?`, `addOns?`, `relatedProducts?` |
| AC-FN-4 | CoffeeDetails priority chain | `CoffeeDetails.tsx` | 1. `roasterBrewGuide.recommendedMethods` → 2. roast-level fallback |
| AC-FN-5 | Seed covers 8-10 products | `prisma/seed.ts` | ≥1 recipe each, ≥3 products have `steps` arrays |

### Regression

| AC | What | How | Pass |
|----|------|-----|------|
| AC-REG-1 | Tests pass | `npm run test:ci` | No regressions |
| AC-REG-2 | Precheck clean | `npm run precheck` | Zero errors |
| AC-REG-3 | Coffee product layout unchanged | Screenshot before seed | Same visual layout |

## Implementation Details

### Commit 1: Schema + types

**`prisma/schema.prisma`** — add to Product model:
```prisma
roasterBrewGuide  Json?
```

**`lib/types/roaster-brew-guide.ts`** — new file with `BrewMethodKey`, `BrewStep`, `BrewRecipe`, `RoasterBrewGuide`, and `BREW_METHOD_LABELS`.

### Commit 2: Slot-based ProductDetailLayout

**New file:** `app/(site)/_components/product/ProductDetailLayout.tsx`

### Commit 3: RoasterBrewGuide + CoffeeDetails refactor

**New file:** `app/(site)/_components/product/RoasterBrewGuide.tsx`

**Modified:** `CoffeeDetails.tsx` — add `roasterBrewGuide` prop, priority chain for "Best For"

**Modified:** `ProductClientPage.tsx` — fill `brewGuide` slot

### Commit 4: Seed data

**`prisma/seed.ts`** — add `roasterBrewGuide` to 8-10 products

## Files Changed (4 modified, 3 new)

| File | Commit | Type |
|------|--------|------|
| `prisma/schema.prisma` | 1 | Modified |
| `lib/types/roaster-brew-guide.ts` | 1 | New |
| `app/(site)/_components/product/ProductDetailLayout.tsx` | 2 | New |
| `app/(site)/products/[slug]/ProductClientPage.tsx` | 2, 3 | Modified |
| `app/(site)/_components/product/CoffeeDetails.tsx` | 3 | Modified |
| `app/(site)/_components/product/RoasterBrewGuide.tsx` | 3 | New |
| `prisma/seed.ts` | 4 | Modified |
