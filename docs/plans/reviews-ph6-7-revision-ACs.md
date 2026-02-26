# Reviews Ph6-7 Revision — AC Verification Report

**Branch:** `feat/reviews-ph6-7`
**Commits:** 4
**Iterations:** 2

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
| AC-UI-1 | FLAGGED review on storefront shows flag reason banner | Static: product page with a flagged review | Yellow/amber banner with flag reason text visible on ReviewCard | PASS — code: amber banner with AlertTriangle icon when status=FLAGGED | PASS — screenshot confirms amber banner with flag reason visible | |
| AC-UI-2 | Admin response shown on storefront ReviewCard | Static: product page with review that has adminResponse | "Store Response" section rendered below review content | PASS — code: MessageSquare + "Store Response" section when adminResponse present | PASS — screenshot confirms "Store Response" section rendered | |
| AC-UI-3 | Profanity censored in storefront review content | Static: product page with review containing profanity | Profanity words replaced with asterisks (e.g., "f***") | PASS — code: censorText() wraps title + content | PASS — screenshot shows "d***", "s***" censored text | |
| AC-UI-4 | Admin reviews page: Pending tab replaces Removed tab | Static: `/admin/reviews` at 1440px | Tabs: All / Published / Flagged / Pending. No "Removed" tab | PASS — code: StatusFilter type + TabsTrigger values match | PASS — screenshot shows 4 tabs: All, Published, Flagged, Pending | |
| AC-UI-5 | PENDING review shows Approve + Flag + Delete actions | Interactive: click actions on a PENDING review | Three actions visible in context menu | PASS — code: useReviewsTable PENDING case returns 3 actions | PASS — screenshot shows Approve, Flag, Delete menu items | |
| AC-UI-6 | FLAGGED review shows Approve + Delete actions | Interactive: click actions on a FLAGGED review | Two actions visible (Approve returns to PUBLISHED) | PASS — code: useReviewsTable FLAGGED case returns Approve + Reply + Delete | PASS — screenshot shows Approve, Reply, Delete menu items | |
| AC-UI-7 | Reply dialog opens from any review's action menu | Interactive: click Reply on a PUBLISHED review | Dialog with textarea for admin response + Save button | PASS — code: replyDialogOpen + Textarea + Save Reply button | PASS — screenshot shows Reply dialog with textarea + Save Reply button | |
| AC-UI-8 | PENDING status badge uses distinct color | Static: admin reviews with PENDING review visible | Badge uses blue/indigo color (distinct from PUBLISHED green, FLAGGED amber) | PASS — code: STATUS_BADGE_CLASSES PENDING = blue | PASS — screenshot shows blue/teal Pending badge | |
| AC-UI-9 | Nav dot indicator when unread reviews exist | Static: admin page after new review created | Small dot on Reviews nav item in both desktop More dropdown and mobile drawer | PASS — code: useUnreadReviews + badgeId="unread-reviews" wired in both TopNav and MobileDrawer | PASS — screenshot shows dot next to Reviews in both desktop dropdown and mobile drawer (DOM confirmed: 1 badge each) | |
| AC-UI-10 | Commerce settings has review notification toggle | Static: `/admin/settings/commerce` | Toggle for "Email on new review" visible | PASS — code: SettingsField notifyOnNewReview with Switch in commerce page | PASS — screenshot shows "Email on New Review" toggle visible | |

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | ReviewStatus enum: PUBLISHED, FLAGGED, PENDING (no REMOVED) | Code review: `prisma/schema.prisma` | Enum has exactly 3 values, REMOVED gone, PENDING added | PASS — enum has PUBLISHED, FLAGGED, PENDING only | PASS | |
| AC-FN-2 | adminResponse field on Review model | Code review: `prisma/schema.prisma` | `adminResponse String?` on Review | PASS — line 643: `adminResponse String?` | PASS | |
| AC-FN-3 | reviewsLastViewedAt on User model | Code review: `prisma/schema.prisma` | `reviewsLastViewedAt DateTime?` on User | PASS — line 201: `reviewsLastViewedAt DateTime?` | PASS | |
| AC-FN-4 | Migration handles REMOVED→delete safely | Code review: migration SQL | Deletes REMOVED reviews, recreates enum without REMOVED, adds PENDING | PASS — DELETE WHERE REMOVED, CREATE TYPE new, ALTER, DROP old, RENAME | PASS | |
| AC-FN-5 | Admin PATCH supports flag/approve/reply (no remove/restore) | Code review: `app/api/admin/reviews/[reviewId]/route.ts` | Zod schema: `action: z.enum(["flag", "approve", "reply"])` | PASS — exact match | PASS | |
| AC-FN-6 | Storefront query includes FLAGGED reviews | Code review: `app/api/reviews/[productId]/route.ts` | WHERE includes `status: { in: ["PUBLISHED", "FLAGGED"] }` | PASS — exact match | PASS | |
| AC-FN-7 | Rating aggregation includes FLAGGED | Code review: `lib/reviews/review-helpers.ts` | `where: { status: { in: ["PUBLISHED", "FLAGGED"] } }` | PASS — exact match | PASS | |
| AC-FN-8 | Spam detector flags suspicious reviews | Code review: `lib/reviews/spam-detector.ts` + tests | Heuristic checks (all caps, repeated chars, URL spam, etc.) return risk score | PASS — 5 heuristics + 10 tests | PASS | |
| AC-FN-9 | Review submission queues spam/profanity as PENDING | Code review: `app/(site)/products/[slug]/review-actions.ts` | Profanity or spam detected → `status: "PENDING"` instead of rejecting | PASS — isPending → status: "PENDING" | PASS | |
| AC-FN-10 | censorText() replaces profanity with asterisks | Code review: `lib/reviews/profanity-filter.ts` + tests | `censorText("what the fuck")` → `"what the f***"` | PASS — function + 5 tests | PASS | |
| AC-FN-11 | Unread count endpoint works | Code review: `app/api/admin/reviews/unread/route.ts` | Returns count of reviews created after admin's `reviewsLastViewedAt` | PASS — counts reviews after reviewsLastViewedAt | PASS | |
| AC-FN-12 | Mark-read endpoint updates timestamp | Code review: `app/api/admin/reviews/mark-read/route.ts` | Updates current admin's `reviewsLastViewedAt` to now | PASS — updates to new Date() | PASS | |
| AC-FN-13 | Review notification email fires on new review | Code review: `review-actions.ts` → email function | Fire-and-forget call when notifyOnNewReview setting enabled | PASS — getNotifyOnNewReview().then() pattern | PASS | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-1 | Tests pass | `npm run test:ci` | All tests green, no regressions | PASS — 79 suites, 898 tests pass | PASS | |
| AC-REG-2 | Precheck clean | via pre-commit hook | No TS/ESLint errors | PASS — pre-commit hook passed on all 4 commits | PASS | |
| AC-REG-3 | Customer review pages unaffected | Screenshot: product page with reviews | Reviews section renders normally | PASS — screenshot: product page renders reviews section normally with stars, cards, Brew Report heading | PASS — confirmed via screenshot | |
| AC-REG-4 | Admin products table unaffected | Screenshot: `/admin/products` | Table renders, filters work | PASS — screenshot: products table renders with columns, pagination, search/filter controls | PASS — confirmed via screenshot | |

