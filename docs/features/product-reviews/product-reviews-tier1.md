# Product Reviews — Tier 1: The Brew Report

> **Status:** Planned
> **Priority:** Tier 1 Gap #2 (see `docs/internal/feature-gap-analysis.md`)
> **Supersedes:** `docs/features/product-reviews/implementation-plan.md`
> **Companion:** `docs/internal/product-reviews-tier2.md` (AI Roast Master)
> **Date:** 2026-02-21

---

## Vision

Turn the standard product review into a **Brew Report** — a structured, specialty-coffee-native format that captures how the coffee was brewed, not just whether the buyer liked it. No AI, no API costs. Pure platform-native value.

Customers become "Brew Contributors" who share recipes and confirm tasting notes. Shoppers can filter reviews by brew method to find insights relevant to their setup. The UI treats reviews as **journal entries**, not comments.

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Eligibility | Verified purchase only (SHIPPED/PICKED_UP orders) |
| Order linkage | Auto-select most recent qualifying order (not user-selected) |
| Moderation | Auto-publish with server-side profanity filter; admin can flag/delete |
| Rating display | Stars on cards + detail page, complemented by brew method badges |
| Duplicate prevention | One review per user per product (`@@unique`) |
| Rating performance | Denormalized `averageRating`/`reviewCount` on Product model |
| Review email | Cron-based, N days after ship (configurable in settings) |
| Profanity | Reject with message (not mask) — curated word list + regex word boundaries |
| Helpful voting | One vote per user per review, denormalized `helpfulCount` |
| Review ranking | Completeness heuristic + helpful votes (AI scoring is Tier 2) |
| Media | Text-only in Tier 1 (image/video uploads are Tier 2) |
| Verified Buyer badge | Always show "Verified Buyer" tag on review cards (all Tier 1 reviews are purchase-gated, but the badge establishes trust and the pattern for when non-verified reviews may exist) |
| UI framing | "Brew Report" form, editorial card design, journal entry aesthetic |
| "Best For" source | Replace hardcoded roast-level map with roaster-curated brew methods |
| Roaster's notes | Structured JSON on Product model, editable in admin product editor |

---

## Phase 1: Foundation (Schema + Core Logic)

### 1a. Prisma schema changes

**File:** `prisma/schema.prisma`

Add `Review` model with specialty coffee fields:

```prisma
model Review {
  id        String       @id @default(cuid())
  rating    Int          // 1-5
  title     String?
  content   String
  status    ReviewStatus @default(PUBLISHED)

  // Specialty coffee fields
  brewMethod   BrewMethod?
  grindSize    String?      // e.g., "Medium-Fine", "18 clicks on Comandante"
  waterTempF   Int?         // Fahrenheit
  ratio        String?      // e.g., "1:16", "1:2 (espresso)"
  tastingNotes String[]     // confirmed/added notes, e.g., ["Milk Chocolate", "Orange"]

  // Heuristic ranking (Tier 1 — no AI)
  completenessScore Float  @default(0)  // 0-1 based on filled fields + word count
  helpfulCount      Int    @default(0)  // denormalized from ReviewVote

  // Relations
  productId String
  userId    String
  orderId   String?  // auto-selected, nullable (order may be deleted)

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

enum ReviewStatus {
  PUBLISHED
  FLAGGED
  DELETED
}

enum BrewMethod {
  POUR_OVER_V60
  CHEMEX
  AEROPRESS
  FRENCH_PRESS
  ESPRESSO
  MOKA_POT
  COLD_BREW
  DRIP_MACHINE
  SIPHON
  TURKISH
  OTHER
}

model ReviewVote {
  id       String @id @default(cuid())
  reviewId String
  userId   String
  createdAt DateTime @default(now())

  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([reviewId, userId])
}
```

Add `ReviewEmailLog` model (prevent duplicate emails):

```prisma
model ReviewEmailLog {
  id      String   @id @default(cuid())
  orderId String
  userId  String
  sentAt  DateTime @default(now())

  order   Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  user    User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([orderId, userId])
}
```

Add to `Product` model:

- `averageRating Float?` — null = no reviews
- `reviewCount Int @default(0)`
- `roasterBrewGuide Json?` — structured roaster's notes (see below)
- `reviews Review[]`

**`roasterBrewGuide` JSON shape:**

