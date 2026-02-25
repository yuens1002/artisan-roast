# Reviews Phase 6-7 — AC Verification Report

**Branch:** `feat/reviews-ph6-7`
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
| AC-UI-1 | Admin "More" dropdown shows Reviews under Management (after Newsletter, before Support) | Static: desktop viewport, navigate to `/admin/reviews` | "Reviews" visible between Newsletter and Support, active state highlighted | | | |
| AC-UI-2 | Mobile nav shows Reviews in Management group | Static: 375px viewport, open mobile nav | Reviews appears between Newsletter and Support | | | |
| AC-UI-3 | Breadcrumb shows Home > Management > Reviews | Static: `/admin/reviews` | Breadcrumb trail rendered correctly | | | |
| AC-UI-4 | Tab bar renders All / Published / Flagged / Removed | Static: `/admin/reviews` at 1440px | Four tabs visible, "All" active by default | | | |
| AC-UI-5 | Desktop table renders correct columns in order | Static: `/admin/reviews` at 1440px | Columns L→R: Date, Customer, Product, Content, Rating (★), Status, Actions | | | |
| AC-UI-6 | Mobile shows review cards (not table) | Static: `/admin/reviews` at 375px | Cards with rating, status, product, customer, content, brew info, actions | | | |
| AC-UI-7 | Mobile action bar: search + filter icons + review count, no pagination | Static: 375px | Icon buttons on left, "Reviews: N" on right, no page controls | | | |
| AC-UI-8 | Content cell hover shows detail card | Interactive: hover over Content cell on desktop | HoverCard with full content, brew method, tasting notes, recipe strip | | | |
| AC-UI-9 | Date column sorts (default desc) | Interactive: click Date header | Toggles asc/desc/unsorted with arrow indicator; newest first by default | | | |
| AC-UI-10 | Date range filter with presets + calendar picker | Interactive: select date filter, choose "Last 7 days" | Table filters to reviews within date range | | | |
| AC-UI-11 | Star rating filter (multiSelect with ★ labels) | Interactive: switch to rating filter, check ★★★★★ | Table filters to 5-star reviews only | | | |
| AC-UI-12 | Flag action opens reason dialog | Interactive: click Flag on a PUBLISHED review | Dialog with reason textarea + confirm button appears | | | |
| AC-UI-13 | Remove action shows confirmation | Interactive: click Remove on a review | AlertDialog with warning text appears | | | |

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | Admin GET API returns reviews with product + user data | Code review: `app/api/admin/reviews/route.ts` | Returns `{ reviews, total }` with nested product.name/slug and user.name/email | | | |
| AC-FN-2 | Admin API requires auth | Code review: both admin review API routes | `requireAdminApi()` guards all endpoints; returns 403 for non-admins | | | |
| AC-FN-3 | Flag stores reason and updates status | Code review: `app/api/admin/reviews/[reviewId]/route.ts` | PATCH `{ action: "flag", reason }` → status=FLAGGED, flagReason set | | | |
| AC-FN-4 | Restore resets to PUBLISHED | Code review: same file | PATCH `{ action: "restore" }` → status=PUBLISHED, flagReason cleared | | | |
| AC-FN-5 | Remove sets REMOVED status | Code review: same file | PATCH `{ action: "remove" }` → status=REMOVED | | | |
| AC-FN-6 | Hard delete removes from DB | Code review: same file | DELETE removes review record entirely | | | |
| AC-FN-7 | Status changes recompute product rating | Code review: same file | `updateProductRatingSummary()` called after every flag/restore/remove/delete | | | |
| AC-FN-8 | flagReason schema field exists | Code review: `prisma/schema.prisma` | `flagReason String?` on Review model, migration applied | | | |
| AC-FN-9 | DateRange filter type works in DataTableFilter | Code review: `DataTableFilter.tsx` | `DateRangeFilterContent` registered, presets compute correct date ranges, calendar picker sets custom range | | | |
| AC-FN-10 | Email template renders products with CTAs | Code review: `emails/ReviewRequestEmail.tsx` | Template shows product images, names, "Write a Brew Report" buttons linking to `/products/{slug}#reviews` | | | |
| AC-FN-11 | Send function calls Resend | Code review: `lib/email/send-review-request.ts` | Uses `resend.emails.send()` with rendered React Email template | | | |
| AC-FN-12 | Cron requires CRON_SECRET auth | Code review: `app/api/cron/review-emails/route.ts` | Bearer token check; returns 401 on missing/invalid secret | | | |
| AC-FN-13 | Cron finds eligible orders correctly | Code review: same file | Queries orders: status=SHIPPED, shippedAt past delay, no ReviewEmailLog, user has no review for product | | | |
| AC-FN-14 | Cron logs to prevent duplicates | Code review: same file | Creates ReviewEmailLog entry per user+product after sending | | | |
| AC-FN-15 | Cron respects reviews.enabled setting | Code review: same file | Checks SiteSettings `reviews.enabled`; early return when disabled | | | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-1 | Tests pass | `npm run test:ci` | All tests green, no regressions | | | |
| AC-REG-2 | Precheck clean | via pre-commit hook | No TS/ESLint errors | | | |
| AC-REG-3 | Customer review pages unaffected | Screenshot: `/products/ethiopian-yirgacheffe` | Reviews section renders normally with stars, cards, sort/filter | | | |
| AC-REG-4 | Products table unaffected by DataTable extension | Screenshot: `/admin/products` | Products table renders, filter works, columns unchanged | | | |

---

## Agent Notes

{Sub-agent writes iteration-specific notes here: blockers, evidence references, screenshots taken.}

## QC Notes

{Main thread writes fix notes here: what failed, what was changed, re-verification results.}

## Reviewer Feedback

{Human writes review feedback here. Items marked for revision go back into the iteration loop.}
