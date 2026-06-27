# Artisan Roast — Product Roadmap

> **Single source of truth for what's being built.**
> Update this doc on every release and before starting any new feature.
> Details live in `docs/features/<name>/` — this is the navigation layer only.

---

## Now — v0.109.10

_Patch — Priority Support subscribe CTA in demo mode now shows toast via demo-bypass; LICENSE_KEY added to Vercel prod so plans page loads._

---

## Next — Iter 6: Counter Architecture — Route SRP Refactor

> **Goal:** Split `route.ts` (1000+ lines, 8+ responsibilities) into focused modules before behavior fixes land. Pure refactor — no behavior change. Foundation for iters 7 and 8.
>
> **Source:** `docs/features/smart-search-ux/iter-6-architecture/BUGS.md` (OBS-7, OBS-8 partial)

| # | Item | Bug |
|---|------|-----|
| 6a | Extract `FiltersExtracted` + `SearchResponse` types to `types/search.ts` | OBS-7 |
| 6b | Extract `buildCatalogSnapshot` to `lib/ai/catalog.ts` | OBS-7 |
| 6c | Extract `buildExtractionPrompt` + `extractAgenticFilters` to `lib/ai/extraction.ts` | OBS-7 |
| 6d | Extract `buildSystemPrompt` to `lib/ai/prompts.ts` | OBS-7 |
| 6e | Slim `route.ts` to orchestration-only (≤250 lines) | OBS-7 |

**Spec:** [`docs/features/smart-search-ux/iter-6-architecture/plan.md`](features/smart-search-ux/iter-6-architecture/plan.md) · [`acs.md`](features/smart-search-ux/iter-6-architecture/acs.md)

---

## Next — Iter 7: Counter Foundation — Contracts, Schema & Behavior Correctness

> **Goal:** Fix the P0/P1 behavioral gaps using the clean module structure from iter-6. Zod as single source of truth. Merch works. Compare/recommend intent correct. Surfaces auto-invalidate on prompt change. Chip filter is client-side.
>
> **Source:** `docs/features/smart-search-ux/iter-6-architecture/BUGS.md` (BUG-1, OBS-4, OBS-5, OBS-6, OBS-8, OBS-11, BUG-3, GAP-10)

| # | Item | Bug |
|---|------|-----|
| 7a | Zod `FiltersExtractedSchema` — single source of truth; `origin` shape contract | OBS-8, OBS-11 |
| 7b | Merch `productKeywords` extraction + keyword-based Prisma query | BUG-1, GAP-10 |
| 7c | Compare/recommend intent → `products: []`, AI reasons instead of listing | OBS-4 |
| 7d | Prompt hash invalidation — auto-regen surfaces on prompt change | OBS-6 |
| 7e | Chip progressive filtering — client-side result narrowing | BUG-3 |
| 7f | Extraction prompt examples neutralized — structure only, no phrasing | OBS-5 |

**Spec:** [`docs/features/smart-search-ux/iter-7-contracts/plan.md`](features/smart-search-ux/iter-7-contracts/plan.md) · [`acs.md`](features/smart-search-ux/iter-7-contracts/acs.md)

---

## Next — Iter 8: Counter Intelligence — Evaluation Harness & Benchmark

> **Goal:** Build the QA scoring harness that closes the gap between "tests pass" and "Counter actually works." Composite score (0.0–1.0) across deterministic, structural, and LLM-as-judge tiers. 20 fixtures. Benchmark gate blocks shipping on score regression.
>
> **Source:** `docs/features/smart-search-ux/iter-6-architecture/BUGS.md` (GAP-9)

| # | Item | Bug |
|---|------|-----|
| 8a | `scripts/counter-qa.ts` — runner + fixture format + scorer scaffold | GAP-9 |
| 8b | 20-fixture dataset across all intent types | GAP-9 |
| 8c | Tier 1 (deterministic) + Tier 2 (structural) scoring — 85% of composite | GAP-9 |
| 8d | Tier 3 (LLM-as-judge, two-model) scoring — 15% of composite | GAP-9 |
| 8e | Run history log + benchmark gate (exit 1 on score regression) | GAP-9 |

**Spec:** [`docs/features/smart-search-ux/iter-8-harness/plan.md`](features/smart-search-ux/iter-8-harness/plan.md) · [`acs.md`](features/smart-search-ux/iter-8-harness/acs.md)

---

## Phase B — Counter Intelligence Foundation

> **Goal:** Make the Counter model-agnostic and self-improvable. Establish the infrastructure that survives model generations: a ground truth dataset, a scoring harness, and a coffee knowledge layer that lives in the DB — not in prompt text.
>
> **Architecture:** Eval-driven prompt optimization with benchmark-gated deployment (Karpathy loop pattern adapted for NL-to-filter). A single composite score (0.0–1.0) gates every Counter change. New model version → re-run harness → score tells you if calibration is needed before going live.
>
> **Spec:** `docs/features/counter-intelligence/` (to be created)