```typescript
interface RoasterBrewGuide {
  /** Roaster-recommended brew methods, ordered by preference */
  recommendedMethods: BrewMethod[];
  /** Per-method recipes from the roaster */
  recipes?: {
    method: BrewMethod;
    ratio?: string;       // e.g., "1:16"
    grindSize?: string;   // e.g., "Medium-Fine"
    waterTempF?: number;  // e.g., 205
    notes?: string;       // e.g., "30s bloom, slow spiral pour"
  }[];
  /** Origin/batch narrative — story of the farm, lot, processing nuances */
  originNotes?: string;
  /** Competition scores, certifications, awards */
  accolades?: string[];   // e.g., ["Cup of Excellence 2025 — 89.5pts", "Q-Grade: 86"]
  /** Roaster's own tasting commentary beyond the tasting note chips */
  roasterTastingNotes?: string;
}
```

This replaces the hardcoded `brewMethodsByRoast` map in `CoffeeDetails.tsx`. When `roasterBrewGuide.recommendedMethods` exists, "Best For" is sourced from it. When absent, fall back to the existing roast-level defaults for backward compatibility.

Add `reviews Review[]`, `reviewVotes ReviewVote[]`, and `reviewEmailLogs ReviewEmailLog[]` relations to `User` and `Order`.

Migration: `npx prisma migrate dev --name add-product-reviews`

### 1b. Profanity filter

**New file:** `lib/reviews/profanity-filter.ts`

- Curated word list (~50-80 common English profanity words)
- Regex with `\b` word boundaries to avoid false positives (e.g., "class" != "ass")
- `checkProfanity(text): { hasProfanity: boolean; matchedWords: string[] }`
- Case-insensitive, checks title + content

### 1c. Completeness heuristic

**New file:** `lib/reviews/completeness-score.ts`

Computes a 0-1 score based on filled fields. No AI — pure field counting + word count:

```
Score components (weights sum to 1.0):
  - content word count: 0.35 (0 at <15 words, linear to 1.0 at 80+ words)
  - brew method selected: 0.20
  - tasting notes confirmed: 0.15 (at least 1 note)
  - technical data filled: 0.15 (any of: grindSize, waterTempF, ratio)
  - title provided: 0.10
  - rating provided: 0.05 (always true, but included for completeness)
```

A review with just "Great coffee" (2 words, no structured data) scores ~0.05. A full brew report with 80+ words, method, notes, and recipe scores 1.0. This provides a meaningful sort order without AI.

`computeCompletenessScore(review): number`

### 1d. Review helpers

**New file:** `lib/reviews/review-helpers.ts`

- `findVerifiedPurchaseOrderId(userId, productId)` — queries Order -> OrderItem -> PurchaseOption -> ProductVariant chain where status is SHIPPED or PICKED_UP. Returns the most recent qualifying orderId, or null.
- `updateProductRatingSummary(productId)` — aggregates published reviews, updates Product's `averageRating`/`reviewCount`
- `updateReviewHelpfulCount(reviewId)` — counts ReviewVote rows, updates denormalized `helpfulCount`

### 1e. Roaster's Brew Guide

**Admin product editor addition:**

Add a "Roaster's Brew Guide" section to the coffee product editor (both `CoffeeProductForm.tsx` and `MerchProductForm.tsx` — coffee only):

- **Recommended brew methods** — multi-select from the `BrewMethod` enum, drag-to-reorder (first = primary recommendation)
- **Recipes** — expandable per-method recipe cards: ratio, grind size, water temp, freeform notes. Only shown for selected methods.
- **Origin notes** — rich text area for batch/farm/processing narrative (e.g., "Smallholder lot from Caranavi province, washed and sun-dried at 1,800m")
- **Accolades** — tag-style input for competition scores, certifications (e.g., "Cup of Excellence 2025 — 89.5pts")
- **Roaster's tasting commentary** — text area for the roaster's own flavor description beyond the tasting note chips

All fields are optional. The guide is persisted as the `roasterBrewGuide` JSON field on Product.

**Storefront integration — replace hardcoded "Best For":**

**File:** `app/(site)/_components/product/CoffeeDetails.tsx`

- Replace the hardcoded `brewMethodsByRoast` map with a priority chain:
  1. `product.roasterBrewGuide.recommendedMethods` (roaster-curated) — if present
  2. Fall back to roast-level defaults (current behavior) — for products without a brew guide
