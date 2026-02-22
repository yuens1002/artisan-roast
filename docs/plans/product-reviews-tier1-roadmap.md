# Product Reviews Tier 1 — Roadmap

**Branch:** `feat/product-reviews-tier1`
**Spec:** `docs/features/product-reviews/product-reviews-tier1.md`
**Companion:** `docs/internal/product-reviews-tier2.md` (AI Roast Master — local only, gitignored)

## Tier 1 Overview — The Brew Report

### Phase Breakdown

| Phase | Scope | Files (new/mod) | Effort | Dependencies |
|-------|-------|-----------------|--------|-------------|
| **1a** | Schema: Review, ReviewVote, ReviewEmailLog, BrewMethod enum, Product fields | 1 mod | Medium | None |
| **1b** | Profanity filter | 1 new + 1 test | Light | 1a |
| **1c** | Completeness heuristic scoring | 1 new + 1 test | Light | 1a |
| **1d** | Review helpers (verified purchase, rating summary, helpful count) | 1 new + 1 test | Medium | 1a |
| **1e** | Roaster's Brew Guide: admin editor + storefront display + "Best For" refactor | 3 new + 3 mod | Medium | 1a |
| **2** | Settings: reviews.enabled, emailDelayDays | 1 new + 2 mod | Light | 1a |
| **3** | Review submission: server actions (submit, vote) + public API | 2 new + 1 test | Medium | 1a-d, 2 |
| **4** | UI components: StarRating, RatingSummary, BrewReportForm, ReviewCard, ReviewList, BrewMethodIcon | 7 new | Heavy | 3 |
| **5** | Product integration: ProductCard ratings, detail page, "Best For" + community correlation | 3 mod | Medium | 4 |
| **6** | Admin moderation: reviews page, flag/delete actions | 2 new + 2 mod + nav | Medium | 3 |
| **7** | Review request email: template, sender, cron | 3 new | Light | 1a, 2 |
| **8** | Demo site seed data: users, brew guides, reviews, votes | 1 mod | Medium | 1-7 |

### Implementation Order

```
Sprint 0 (THIS PLAN — ship first):
  Roaster's Brew Guide: Schema + Layout refactor + Storefront + Seed
  → Demo site shows brew guides immediately

Sprint 1: Phases 1-3
  Schema (full review models) + Core Logic + Settings + Submission
  → Back-end foundation complete

Sprint 2: Phases 4-5
  UI Components + Product Integration
  → Storefront review system live

Sprint 3: Phases 6-8
  Admin Moderation + Email + Remaining Seed Data
  → Feature complete
```

### Total Scope

- **28 ACs** across all phases
- **24 new files, 10 modified files**
- **$0/month infrastructure cost** (Tier 1 is fully platform-native)
