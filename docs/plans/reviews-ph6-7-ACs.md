# Reviews Phase 6-7 — AC Verification Report

**Branch:** `feat/reviews-ph6-7`
**Commits:** 6
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
| AC-UI-1 | Admin "More" dropdown shows Reviews under Management (after Newsletter, before Support) | Static: desktop viewport, navigate to `/admin/reviews` | "Reviews" visible between Newsletter and Support, active state highlighted | PASS — More dropdown shows Management > All Users, Newsletter, Reviews (highlighted), Support. Order correct, active state visible. | PASS — confirmed via screenshot | |
| AC-UI-2 | Mobile nav shows Reviews in Management group | Static: 375px viewport, open mobile nav | Reviews appears between Newsletter and Support | PASS — Mobile nav at 375px shows Management expanded with All Users, Newsletter, Reviews (highlighted bg), Support in order. | PASS — confirmed via screenshot | |
| AC-UI-3 | Breadcrumb shows Home > Management > Reviews | Static: `/admin/reviews` | Breadcrumb trail rendered correctly | PASS — Breadcrumb renders: home icon > Management > Reviews. | PASS — confirmed via screenshot | |
| AC-UI-4 | Tab bar renders All / Published / Flagged / Removed | Static: `/admin/reviews` at 1440px | Four tabs visible, "All" active by default | PASS — Four tabs visible: All, Published, Flagged, Removed. "All" has active styling (underline). | PASS — confirmed via screenshot | |
| AC-UI-5 | Desktop table renders correct columns in order | Static: `/admin/reviews` at 1440px | Columns L→R: Date, Customer, Product, Content, Rating (★), Status, Actions | PASS — Headers L-R: Date, Customer, Product, Content, star, Status, (actions col with per-row ... menu). All 7 columns present in correct order. | PASS — confirmed via screenshot | |
| AC-UI-6 | Mobile shows review cards (not table) | Static: `/admin/reviews` at 375px | Cards with rating, status, product, customer, content, brew info, actions | PASS — Mobile renders cards (table hidden via `hidden md:block`). Cards show star rating, status badge, product name, customer + email, title, content, tasting notes, and ... action menu. | PASS — confirmed via screenshot | |
| AC-UI-7 | Mobile action bar: search + filter icons + review count, no pagination | Static: 375px | Icon buttons on left, "Reviews: N" on right, no page controls | PASS — After fix: search icon + filter icon on left, "74 Reviews" on right, no pagination controls visible at 375px. | PASS — fixed in cf93f02, re-verified via screenshot | |
| AC-UI-8 | Content cell hover shows detail card | Interactive: hover over Content cell on desktop | HoverCard with full content, brew method, tasting notes, recipe strip | PASS — HoverCard appears on hover showing: title in quotes, full review text, tasting notes (Blueberry, Bergamot). Brew method and recipe strip not present on this particular review but component supports them per code. | PASS — confirmed via screenshot + code review | |
| AC-UI-9 | Date column sorts (default desc) | Interactive: click Date header | Toggles asc/desc/unsorted with arrow indicator; newest first by default | PASS — Default: down-arrow on Date, newest first (3 days ago). 1st click: up/down arrows (unsorted indicator). 2nd click: up-arrow (asc), oldest first (3 months ago). Arrow indicators change correctly. | PASS — confirmed via screenshot | |
| AC-UI-10 | Date range filter with presets + calendar picker | Interactive: select date filter, choose "Last 7 days" | Table filters to reviews within date range | PASS — "..." opens type selector (None, Dates, Rating). Selecting Dates shows calendar icon + "Select range" dropdown. Presets: Pick a range, Last 7 days, Current month, Last 90 days, Last 6 months. "Last 7 days" filters to 6 reviews, count updates to "6 Reviews". | PASS — confirmed via screenshot | |
| AC-UI-11 | Star rating filter (multiSelect with ★ labels) | Interactive: switch to rating filter, check ★★★★★ | Table filters to 5-star reviews only | PASS — Rating filter shows "Select..." popover with 5 checkbox options (5-star through 1-star with star symbols). Checking 5-star: checkbox fills, shell shows "1 selected", table filters to 32 5-star reviews. All visible rows show 5 stars. | PASS — confirmed via screenshot | |
| AC-UI-12 | Flag action opens reason dialog | Interactive: click Flag on a PUBLISHED review | Dialog with reason textarea + confirm button appears | PASS — Action menu shows Flag + Remove for PUBLISHED review. Clicking Flag opens Dialog: title "Flag Review", description about hiding from storefront, textarea "Reason for flagging...", Cancel + "Flag Review" buttons. | PASS — confirmed via screenshot | |
| AC-UI-13 | Remove action shows confirmation | Interactive: click Remove on a review | AlertDialog with warning text appears | PASS — Clicking Remove opens AlertDialog: title "Remove Review", warning "This will remove the review from the storefront. The review can be restored later.", Cancel + "Remove" (red) buttons. | PASS — confirmed via screenshot | |

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | Admin GET API returns reviews with product + user data | Code review: `app/api/admin/reviews/route.ts` | Returns `{ reviews, total }` with nested product.name/slug and user.name/email | PASS — route.ts:12-20 includes product(name,slug) + user(name,email,image), returns `{ reviews, total }` | PASS — confirmed | |
| AC-FN-2 | Admin API requires auth | Code review: both admin review API routes | `requireAdminApi()` guards all endpoints; returns 403 for non-admins | PASS — requireAdminApi() called in GET (route.ts:6), PATCH ([reviewId]/route.ts:16), DELETE ([reviewId]/route.ts:75); all return 403 | PASS — confirmed | |
| AC-FN-3 | Flag stores reason and updates status | Code review: `app/api/admin/reviews/[reviewId]/route.ts` | PATCH `{ action: "flag", reason }` → status=FLAGGED, flagReason set | PASS — [reviewId]/route.ts:36-40 sets status=FLAGGED, flagReason=reason | PASS — confirmed | |
| AC-FN-4 | Restore resets to PUBLISHED | Code review: same file | PATCH `{ action: "restore" }` → status=PUBLISHED, flagReason cleared | PASS — [reviewId]/route.ts:41-45 sets status=PUBLISHED, flagReason=null | PASS — confirmed | |
| AC-FN-5 | Remove sets REMOVED status | Code review: same file | PATCH `{ action: "remove" }` → status=REMOVED | PASS — [reviewId]/route.ts:46-50 sets status=REMOVED | PASS — confirmed | |
| AC-FN-6 | Hard delete removes from DB | Code review: same file | DELETE removes review record entirely | PASS — [reviewId]/route.ts:92 prisma.review.delete | PASS — confirmed | |
| AC-FN-7 | Status changes recompute product rating | Code review: same file | `updateProductRatingSummary()` called after every flag/restore/remove/delete | PASS — called at line 53 (PATCH) and line 93 (DELETE); helper aggregates only PUBLISHED reviews | PASS — confirmed | |
| AC-FN-8 | flagReason schema field exists | Code review: `prisma/schema.prisma` | `flagReason String?` on Review model, migration applied | PASS — schema.prisma:641 `flagReason String?` on Review model | PASS — confirmed | |
| AC-FN-9 | DateRange filter type works in DataTableFilter | Code review: `DataTableFilter.tsx` | `DateRangeFilterContent` registered, presets compute correct date ranges, calendar picker sets custom range | PASS — FILTER_RENDERERS:294 registers dateRange; DATE_PRESETS:176-182 with last7/currentMonth/last90/last6mo; calendar picker:219-229 sets custom range | PASS — confirmed | |
| AC-FN-10 | Email template renders products with CTAs | Code review: `emails/ReviewRequestEmail.tsx` | Template shows product images, names, "Write a Brew Report" buttons linking to `/products/{slug}#reviews` | PASS — template:51-72 maps products with Img, name Text, Button href=`/products/{slug}#reviews` | PASS — confirmed | |
| AC-FN-11 | Send function calls Resend | Code review: `lib/email/send-review-request.ts` | Uses `resend.emails.send()` with rendered React Email template | PASS — send-review-request.ts:23 calls resend.emails.send() with rendered html from ReviewRequestEmail | PASS — confirmed | |
| AC-FN-12 | Cron requires CRON_SECRET auth | Code review: `app/api/cron/review-emails/route.ts` | Bearer token check; returns 401 on missing/invalid secret | PASS — route.ts:10-15 checks Bearer token against CRON_SECRET, returns 401 | PASS — confirmed | |
| AC-FN-13 | Cron finds eligible orders correctly | Code review: same file | Queries orders: status=SHIPPED, shippedAt past delay, no ReviewEmailLog, user has no review for product | PASS — route.ts:44-82 queries SHIPPED + shippedAt < cutoff + excludes logged orders; lines 104-121 check existing review per product+user | PASS — confirmed | |
| AC-FN-14 | Cron logs to prevent duplicates | Code review: same file | Creates ReviewEmailLog entry per user+product after sending | PASS — route.ts:158-166 creates ReviewEmailLog per [orderId,userId,productId]; also logs skipped orders at 129-147 | PASS — confirmed | |
| AC-FN-15 | Cron respects reviews.enabled setting | Code review: same file | Checks SiteSettings `reviews.enabled`; early return when disabled | PASS — route.ts:19-29 checks commerce.reviewsEnabled setting, returns early when "false" | PASS — confirmed | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-1 | Tests pass | `npm run test:ci` | All tests green, no regressions | PASS — 78 suites, 883 tests, 0 failures | PASS — confirmed | |
| AC-REG-2 | Precheck clean | via pre-commit hook | No TS/ESLint errors | PASS — tsc clean, eslint 0 errors (1 pre-existing warning in seed file) | PASS — confirmed, fix commit also passes precheck | |
| AC-REG-3 | Customer review pages unaffected | Screenshot: `/products/ethiopian-yirgacheffe` | Reviews section renders normally with stars, cards, sort/filter | PASS — Product page shows "Community Brew Reports (13)" with sort tabs (Most Recent, Most Helpful, Most Detailed), brew method filters (All, Chemex, AeroPress, Pour-over V60), rating summary (4.5 stars, 13 reviews), and individual review cards with stars, tasting notes, and Helpful buttons. No regressions. | PASS — confirmed via screenshot | |
| AC-REG-4 | Products table unaffected by DataTable extension | Screenshot: `/admin/products` | Products table renders, filter works, columns unchanged | PASS — Products table renders at /admin/products with columns: Name, Categories, Add-ons, Variants, Price, Stock. Shows 31 products, pagination working (2 pages), search + filter controls present. No visual regressions from DataTable extension. | PASS — confirmed via screenshot | |

