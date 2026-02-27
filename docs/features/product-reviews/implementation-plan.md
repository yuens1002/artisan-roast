# Product Reviews & Ratings — Implementation Plan

> **Status:** Planned
> **Priority:** Tier 1 Gap #2 (see `docs/internal/feature-gap-analysis.md`)
> **Date:** 2026-02-17

---

## Context

Product reviews/ratings is Tier 1 gap #2 in the feature gap analysis. WooCommerce, BigCommerce, and Squarespace all have built-in reviews. Coffee buyers rely heavily on social proof. We need: verified-purchase reviews with profanity filtering, star ratings on product cards + detail pages, admin moderation, and review request emails.

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Eligibility | Verified purchase only (SHIPPED/PICKED_UP orders) |
| Moderation | Auto-publish with server-side profanity filter; admin can flag/delete |
| Rating display | Product cards (compact) + detail page (full section) |
| Duplicate prevention | One review per user per product (`@@unique`) |
| Rating performance | Denormalized `averageRating`/`reviewCount` on Product model |
| Review email | Cron-based, N days after ship (configurable in settings) |
| Profanity | Reject with message (not mask) — curated word list + regex word boundaries |

---

## Phase 1: Foundation (Schema + Core Logic)

### 1a. Prisma schema changes

**File:** `prisma/schema.prisma`

Add `Review` model:

```prisma
model Review {
  id        String       @id @default(cuid())
  rating    Int          // 1-5
  title     String?
  content   String
  status    ReviewStatus @default(PUBLISHED)
  productId String
  userId    String
  orderId   String
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@unique([productId, userId])
  @@index([productId, status, createdAt])
}

enum ReviewStatus { PUBLISHED  FLAGGED  DELETED }
```

Add `ReviewEmailLog` model (prevent duplicate emails):

```prisma
model ReviewEmailLog {
  id      String   @id @default(cuid())
  orderId String
  userId  String
  sentAt  DateTime @default(now())
  order   Order    @relation(...)
  user    User     @relation(...)
  @@unique([orderId, userId])
}
```

Add to `Product` model:

- `averageRating Float?` — null = no reviews
- `reviewCount Int @default(0)`
- `reviews Review[]`

Add `reviews Review[]` and `reviewEmailLogs ReviewEmailLog[]` relations to `User` and `Order`.

Migration: `npx prisma migrate dev --name add-product-reviews`

### 1b. Profanity filter

**New file:** `lib/reviews/profanity-filter.ts`

- Curated word list (~50-80 common English profanity words)
- Regex with `\b` word boundaries to avoid false positives (e.g., "class" != "ass")
- `checkProfanity(text): { hasProfanity: boolean; matchedWords: string[] }`
- Case-insensitive

### 1c. Review helpers

**New file:** `lib/reviews/review-helpers.ts`

- `getVerifiedPurchaseOrderId(userId, productId)` — queries Order -> OrderItem -> PurchaseOption -> ProductVariant chain where status is SHIPPED/PICKED_UP
- `updateProductRatingSummary(productId)` — aggregates published reviews, updates Product's `averageRating`/`reviewCount`

### 1d. Tests

- **New file:** `lib/reviews/__tests__/profanity-filter.test.ts` — detects profanity, no false positives, case insensitive
- **New file:** `lib/reviews/__tests__/review-helpers.test.ts` — verified purchase logic, rating summary computation

---

## Phase 2: Settings

### 2a. App settings

**File:** `lib/config/app-settings.ts`

- Add `REVIEWS_ENABLED: "reviews.enabled"` + `REVIEW_EMAIL_DELAY_DAYS: "reviews.emailDelayDays"`
- Add getter/setter functions (same pattern as `getAllowPromoCodes`)

### 2b. Settings API

**New file:** `app/api/admin/settings/reviews/route.ts`

- GET -> `{ enabled, emailDelayDays }`
- PUT -> validates + upserts
- `requireAdmin()` guard

### 2c. Commerce settings page

**File:** `app/admin/settings/commerce/page.tsx`

- Add "Product Reviews" `SettingsSection` with:
  - `Switch` toggle for enable/disable
  - Number input for email delay days (default: 7)

---

## Phase 3: Review Submission

### 3a. Server action

**New file:** `app/(site)/products/[slug]/review-actions.ts`

- `submitReview(data)` — Zod validated, checks: auth -> verified purchase -> no duplicate -> profanity filter -> create review -> update summary -> revalidatePath
- Returns `{ success, error?, reviewId? }`

### 3b. Public reviews API

**New file:** `app/api/reviews/[productId]/route.ts`

- GET with pagination (`?page=1&limit=10`)
- Only returns `status: PUBLISHED` reviews
- Includes user name (first name + last initial for privacy)
- No auth required

### 3c. Tests

- **New file:** `app/(site)/products/[slug]/__tests__/review-actions.test.ts`

---

## Phase 4: UI Components

### 4a. Star components

- **New file:** `app/(site)/_components/product/StarRating.tsx` — read-only star display (filled/half/empty SVGs, yellow-400)
- **New file:** `app/(site)/_components/product/RatingSummary.tsx` — `StarRating` + "4.5 (42 reviews)", `compact` prop for cards
- **New file:** `app/(site)/_components/review/StarRatingInput.tsx` — interactive star picker with hover/click

### 4b. Review display

- **New file:** `app/(site)/_components/review/ReviewCard.tsx` — user avatar/initial, name, stars, title, content, date
- **New file:** `app/(site)/_components/review/ReviewList.tsx` — paginated list with "Load More", fetches from `/api/reviews/{productId}`
- **New file:** `app/(site)/_components/review/ReviewForm.tsx` — star picker + title + textarea + submit button; shows auth/purchase gating messages; uses `submitReview` server action + `useToast`