- Display the roaster's method-specific recipe below "Best For" when available (collapsible "Roaster's Recipe" section)

**New file:** `app/(site)/_components/product/RoasterBrewGuide.tsx`

- Displays the full brew guide on the product detail page: recommended methods with recipes, origin notes, accolades, tasting commentary
- Editorial card design matching the "journal entry" aesthetic
- Positioned above the Brew Reports section — the roaster's voice comes first, community follows

### 1f. Tests

- **New file:** `lib/reviews/__tests__/profanity-filter.test.ts` — detects profanity, no false positives ("class", "assess"), case insensitive, checks both title and content
- **New file:** `lib/reviews/__tests__/completeness-score.test.ts` — empty review = low score, full brew report = high score, each field contributes expected weight
- **New file:** `lib/reviews/__tests__/review-helpers.test.ts` — verified purchase logic, rating summary computation, helpful count update

---

## Phase 2: Settings

### 2a. App settings

**File:** `lib/config/app-settings.ts`

Add settings keys:
- `REVIEWS_ENABLED: "reviews.enabled"` (boolean, default false)
- `REVIEW_EMAIL_DELAY_DAYS: "reviews.emailDelayDays"` (number, default 7)

Add getter/setter functions following existing `getAllowPromoCodes` pattern.

### 2b. Settings API

**New file:** `app/api/admin/settings/reviews/route.ts`

- GET -> `{ enabled, emailDelayDays }`
- PUT -> validates with Zod + upserts
- `requireAdmin()` guard

### 2c. Commerce settings page

**File:** `app/admin/settings/commerce/page.tsx`

Add "Product Reviews" `SettingsSection` with:
- `Switch` toggle for enable/disable
- Number input for email delay days (default: 7, min: 1, max: 30)

---

## Phase 3: Review Submission

### 3a. Server action

**New file:** `app/(site)/products/[slug]/review-actions.ts`

`submitReview(data)`:
- Zod schema validates: rating (1-5), content (required, max 2000 chars), title (optional, max 100 chars), brewMethod (optional enum), grindSize (optional), waterTempF (optional, 150-212), ratio (optional), tastingNotes (optional string array)
- Pipeline: auth check -> verified purchase lookup (auto-select order) -> duplicate check -> profanity filter -> compute completeness score -> create review -> update product summary -> revalidatePath
- Returns `{ success, error?, reviewId? }`

`voteHelpful(reviewId)`:
- Auth check -> can't vote own review -> upsert ReviewVote -> update denormalized helpfulCount
- Returns `{ success, error?, voted: boolean }`

### 3b. Public reviews API

**New file:** `app/api/reviews/[productId]/route.ts`

- GET with pagination (`?page=1&limit=10`)
- Optional filter: `?brewMethod=POUR_OVER_V60`
- Sort options: `?sort=recent` (default), `?sort=helpful`, `?sort=detailed` (completenessScore desc)
- Only returns `status: PUBLISHED` reviews
- Includes: user name (first name + last initial), brew method, tasting notes, technical data, helpfulCount, completenessScore
- Includes `userVoted: boolean` if authenticated (for highlighting the "Helpful" button)
- No auth required for reading

### 3c. Tests

- **New file:** `app/(site)/products/[slug]/__tests__/review-actions.test.ts` — submit flow, profanity rejection, duplicate rejection, verified purchase gating, vote toggle, completeness score computed on create

---

## Phase 4: UI Components

### Shared design language

Reviews are presented as **Brew Reports** — editorial journal entries, not forum comments. Use warm tones, generous whitespace, and coffee-specific iconography (brew method icons, bean icons for tasting notes).

### 4a. Star + rating components

- **New file:** `app/(site)/_components/product/StarRating.tsx` — read-only star display (filled/half/empty SVGs, amber-400). Props: `rating`, `size` (sm/md/lg)
- **New file:** `app/(site)/_components/product/RatingSummary.tsx` — `StarRating` + "4.5 (42 reviews)". Props: `compact` (for cards), `brewMethodCounts?` (optional method badge pills for detail page)

### 4b. Brew Report form