| # | Item | Notes |
|---|------|-------|
| B1 | Ground truth fixture dataset | 50+ scored fixtures in DB: `{ query, language, expected_intent, expected_products, expected_ranking, acknowledgment_rules }` — versioned, model-agnostic |
| B2 | Composite scoring harness | `scripts/counter-qa-score.ts` — fires fixtures, scores deterministically (intent, product, cadence) + LLM-as-judge for acknowledgment only, logs `{model_id, run_at, composite_score, breakdown}` per run |
| B3 | Benchmark gate | Counter change must score ≥ previous run before shipping. Calibration loop: modify → run → score → keep/discard → repeat |
| B4 | Coffee knowledge basement → DB | Extract domain facts (origin→flavor, processing→cup character, varietal signatures) from hardcoded prompt text into `coffee_knowledge` table. Versionable, roaster-overridable, no deploy needed to update |
| B5 | Multi-language fixture set | Language-tagged fixtures (`en`, `es`, `fr`) in ground truth dataset. System prompt instruction to respond in user's detected language. Score language-specific performance separately |
| B6 | Model benchmark registry | Track composite scores per model version over time. `{model_id, run_at, score}` history makes model upgrades empirical — not guesswork |

---

## Backlog — Personalization

| Priority | Feature | Spec / Notes |
|----------|---------|--------------|
| P1 | Phase C1 — User context aggregation | `getUserPurchaseHistory`, `getUserRecentViews`, `getUserSearchHistory` |
| P2 | Phase C2 — Personalized ranking | Inject user context into Counter prompt for authed users |
| P3 | Phase C3 — "Recommended For You" carousel | Authenticated; falls back to trending for anon |
| P4 | Reviews Tier 2 — AI Roast Master | `docs/internal/product-reviews-tier2.md` — depends on Phase C data |
| P5 | Phase C4 — Reviews + search integration | Utility scores in agentic results (BLOCKED on Reviews Tier 2) |
| P6 | Counter — service tier (platform premium) | Extend Counter beyond product discovery to service queries: order lookup, reorder from history, return initiation. Requires order data access + auth context. |

---

## Shipped

| Version | Feature |
|---------|---------|
| v0.100.9 | Refactor — Counter SRP: route.ts → extraction/prompts/catalog/types modules, 395 lines orchestration-only |
| v0.100.8 | Feat — Counter conversation context: history, intent classification, session greeting, standby surface, catalog-driven origin, cadence enforcement, domain knowledge |
| v0.100.7 | Fix — plan detail quota labels (`[object Object]` → correct label/limit) |
| v0.100.6 | Fix — admin nav active state (Dashboard no longer highlights on every page) |
| v0.100.5 | Fix — Counter keyboard retention, focus steal, viewport offset, voice surface defaults |
| v0.100.4 | Fix — hero 16:9 mobile, theme switcher visibility, stepper border, product card aspect |
| v0.100.3 | Feat — Counter UX overhaul: panel rename, voice surfaces, admin consolidation, cadence rules |
| v0.100.2 | Fix — lazy-require pg/adapter-pg (Turbopack static analysis) |
| v0.100.1 | Fix — search quality hotfix: AI clears keyword OR + pg full-text ranking |
| v0.100.0 | Feat — Agentic Smart Search (Phase A + Phase 2): Counter panel, NL extraction, voice persona, Smart Search admin, salutation, response cadence, animated waiting indicator |
| v0.99.x | Fixes — pg/ws adapter, Copilot review feedback, hook portability guards |
| v0.98.4 | Repo cleanup — dev-tools removed, docs/internal tsconfig excluded |
| v0.98.3 | Security — patched 17 npm vulnerabilities |
| v0.98.2 | Platform — acceptedAt/acceptedVersions wiring + ticket reply thread |
| v0.98.1 | Profile — admin password change via SecurityTab |
| v0.98.0 | QA — self-healing pipeline (auto-classify, repair, close issues) |
| v0.97.x | Demo mode — build variant system, amber toast, demo badges, banner hydration |
| v0.96.x | Install — graceful degradation, auto-seed, setup checklist, QA agent |
| v0.95.x | Platform — SaaS wiring, legal/EULA gate, platform API |
| v0.94.x | Admin — order detail page, dashboard mobile responsiveness |
| v0.93.x | Analytics — custom date ranges, analytics page restyle |
| v0.92.x | Images — Vercel Blob migration |
| v0.91.x | Reviews — full Brew Report system (Tier 1 all 8 phases) |
| v0.90.x | Storefront — theme switcher, storefront polish |
| v0.89.x | Tables — shared data-table, table UI polish |
| v0.88.x | Admin — orders, subscriptions responsive, refund flow |
| v0.87.x | Products — table v1/v2, add/edit form |
| v0.86.x | Mobile — audit, nav, responsive polish |
| v0.85.x | Email — provider settings, SVG logo, templates |
| v0.84.x | Support — services, nav, ticket system |
| v0.83.x | Stripe — promo codes, billing portal |
| v0.82.x | Cart — add-to-cart standardization, price alignment |
| v0.81.x | Add-ons — undo/redo, add-on links |
| v0.80.x | Auth — admin profile API, version check endpoint |
| v0.79.x | Telemetry — install tracking, heartbeat cron |
| v0.78.x | Feedback — in-app widget, `/api/feedback` |
| v0.77.x | Orders — failed order status, FAILED badge |
| v0.76.x | Version system — `lib/version.ts`, update banner |
| v0.75.x | Menu Builder — v1.0 launch (all 3 phases complete) |
| v0.72.x | AI — pages CMS, About Page wizard, AI content generation |

---

## Convention

- **Before starting a feature:** add it to Next or Backlog with a link to its spec
- **On every release:** update the "Now" section, move shipped items to the Shipped table
- **When planning a sprint:** ensure `docs/features/<name>/spec.md` exists and create `docs/plans/<name>-plan.md`
- **`docs/plans/`** — per-sprint ACs and implementation plans (granular, created at sprint start)
- **`docs/features/`** — durable feature specs (created when feature is first planned, updated as it evolves)
- **`docs/internal/`** — gitignored, strategy/competitive/private notes