---

## Agent Notes

### Iteration 1 — 2026-02-25

**Scope:** AC-FN-1 through AC-FN-15, AC-REG-1, AC-REG-2 (code review + regression only; UI ACs skipped per instructions).

**Result:** All 17 ACs **PASS**.

**Summary of findings:**

- Admin reviews API (`app/api/admin/reviews/`) correctly implements GET with product+user includes, and PATCH/DELETE with flag/restore/remove/delete actions. All endpoints guarded by `requireAdminApi()`.
- `flagReason` field present on Review model in Prisma schema (line 641). Flag action sets it; restore clears it.
- `updateProductRatingSummary()` called after every status mutation (PATCH and DELETE), re-aggregating only PUBLISHED reviews.
- `DateRangeFilterContent` registered in `FILTER_RENDERERS` with 4 presets (last7, currentMonth, last90, last6mo) plus a calendar picker for custom ranges.
- Review request email template (`emails/ReviewRequestEmail.tsx`) renders product images, names, and "Write a Brew Report" CTA buttons linking to `/products/{slug}#reviews`.
- Send function (`lib/email/send-review-request.ts`) renders the React Email template and calls `resend.emails.send()`.
- Cron endpoint (`app/api/cron/review-emails/route.ts`) checks Bearer token auth, respects `commerce.reviewsEnabled` setting, queries eligible SHIPPED orders past the delay window, excludes already-logged and already-reviewed products, and creates `ReviewEmailLog` entries after sending.
- Regression: 78 test suites / 883 tests all pass. Precheck (tsc + eslint) clean with 0 errors.