- **New file:** `app/(site)/_components/review/BrewReportForm.tsx` — the main review submission form:
  - Star picker (interactive hover/click)
  - Title input (optional)
  - Content textarea ("Tell us about your brew...")
  - Brew method selector (icon grid or select, maps to BrewMethod enum)
  - Tasting notes dial-in: shows the product's existing tasting notes as toggleable chips (confirm/deny), plus an "Add your own" input
  - Technical data section (collapsible "Recipe Details"): grind size text input, water temp number input (F), ratio text input
  - Submit button with loading state
  - Auth/purchase gating messages displayed instead of form when not eligible
  - Uses `submitReview` server action + `useToast`
  - Completeness indicator: subtle progress bar or checkmark list showing how complete the brew report is (encourages fuller entries)

### 4c. Review display

- **New file:** `app/(site)/_components/review/ReviewCard.tsx` — journal-entry style card:
  - User avatar/initial + display name (first + last initial)
  - Star rating + date
  - Title (if provided)
  - Brew method badge (icon + label, e.g., "V60" with pour-over icon)
  - Confirmed tasting notes as small chips
  - Recipe details row (if provided): grind / temp / ratio in a subtle metadata strip
  - Content text
  - "Helpful" button with count (uses `voteHelpful` action)
  - "Verified Buyer" badge with checkmark icon (green shield or similar trust indicator)
- **New file:** `app/(site)/_components/review/ReviewList.tsx` — paginated list:
  - Sort selector: "Most Recent" | "Most Helpful" | "Most Detailed"
  - Brew method filter pills (shows only methods that have reviews for this product)
  - "Load More" pagination (fetches from `/api/reviews/{productId}`)
  - Empty state: "Be the first to share a Brew Report"

### 4d. Brew method icons

- **New file:** `app/(site)/_components/review/BrewMethodIcon.tsx` — maps BrewMethod enum to SVG icons (V60, Chemex, AeroPress, etc.). Simple line-art style matching site aesthetic.

---

## Phase 5: Product Integration

### 5a. Product cards

**File:** `app/(site)/_components/product/ProductCard.tsx`

- Add `<RatingSummary compact />` below product title (only when `reviewCount > 0`)
- Show dominant brew method badge if one method has >50% of reviews (e.g., small "V60" pill)
- Fields auto-included since `averageRating`, `reviewCount` are scalar on Product model

### 5b. Product detail page

**File:** `app/(site)/products/[slug]/page.tsx`

- Fetch initial reviews (first page, sorted by helpfulness) + `reviewsEnabled` setting
- Fetch brew method distribution for filter pills + "Community brews this with" breakdown
- Fetch product's tasting notes (for the dial-in section in the form)
- Fetch `roasterBrewGuide` for the brew guide section
- Pass to `ProductClientPage`

**File:** `app/(site)/products/[slug]/ProductClientPage.tsx`

- Add `RatingSummary` (full, with brew method counts) near product name
- Add `RoasterBrewGuide` section — the roaster's authoritative voice (methods, recipes, origin notes, accolades)
- Add "Brew Reports" section with `id="reviews"` anchor (for email deep links)
- Contains: section heading ("Brew Reports"), `RatingSummary`, `BrewReportForm`, `ReviewList`
- Gated by `reviewsEnabled` prop

### 5c. "Best For" + community brew method correlation

The "Best For" display on `CoffeeDetails.tsx` evolves from static to data-informed:

**Tier 1 (this plan):**
- Primary source: `roasterBrewGuide.recommendedMethods` (roaster-curated)
- Fallback: `brewMethodsByRoast` hardcoded map (backward compat)
- Supplement: when `reviewCount > 5`, append a "Community brews this with" line showing the top 2-3 brew methods from reviews (`GROUP BY brewMethod, COUNT(*)` — no AI needed)
- Visual: roaster recommendation shown as primary, community data shown as secondary with a subtle "based on N brew reports" attribution

This creates a visible dialogue between the roaster's intent and the community's experience. When the roaster recommends V60 but 70% of brew reports use espresso, that contrast is informative — not contradictory.

**Tier 2 evolution** (see companion doc): AI synthesizes both signals into a dynamic "Best For" that adapts as review data grows.

---

## Phase 6: Admin Moderation

### 6a. Admin API

- **New file:** `app/api/admin/reviews/route.ts` — GET all reviews (any status), admin-only, filterable by status/product/rating/brewMethod, paginated
- **New file:** `app/api/admin/reviews/[reviewId]/route.ts` — PATCH (flag/restore/delete), DELETE (hard delete); updates product summary on status change

### 6b. Admin page

