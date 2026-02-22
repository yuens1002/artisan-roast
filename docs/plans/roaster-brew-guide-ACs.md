# Roaster's Brew Guide — AC Verification Report

**Branch:** `feat/product-reviews-tier1`
**Commits:** 4
**Iterations:** 0

---

## Column Definitions

| Column | Filled by | When |
|--------|-----------|------|
| **Agent** | Verification sub-agent | During `/ac-verify` — PASS/FAIL with brief evidence |
| **QC** | Main thread agent | After reading sub-agent report — confirms or overrides |
| **Reviewer** | Human (reviewer) | During manual review — final approval per AC |

---

## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-1 | "Best For" shows roaster-curated methods | Static: `/products/ethiopian-yirgacheffe` | Shows "V60, Chemex" from brew guide, not roast-level defaults | | | |
| AC-UI-2 | "Best For" falls back for products without guide | Static: product without brew guide | Roast-level methods unchanged | | | |
| AC-UI-3 | Brew Guide section displays | Static: `/products/ethiopian-yirgacheffe` | Methods, recipe details, origin notes, accolades, tasting commentary visible | | | |
| AC-UI-4 | Recipe steps render as table | Static: `/products/ethiopian-yirgacheffe` | Summary line + step table (label, water, time, notes) | | | |
| AC-UI-5 | Brew Guide hidden when no data | Static: product without guide | No empty section | | | |
| AC-UI-6 | Responsive at all breakpoints | 3 breakpoints on `/products/ethiopian-yirgacheffe` | Readable, no overflow | | | |
| AC-UI-7 | Merch page unaffected | Static: merch product | Identical to current | | | |

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | Migration adds `roasterBrewGuide Json?` | Migration SQL | Nullable, non-destructive | | | |
| AC-FN-2 | TypeScript interface complete | `lib/types/roaster-brew-guide.ts` | `recommendedMethods`, `recipes?` (with `steps?`, weights, time), `originNotes?`, `accolades?`, `roasterTastingNotes?` | | | |
| AC-FN-3 | ProductDetailLayout uses named slots | Layout component | Props: `header`, `details?`, `purchaseControls`, `brewGuide?`, `story?`, `addOns?`, `relatedProducts?` | | | |
| AC-FN-4 | CoffeeDetails priority chain | `CoffeeDetails.tsx` | 1. `roasterBrewGuide.recommendedMethods` → 2. roast-level fallback | | | |
| AC-FN-5 | Seed covers 8-10 products | `prisma/seed.ts` | ≥1 recipe each, ≥3 products have `steps` arrays | | | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-1 | Tests pass | `npm run test:ci` | No regressions | | | |
| AC-REG-2 | Precheck clean | `npm run precheck` | Zero errors | | | |
| AC-REG-3 | Coffee product layout unchanged | Screenshot before seed | Same visual layout | | | |

---

## Agent Notes

{Sub-agent writes iteration-specific notes here: blockers, evidence references, screenshots taken.}

## QC Notes

{Main thread writes fix notes here: what failed, what was changed, re-verification results.}

## Reviewer Feedback

{Human writes review feedback here. Items marked for revision go back into the iteration loop.}
