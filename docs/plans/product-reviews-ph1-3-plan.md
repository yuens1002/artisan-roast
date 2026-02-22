# Product Reviews — Phases 1-3 Implementation Plan

**Branch:** `feat/product-reviews-tier1` (after Sprint 0)
**Prerequisite:** Sprint 0 (Roaster's Brew Guide) merged or on same branch

## Context

Phases 1-3 establish the data layer, settings, and submission logic — the back-end foundation that UI components (Phases 4+) will build on.

## Commit Schedule

| # | Message | Scope | Risk |
|---|---------|-------|------|
| 1 | `feat: add review schema and migration` | Prisma schema (Review, ReviewVote, ReviewEmailLog, BrewMethod enum) + migration | Medium |
| 2 | `feat: add review core logic and tests` | Profanity filter, completeness score, review helpers + 3 test files | Low |
| 3 | `feat: add review settings` | App settings, API route, commerce page section | Low |
| 4 | `feat: add review submission actions and public API` | Server actions (submit, vote), public API route + tests | Medium |

## Acceptance Criteria

### UI

| AC | What | How | Pass |
|----|------|-----|------|
| AC-UI-1 | Commerce settings shows "Product Reviews" section | Static: `/admin/settings/commerce` | Toggle switch + email delay input visible |
| AC-UI-2 | Toggle auto-saves and persists | Interactive: toggle on, reload | Switch stays on after reload |

### Functional

| AC | What | How | Pass |
|----|------|-----|------|
| AC-FN-1 | Schema migration succeeds | `npx prisma migrate dev` | Review, ReviewVote, ReviewEmailLog models + BrewMethod, ReviewStatus enums created |
| AC-FN-2 | Profanity filter | Code review: `lib/reviews/profanity-filter.ts` | Detects profanity, no false positives on "class", "assess" |
| AC-FN-3 | Completeness score ranges | Code review: `lib/reviews/completeness-score.ts` | Minimal < 0.15, full brew report > 0.90 |
| AC-FN-4 | Verified purchase lookup | Code review: `lib/reviews/review-helpers.ts` | Traverses Order→OrderItem→PurchaseOption→Variant→Product. Returns orderId for SHIPPED/PICKED_UP |
| AC-FN-5 | Rating summary updates | Code review: `lib/reviews/review-helpers.ts` | Computes average of published reviews, writes to Product |
| AC-FN-6 | Settings API | Code review: `app/api/admin/settings/reviews/route.ts` | GET returns `{ enabled, emailDelayDays }`. PUT validates + upserts. Both require admin |
| AC-FN-7 | submitReview pipeline | Code review: `review-actions.ts` | auth → verified purchase → duplicate → profanity → completeness → create → update summary → revalidate |
| AC-FN-8 | Duplicate rejected | Code review | Returns error for same user+product |
| AC-FN-9 | voteHelpful | Code review | Creates/removes vote, updates helpfulCount, prevents self-vote |
| AC-FN-10 | Public API | Code review: `app/api/reviews/[productId]/route.ts` | Pagination, brewMethod filter, sort (recent/helpful/detailed), userVoted boolean |

### Regression

| AC | What | How | Pass |
|----|------|-----|------|
| AC-REG-1 | Tests pass | `npm run test:ci` | No regressions |
| AC-REG-2 | Precheck clean | `npm run precheck` | Zero errors |
| AC-REG-3 | Product page renders | Screenshot: `/products/breakfast-blend` | No broken imports |

## Key Implementation Details

### Schema (Review model)

```prisma
model Review {
  id        String       @id @default(cuid())
  rating    Int
  title     String?
  content   String
  status    ReviewStatus @default(PUBLISHED)

  brewMethod   BrewMethod?
  grindSize    String?
  waterTempF   Int?
  ratio        String?
  tastingNotes String[]

  completenessScore Float  @default(0)
  helpfulCount      Int    @default(0)

  productId String
  userId    String
  orderId   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  product   Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  order     Order?       @relation(fields: [orderId], references: [id], onDelete: SetNull)
  votes     ReviewVote[]

  @@unique([productId, userId])
  @@index([productId, status, createdAt])
  @@index([productId, status, completenessScore])
  @@index([productId, brewMethod])
}
```

### Completeness Score Weights

```
content word count: 0.35 (0 at <15 words, 1.0 at 80+)
brew method:        0.20
tasting notes:      0.15 (≥1 note)
technical data:     0.15 (any of grindSize, waterTempF, ratio)
title:              0.10
rating:             0.05
```

### Files (6 modified, 8 new)

| File | Type |
|------|------|
| `prisma/schema.prisma` | Modified |
| `lib/config/app-settings.ts` | Modified |
| `app/admin/settings/commerce/page.tsx` | Modified |
| `lib/reviews/profanity-filter.ts` | New |
| `lib/reviews/completeness-score.ts` | New |
| `lib/reviews/review-helpers.ts` | New |
| `lib/reviews/__tests__/profanity-filter.test.ts` | New |
| `lib/reviews/__tests__/completeness-score.test.ts` | New |
| `lib/reviews/__tests__/review-helpers.test.ts` | New |
| `app/api/admin/settings/reviews/route.ts` | New |
| `app/(site)/products/[slug]/review-actions.ts` | New |
| `app/api/reviews/[productId]/route.ts` | New |
| `app/(site)/products/[slug]/__tests__/review-actions.test.ts` | New |