- **New file:** `app/admin/reviews/page.tsx` — server component, `requireAdmin()`
- **New file:** `app/admin/reviews/ReviewModerationClient.tsx` — follows `OrderManagementClient` pattern:
  - Tab filters: All / Published / Flagged / Deleted
  - Table columns: Product, Customer, Rating, Brew Method, Completeness, Content (truncated), Date, Status, Actions
  - Mobile `MobileRecordCard` layout
  - Actions: Flag (with reason), Restore, Delete (with confirmation dialog)
  - Click row to expand full review content + recipe details

### 6c. Admin nav

**File:** `lib/navigation/route-registry.ts` (or equivalent admin nav config)

- Add "Reviews" link in sidebar, grouped under Commerce/Orders section

---

## Phase 7: Review Request Email

### 7a. Email template

**New file:** `emails/ReviewRequestEmail.tsx`

- Subject: "How was your coffee? Share a Brew Report!"
- Lists purchased products with product image, name, and "Write a Brew Report" CTA buttons -> `/products/{slug}#reviews`
- Brief copy explaining the value: "Help fellow coffee lovers find their perfect cup"
- Follows existing React Email component patterns

### 7b. Send function

**New file:** `lib/email/send-review-request.ts`

- `sendReviewRequest({ customerEmail, customerName, orderNumber, products, storeName })`
- Same pattern as `send-order-confirmation.ts`

### 7c. Cron endpoint

**New file:** `app/api/cron/review-emails/route.ts`

- Authorized by `CRON_SECRET` env var
- Queries orders: `status = SHIPPED`, `shippedAt < now - N days`, no `ReviewEmailLog` entry, user has no existing review for those products
- Sends emails in batches, logs to `ReviewEmailLog`
- Checks `reviews.enabled` setting before running
- Add `CRON_SECRET` to `.env.example`

---

## Phase 8: Demo Site Seed Data

The demo site at artisanroast.app needs to showcase the full review ecosystem on launch. This means seeding both roaster's brew guides and synthesized brew reports so visitors see a living product page, not an empty one.

### 8a. Synthetic users

**File:** `prisma/seed.ts`

Add ~15-20 coffee-enthusiast personas to the existing demo users section. Each needs a realistic name, email, and creation date spread across the past 2-3 months (not all the same day):

```
Ana Morales        ana.morales@example.com
James Park         james.v60@example.com
Rachel Foster      rachel.chemex@example.com
David Okonkwo      david.brew@example.com
Yuki Tanaka        yuki.espresso@example.com
Priya Sharma       priya.coffee@example.com
Marcus Williams    marcus.roast@example.com
Lea Hoffman        lea.hoffman@example.com
Carlos Reyes       carlos.aeropress@example.com
Sophie Kim         sophie.pourover@example.com
Ben Abrams         ben.abrams@example.com
Nadia Petrova      nadia.coffee@example.com
Tom Gallagher      tom.gallagher@example.com
Amara Diallo       amara.brew@example.com
Kenji Watanabe     kenji.grind@example.com
```

These sit alongside the existing 5 users (demo, admin, Sarah, Mike, Emily). Total: ~20 users.

### 8b. Roaster's brew guides

**File:** `prisma/seed.ts`

Seed `roasterBrewGuide` JSON on 8-10 flagship coffee products. Each guide should feel like it was written by an opinionated specialty roaster — not generic. Examples:

| Product | Recommended Methods | Recipe Highlight | Origin Notes | Accolades |
|---------|-------------------|-----------------|--------------|-----------|
| Ethiopia Yirgacheffe | V60, Chemex | 1:16, 205°F, medium-fine, 30s bloom | Washed, Gedeo zone, 1,900-2,200m, jasmine-forward lot | SCA 88pts |
| Colombia Huila | V60, AeroPress | 1:15, 200°F, medium | Finca El Paraiso, anaerobic natural, 72hr fermentation | Cup of Excellence 2025 — 89.5pts |
| Brazil Santos | Espresso, Moka Pot | 1:2, 200°F, fine | Mogiana region, natural dried on raised beds | — |
| Bolivia Caranavi | Chemex, French Press | 1:16, 205°F, medium-coarse | Smallholder lot, washed, sun-dried at 1,800m | — |
| Kenya Nyeri | V60, Chemex | 1:15, 205°F, medium-fine, fast pour | SL28/SL34 varieties, Nyeri county, washed | SCA 90pts |
| Guatemala Antigua | Espresso, AeroPress | 1:2.5, 201°F, fine | Finca La Esperanza, bourbon variety, volcanic soil | Rainforest Alliance Certified |
| Breakfast Blend | Drip, French Press | 1:16, 200°F, medium | House blend — Colombia + Brazil + Guatemala base | — |
| Decaf Colombia | Any method | 1:16, 200°F, medium | Swiss Water Process, Huila region, same farm as regular Colombia | — |

