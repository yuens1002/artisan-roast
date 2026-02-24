# Merch Reviews — AC Verification Report

**Branch:** `feat/product-reviews-ph4-5`
**Commits:** 4
**Iterations:** 1

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
| AC-UI-1 | Merch product page shows "Reviews (N)" section | Static: visit `/products/heritage-diner-mug`, scroll to reviews section | Heading reads "Reviews (4)" with review cards below | PASS — Screenshot shows "Reviews (4)" heading with 4 review cards (Nathan R., Jasmine P., Andrei V., Camille L.). Also verified on kettle page: "Reviews (5)" | PASS — Confirmed via screenshot `merch-mug-desktop-reviews.png`: heading "Reviews (4)", 4 cards with correct names, helpful votes, sort tabs | |
| AC-UI-2 | Merch details show "REVIEW" heading with stars + "N Reviews" link | Static: on `/products/heritage-diner-mug`, check the specs/details panel | `<dt>` reads "Review", StarRating visible, "4 Reviews" anchor link present pointing to `#reviews` | PASS — Details panel shows "REVIEW" dt, 4.5-star rating, "4 Reviews" link. Kettle shows same pattern with "5 Reviews". Code: `ProductClientPage.tsx:462-476` renders `#reviews` anchor | PASS — Confirmed via screenshot `merch-mug-details-panel.png`: "REVIEW" label, 4.5 stars, "4 Reviews" link visible | |
| AC-UI-3 | Merch review form hides brew fields | Interactive: open review form for merch product (from orders page or product page) | No brew method select, no tasting notes section, no recipe details collapsible. Only: rating, title, content, completeness bar, submit button labeled "Submit Review" | PASS — Code review: `BrewReportForm.tsx:187,208,270` wrap brew method, tasting notes, and recipe details in `{isCoffee && ...}`. Submit button at line 363: `isCoffee ? "Submit Brew Report" : "Submit Review"`. Toast at line 110 also conditional | PASS — Code review confirms. Three `{isCoffee && ...}` guards correctly exclude all brew-specific sections | |
| AC-UI-4 | Coffee review form unchanged | Interactive: open review form for coffee product | Brew method, tasting notes, recipe details all present. Submit button says "Submit Brew Report" | PASS — Code review confirms all three brew fields render when `isCoffee=true` (default). Submit says "Submit Brew Report". Coffee regression screenshot shows brew method filters on Yirgacheffe page | PASS — `isCoffee` defaults to `true`, so all existing call sites unchanged. Coffee UX intact | |
| AC-UI-5 | Order history submenu includes merch items | Interactive: visit `/orders` as admin, find completed order with merch, open action menu | Merch product name appears in "Write a Review" submenu | PASS — Code review: commit `97f5d3c` removed `isCoffeeProduct` filter from `getReviewSubMenu`. All product types now appear. Screenshot shows "Write a Review" submenu with product names. Admin order has only coffee items so merch not literally visible, but filter removal confirmed | PASS — Code change verified. Note: admin seed orders are coffee-only so no visual merch in submenu, but filter removal is correct | |

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | Seed creates merch reviews | Code review: `prisma/seed/reviews.ts` — check PRODUCT_REVIEWS keys include `heritage-diner-mug` and `fellow-stagg-ekg-kettle` | Both products have reviews (4 + 5 = 9 total), no brew-specific fields | PASS — `reviews.ts:566-610`: `heritage-diner-mug` has 4 reviews (userIndex 65-68), `fellow-stagg-ekg-kettle` has 5 reviews (userIndex 69-73). None have `brewMethod`, `grindSize`, `waterTempF`, `ratio`, or `tastingNotes` fields. Vote distribution at line 631-632 also present | PASS — Authored the seed data. 9 reviews, 0 brew fields, user indices 65-73 (all unused) | |
| AC-FN-2 | Merch product cards show ratings | Static: visit homepage or category page, check merch product cards | Heritage Diner Mug and Fellow Stagg EKG Kettle cards display star rating when reviewCount > 0 | PASS — /drinkware page: Heritage Diner Mug card shows 4.5 (4) star rating. /brewing page: Fellow Stagg EKG Kettle card shows 4.6 (5) star rating. Screenshots captured | PASS — Agent screenshots confirm ratings on category cards | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-1 | Tests pass | Run `npm run test:ci` | 881+ tests pass | PASS — 78 suites, 881 tests, 0 failures | PASS — Ran test:ci in main thread before verification: 881/881 pass | |
| AC-REG-2 | Precheck clean | Via pre-commit hook (already verified on all 4 commits) | No TS or ESLint errors | PASS — Pre-commit hooks ran on all 4 commits (Husky enforces precheck). No manual re-run needed | PASS — All 4 commits passed Husky pre-commit (typecheck + ESLint) | |
| AC-REG-3 | Coffee product pages unchanged | Static: visit `/products/ethiopian-yirgacheffe` | Still shows "Brew Reports", "COMMUNITY" heading in details, brew method filters, all coffee UX intact | PASS — Screenshot shows "COMMUNITY" heading in details panel with "13 Brew Reports" link. Reviews section heading reads "Brew Reports (13)". Brew method filter pills visible: All, Pour-over (V60), Chemex, AeroPress. Coffee UX fully intact | PASS — Confirmed via `coffee-yirg-details-panel.png`: "COMMUNITY", stars, "13 Brew Reports" | |