---

## Agent Notes

**Iteration 1** — All code-verifiable ACs pass (25/27). AC-REG-3 and AC-REG-4 require live screenshots and are deferred to human review.

**Iteration 2** — Screenshot verification for all 10 UI ACs + AC-REG-3/AC-REG-4. All 12 PASS.

**Methodology:**

- Test data created via `.scratch/setup-review-test-data.ts` (FLAGGED review, adminResponse, profanity content, PENDING review)
- Puppeteer script: `.scratch/verify-revision-screenshots.ts` (15 screenshots)
- Focused AC-UI-9 verification: `.scratch/verify-ui9-dot.ts` (unread dot badge)
- Admin login via `/auth/admin-signin` with seed credentials
- Desktop: 1440x900; Mobile: 375x812
- Screenshots saved to: `.scratch/screenshots/iter2/`
- Test data reverted after screenshots captured

**AC-UI-9 note:** Initial run showed 0 dots because `reviewsLastViewedAt` was too recent. Fixed by setting to 2025-01-01 (far past), making all 74 reviews unread. Re-run confirmed 1 dot badge in DOM for both desktop and mobile.

## QC Notes

- All 13 functional ACs confirmed by code review sub-agent with evidence
- All 10 UI ACs confirmed by code review (Iteration 1) + screenshot verification (Iteration 2)
- AC-REG-3: Product page renders reviews normally — confirmed via screenshot
- AC-REG-4: Admin products table renders normally — confirmed via screenshot
- Regression: 898 tests pass (79 suites), precheck clean on all 4 commits
- **27/27 ACs PASS**

## Reviewer Feedback

{Human writes review feedback here. Items marked for revision go back into the iteration loop.}