Include `roasterTastingNotes` for each — 1-2 sentences from the roaster's palate (e.g., "We roast this just past first crack to preserve the delicate jasmine aromatics. Expect a tea-like body with a long, sweet citrus finish.").

### 8c. Synthesized brew reports

**File:** `prisma/seed.ts`

Seed ~50-60 reviews spread across 10-12 products with realistic distribution:

**Completeness tiers:**
- **~15 minimal** (1-2 sentences, no structured data, low completeness): "Smooth and easy to drink. Nice everyday coffee."
- **~25 mid-range** (brew method + short content, some with 1-2 tasting notes): "Brewed on my V60 at 1:16 and the chocolate notes really came through. Great morning cup."
- **~15 full brew reports** (method, recipe details, tasting notes, 60-100 words): detailed recipes with specific grind settings, water temps, bloom times, and flavor observations

**Brew method distribution** (should feel natural, not uniform):
- V60 / Pour-over: ~35% (most popular in specialty)
- Espresso: ~25%
- AeroPress: ~15%
- Chemex: ~10%
- French Press: ~8%
- Drip/Other: ~7%

**Rating distribution** (skews positive — this is specialty coffee, people self-select):
- 5 stars: ~30%
- 4 stars: ~45%
- 3 stars: ~20%
- 2 stars: ~4%
- 1 star: ~1%

**Tasting note confirmation:** Mid-range and full brew reports should confirm 2-4 of the product's existing tasting notes and occasionally add 1 new one.

**Helpful votes:** Seed ~80-100 `ReviewVote` records. Full brew reports get more votes (5-15 each). Minimal reviews get 0-2. This ensures the "Most Helpful" sort produces meaningful results.

**Timestamps:** Spread reviews across the past 2-3 months with natural clustering (more reviews on weekends, a few gaps).

### 8d. Denormalized summaries

After seeding reviews, compute and write:
- `averageRating` and `reviewCount` on each Product with reviews
- `completenessScore` on each Review
- `helpfulCount` on each Review

### 8e. Verification

After `npm run seed`:
- Product cards show star ratings and brew method badges for seeded products
- Product detail pages show the Roaster's Brew Guide section with recipes and origin notes
- "Best For" shows roaster-curated methods (not hardcoded roast-level defaults) for products with guides
- Brew Reports section shows seeded reviews with varying completeness levels
- Sort/filter by brew method works with seeded data
- "Community brews this with" appears for products with 5+ reviews
- Admin moderation page lists all seeded reviews

---

## File Summary

### Files Modified (existing)

1. `prisma/schema.prisma` — Review, ReviewVote, ReviewEmailLog models + BrewMethod/ReviewStatus enums + Product `roasterBrewGuide`/`averageRating`/`reviewCount` + User/Order relations
2. `lib/config/app-settings.ts` — reviews settings getters/setters
3. `app/admin/settings/commerce/page.tsx` — reviews toggle + email delay
4. `app/(site)/_components/product/ProductCard.tsx` — rating summary + brew method badge
5. `app/(site)/_components/product/CoffeeDetails.tsx` — replace hardcoded "Best For" with roaster-curated + community brew method data
6. `app/(site)/products/[slug]/page.tsx` — fetch reviews + setting + tasting notes + roasterBrewGuide
7. `app/(site)/products/[slug]/ProductClientPage.tsx` — Roaster's Brew Guide + Brew Reports sections
8. `app/admin/products/_components/CoffeeProductForm.tsx` — Roaster's Brew Guide editor section
9. `prisma/seed.ts` — synthetic users, roaster brew guides, synthesized brew reports, helpful votes, denormalized summaries
10. Admin nav config — add Reviews link

### Files Created (new)

**Core logic:**
1. `lib/reviews/profanity-filter.ts`
2. `lib/reviews/completeness-score.ts`
3. `lib/reviews/review-helpers.ts`