---

## Phase 5: Product Integration

### 5a. Product cards

**File:** `app/(site)/_components/product/ProductCard.tsx`

- Add `<RatingSummary compact />` below product title (only when `reviewCount > 0`)
- Fields auto-included since they're scalar on Product model

### 5b. Product detail page

**File:** `app/(site)/products/[slug]/page.tsx`

- Fetch initial reviews (first page) + `reviewsEnabled` setting
- Pass to `ProductClientPage`

**File:** `app/(site)/products/[slug]/ProductClientPage.tsx`

- Add `RatingSummary` (full) near product name
- Add reviews section with `id="reviews"` anchor (for email deep links)
- Contains: section heading, `RatingSummary`, `ReviewForm`, `ReviewList`
- Gated by `reviewsEnabled` prop

---

## Phase 6: Admin Moderation

### 6a. Admin API

- **New file:** `app/api/admin/reviews/route.ts` — GET all reviews (any status), admin-only, filterable
- **New file:** `app/api/admin/reviews/[reviewId]/route.ts` — PATCH (flag/restore/delete), DELETE (hard delete); updates product summary

### 6b. Admin page

- **New file:** `app/admin/reviews/page.tsx` — server component, `requireAdmin()`
- **New file:** `app/admin/reviews/ReviewModerationClient.tsx` — follows `OrderManagementClient` pattern: tab filters (All/Published/Flagged/Deleted), table with product/customer/rating/content/date/status/actions, mobile `MobileRecordCard`, dialog confirmations

### 6c. Admin nav

**File:** `lib/config/admin-nav.ts` (or equivalent)

- Add "Reviews" link under Orders group

---

## Phase 7: Review Request Email

### 7a. Email template

**New file:** `emails/ReviewRequestEmail.tsx`

- Subject: "How was your coffee? Leave a review!"
- Lists purchased products with "Write a Review" CTA buttons -> `/products/{slug}#reviews`
- Follows existing React Email component patterns

### 7b. Send function

**New file:** `lib/email/send-review-request.ts`

- `sendReviewRequest({ customerEmail, customerName, orderNumber, products, storeName })`
- Same pattern as `send-order-confirmation.ts`

### 7c. Cron endpoint

**New file:** `app/api/cron/review-emails/route.ts`

- Authorized by `CRON_SECRET` env var
- Queries orders: `status = SHIPPED`, `shippedAt < now - N days`, no `ReviewEmailLog` entry
- Sends emails in batches, logs to `ReviewEmailLog`
- Checks `reviews.enabled` setting before sending
- Add `CRON_SECRET` to `.env.example`

---

## File Summary

### Files Modified (existing)

1. `prisma/schema.prisma` — Review, ReviewEmailLog models + Product/User/Order relations
2. `lib/config/app-settings.ts` — reviews settings getters/setters
3. `app/admin/settings/commerce/page.tsx` — reviews toggle + email delay
4. `app/(site)/_components/product/ProductCard.tsx` — rating summary on cards
5. `app/(site)/products/[slug]/page.tsx` — fetch reviews + setting
6. `app/(site)/products/[slug]/ProductClientPage.tsx` — reviews section
7. Admin nav config — add Reviews link

### Files Created (new)

1. `lib/reviews/profanity-filter.ts`
2. `lib/reviews/review-helpers.ts`
3. `lib/reviews/__tests__/profanity-filter.test.ts`
4. `lib/reviews/__tests__/review-helpers.test.ts`
5. `app/api/admin/settings/reviews/route.ts`
6. `app/(site)/products/[slug]/review-actions.ts`
7. `app/(site)/products/[slug]/__tests__/review-actions.test.ts`
8. `app/api/reviews/[productId]/route.ts`
9. `app/(site)/_components/product/StarRating.tsx`
10. `app/(site)/_components/product/RatingSummary.tsx`
11. `app/(site)/_components/review/StarRatingInput.tsx`
12. `app/(site)/_components/review/ReviewCard.tsx`
13. `app/(site)/_components/review/ReviewList.tsx`
14. `app/(site)/_components/review/ReviewForm.tsx`
15. `app/api/admin/reviews/route.ts`
16. `app/api/admin/reviews/[reviewId]/route.ts`
17. `app/admin/reviews/page.tsx`
18. `app/admin/reviews/ReviewModerationClient.tsx`
19. `emails/ReviewRequestEmail.tsx`
20. `lib/email/send-review-request.ts`
21. `app/api/cron/review-emails/route.ts`

---

## Acceptance Criteria

1. `npx prisma migrate dev` — migration succeeds
2. `npm run precheck` — TypeScript + ESLint pass
3. `npm run test:ci` — all tests pass
4. Toggle "Product Reviews" on in Commerce Settings -> auto-saves
5. Browse product cards -> no ratings shown (no reviews yet)
6. Place a test order -> ship it -> verify purchase is tracked
7. Visit product page as purchaser -> review form appears
8. Submit review with profanity -> rejected with message
9. Submit clean review -> published, rating appears on card + detail page
10. Submit duplicate review -> rejected
11. Visit as non-purchaser -> "Purchase to review" message
12. Admin reviews page -> review visible, can flag/delete
13. Flag review -> hidden from product page, summary updates
14. Trigger cron endpoint -> review request email sent for shipped orders
15. Click email CTA -> navigates to product page `#reviews` section