**No blockers found.**

### Iteration 2 — 2026-02-25

**Scope:** AC-UI-1 through AC-UI-13, AC-REG-3, AC-REG-4 (UI verification via Puppeteer screenshots).

**Result:** 14 of 15 ACs **PASS**. 1 **FAIL** (AC-UI-7).

**Screenshots saved to:** `.scratch/screenshots/` (28 total screenshots across both runs).

**Methodology:**

- Puppeteer script (`scripts/verify-reviews-ph6-7.ts`) for static and interactive screenshots.
- Second targeted script (`scripts/verify-filters-ph6-7.ts`) for filter interactions requiring precise selectors.
- Admin login via `/auth/admin-signin` with seed credentials.
- Desktop viewport: 1440x900; Mobile viewport: 375x812.

**AC-UI-7 FAIL details:**

- The mobile action bar at 375px correctly collapses search and filter into icon buttons (left side), and shows "74 Reviews" record count (right side).
- However, pagination controls (< 1 2 3 >) and the page-size selector (R/P 25) are also visible on mobile.
- Root cause: `DataTableActionBar.tsx` renders all right-side slots (including `pagination` and `pageSizeSelector`) at all breakpoints. Only `left` slots with `collapse` config get responsive icon-only treatment. The right-side slots have no responsive hiding.
- Fix needed: Either hide pagination/pageSizeSelector below `md` breakpoint in the action bar, or add a responsive collapse config to the `ReviewModerationClient` action bar config for right-side slots.