**Tests:**
4. `lib/reviews/__tests__/profanity-filter.test.ts`
5. `lib/reviews/__tests__/completeness-score.test.ts`
6. `lib/reviews/__tests__/review-helpers.test.ts`
7. `app/(site)/products/[slug]/__tests__/review-actions.test.ts`

**API + actions:**
8. `app/api/admin/settings/reviews/route.ts`
9. `app/(site)/products/[slug]/review-actions.ts`
10. `app/api/reviews/[productId]/route.ts`
11. `app/api/admin/reviews/route.ts`
12. `app/api/admin/reviews/[reviewId]/route.ts`

**UI components:**
13. `app/(site)/_components/product/StarRating.tsx`
14. `app/(site)/_components/product/RatingSummary.tsx`
15. `app/(site)/_components/product/RoasterBrewGuide.tsx`
16. `app/(site)/_components/review/BrewReportForm.tsx`
17. `app/(site)/_components/review/ReviewCard.tsx`
18. `app/(site)/_components/review/ReviewList.tsx`
19. `app/(site)/_components/review/BrewMethodIcon.tsx`

**Admin:**
20. `app/admin/reviews/page.tsx`
21. `app/admin/reviews/ReviewModerationClient.tsx`

**Email:**
22. `emails/ReviewRequestEmail.tsx`
23. `lib/email/send-review-request.ts`
24. `app/api/cron/review-emails/route.ts`

---

## Acceptance Criteria (Tier 1)

1. `npx prisma migrate dev` succeeds
2. `npm run precheck` passes
3. `npm run test:ci` — all tests pass
4. Toggle "Product Reviews" on in Commerce Settings -> auto-saves
5. Browse product cards -> no ratings shown (no reviews yet)
6. Place a test order -> ship it -> verified purchase tracked
7. Visit product page as purchaser -> Brew Report form appears with brew method selector, tasting note chips, recipe fields
8. Submit review with profanity -> rejected with message
9. Submit minimal review ("Great coffee", no structured data) -> published with low completeness score
10. Submit full Brew Report (method, notes, recipe, 80+ words) -> published with high completeness score, appears above minimal review when sorted by "Most Detailed"
11. Submit duplicate review -> rejected
12. Visit as non-purchaser -> "Purchase to share a Brew Report" message
13. Filter reviews by brew method -> only matching reviews shown
14. Sort by "Most Helpful" / "Most Detailed" / "Most Recent" works
15. Click "Helpful" on a review -> count increments, button highlights, can't vote own review
16. Product card shows star rating + dominant brew method badge
17. Admin reviews page -> review visible with all structured data, can flag/delete
18. Flag review -> hidden from product page, averageRating/reviewCount update
19. Trigger cron endpoint -> review request email sent for shipped orders past delay window
20. Click email CTA -> navigates to product page `#reviews` section
21. Admin product editor -> Roaster's Brew Guide section: add recommended methods, per-method recipes, origin notes, accolades
22. Product detail page -> "Best For" shows roaster-curated methods (not hardcoded roast-level map) when brew guide is set
23. Product detail page -> Roaster's Brew Guide section displays recipes, origin notes, accolades above Brew Reports
24. Product without roaster brew guide -> "Best For" falls back to existing roast-level defaults
25. Product with 5+ reviews -> "Community brews this with" line shows top brew methods from reviews alongside roaster recommendation
26. `npm run seed` -> creates ~20 users, brew guides on 8-10 products, ~50-60 reviews with votes, denormalized summaries computed
27. Demo site (artisanroast.app) after seed -> product cards show ratings, detail pages show roaster guides + brew reports with filters/sorting working out of the box
28. Every review card displays a "Verified Buyer" badge with trust indicator (all Tier 1 reviews are purchase-gated)

---

## What Tier 1 Does NOT Include

The following are explicitly deferred to **Tier 2** (see `docs/internal/product-reviews-tier2.md`):

- AI-powered utility scoring (LLM evaluation)
- AI-generated consensus summaries ("Community Insight" blurbs)
- Sentiment shield (auto-flagging meritless reviews)
- Gamification: badges ("V60 Specialist"), credit loops, reward points
- Image/video uploads on reviews
- Wilson Score ranking algorithm (AI-enhanced)
- Full star de-emphasis in favor of "Insight Counts"
- AI-driven dynamic "Best For" (synthesizing roaster + community data)
- Review response/reply threads
- SaaS tier pricing for multi-tenant scenarios