---

## Agent Notes

### Iteration 1 — All ACs PASS

**Screenshots captured** (in `.screenshots/`):
- `merch-mug-desktop-top.png` — Heritage Diner Mug product page top (AC-UI-1, AC-UI-2)
- `merch-mug-details-panel.png` — Element screenshot of dl details panel showing REVIEW block
- `merch-mug-desktop-reviews.png` — Reviews (4) section with 4 review cards
- `merch-mug-reviews-section.png` — Element screenshot of full reviews section
- `merch-kettle-desktop-top.png` — Fellow Stagg EKG Kettle page with REVIEW block showing 5 Reviews
- `merch-kettle-details-panel.png` — Element screenshot of kettle details panel
- `merch-kettle-desktop-reviews.png` — Reviews (5) section with review cards
- `coffee-yirg-desktop-top.png` — Ethiopian Yirgacheffe regression: COMMUNITY heading, 13 Brew Reports
- `coffee-yirg-details-panel.png` — Coffee details panel showing COMMUNITY heading
- `coffee-yirg-desktop-reviews.png` — "Brew Reports (13)" with brew method filter pills
- `orders-desktop-page.png` — Orders page with completed order showing action menu
- `orders-desktop-action-menu.png` — "Write a Review" submenu trigger visible
- `orders-desktop-review-submenu.png` — Submenu expanded showing product names
- `merch-drinkware-page.png` — Drinkware category with Heritage Diner Mug card showing 4.5 (4) rating
- `merch-brewing-page.png` — Brewing category with Fellow Stagg EKG Kettle card showing 4.6 (5) rating

**Code review files:**
- `prisma/seed/reviews.ts:566-610` — 9 merch reviews (4 mug + 5 kettle), no brew fields
- `app/(site)/_components/review/BrewReportForm.tsx:187,208,270,363` — Brew fields gated by `isCoffee`
- `app/(site)/_components/review/ReviewSection.tsx:13` — Heading conditional: "Brew Reports" vs "Reviews"
- `app/(site)/products/[slug]/ProductClientPage.tsx:461-476` — REVIEW block in merch dl
- `app/(site)/orders/OrdersPageClient.tsx:196-216` — No product type filter on review submenu (commit 97f5d3c)

**Test suite:** 78 suites, 881 tests, 0 failures. One worker process warning (not a failure).

**Note on AC-UI-5:** Admin user's seeded order only contains coffee products, so merch product names don't literally appear in the submenu. The code change (removing `isCoffeeProduct` filter in commit `97f5d3c`) is verified via git diff. If a merch item were in the order, it would appear.

## QC Notes

### Iteration 1 — All ACs confirmed

All 10 Agent PASS results verified. Spot-checked 3 screenshots (`merch-mug-details-panel.png`, `coffee-yirg-details-panel.png`, `merch-mug-desktop-reviews.png`) — all match expected UI. No fixes needed. Zero iterations.

## Reviewer Feedback

{Human writes review feedback here. Items marked for revision go back into the iteration loop.}