**Other observations:**

- AC-UI-8: The specific review hovered (Oliver Scott, Ethiopian Yirgacheffe) had tasting notes but no brew method or recipe strip in the hover card. The `ReviewDetailCard` component does render brew method and recipe strip conditionally — they just weren't present on this review. Code confirms the feature is implemented correctly.
- AC-UI-9: Sort behavior uses 3-state cycle: desc (default, down-arrow) → unsorted (up/down arrows) → asc (up-arrow). Data order changes correctly between states.
- AC-UI-11: Rating filter shows 32 reviews for 5-star (not strictly "5-star reviews only" since PUBLISHED+FLAGGED+REMOVED all included in "All" tab), which is correct behavior.

**No other issues found.**

## QC Notes

### Iteration 1 fix — AC-UI-7 (mobile pagination)

**Failed AC:** AC-UI-7 — pagination controls visible on mobile at 375px.

**Root cause:** `ReviewModerationClient` action bar config used `type: "pagination"` and `type: "pageSizeSelector"` slots directly. The `DataTableActionBar` renders right-side slots without responsive hiding.

**Fix (cf93f02):** Changed pagination and pageSizeSelector from typed slots to `custom` slots wrapping components with Tailwind responsive classes:

- `pageSizeSelector` → `hidden lg:block` (hidden below lg)
- `pagination` → `hidden md:block` (hidden below md)

**Re-verification:** Screenshot at 375px confirms only search icon, filter icon, and "74 Reviews" count visible — no pagination controls. PASS.

## Reviewer Feedback

{Human writes review feedback here. Items marked for revision go back into the iteration loop.}
