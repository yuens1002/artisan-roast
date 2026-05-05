# Search Architecture

> **Last Updated:** 2026-04-27
> **Status:** Production
> **Version:** 0.103.2+
> **Target catalog size:** small-to-mid storefronts (≤ ~200 products)

## Overview

The store has two distinct search surfaces. They were intentionally kept separate so each can optimize for a different shape of interaction:

| Surface | Trigger | Where it lives | What it uses |
|---|---|---|---|
| **Search drawer** (primary) | Header search icon → modal drawer | [`app/(site)/_components/search/`](../../app/(site)/_components/search/) | Client-side MiniSearch over the full enabled catalog |
| **Legacy `/search?q=`** (fallback) | Direct URL or older entry points | [`app/api/search/route.ts`](../../app/api/search/route.ts) | Postgres `tsvector` + `ts_rank` server-side FTS |

Both surfaces include MERCH alongside COFFEE (the COFFEE-only hardcode was removed in v0.102.0, PR #341). The drawer is the experience we polish; the legacy route exists for deep-link compatibility and for users who navigate to `/search?q=...` directly.

---

## Design principles

1. **Keystroke-instant on the primary surface.** The drawer is the showcase — typing should feel like the index is in the user's pocket. We accept a one-time payload cost (full catalog fetch on first drawer open) to get 0 ms search latency on every keystroke after.
2. **Discovery, not just retrieval.** The drawer is empty-state-first: chips + curated products *before* the user types. A blank text box that does nothing until you commit to a query is a cold experience for a small store.
3. **No SaaS dependency.** Search runs entirely in our own codebase + browser — no Algolia, no Typesense, no Meilisearch. Keeps demo deployments self-contained.
4. **Polish over breadth.** Deliberately no facets, no sort menu, no pagination, no search history, no view toggle, no agentic AI. (See [feature plan](../features/keyword-search-drawer/plan.md) — scope-disciplined per the iter-1→7b lesson from the prior smart-search era.)
5. **Slot for plugin-driven AI.** The drawer is architected as a discovery surface with a mode-switch slot — when the agentic search platform plugin lands ([archive](../internal/smart-search/README.md)), an "Ask the Counter" tab can be added without renovating the surface.

---

## Drawer surface — client-side architecture

### Data flow

```text
storefront layout render
  └── getCachedSearchDrawerConfig()         [unstable_cache, 60s TTL, tag: "search-drawer-config"]
        └── getSearchDrawerConfig()         [lib/data.ts:893]
              ├── chip-label                [SiteSettings: search_drawer_chip_label → CategoryLabel.id]
              │     └── categories          [orderBy: { CategoryLabelCategory.order }, take: MAX_CHIPS = 6]
              ├── chips heading             [from CategoryLabel.name; fallback: "Top Categories"]
              ├── curated category          [SiteSettings: search_drawer_curated_category → Category.slug]
              └── curated products          [findMany with productCardIncludes, take: CURATED_PRODUCTS_LIMIT = 6]

storefront drawer first open
  └── useSearchIndex()                      [app/(site)/_components/search/hooks/useSearchIndex.ts]
        └── GET /api/search/index           [Cache-Control: public, max-age=60, SWR=300]
              └── findMany(enabled products) [productCardIncludes shape, orderBy: PRODUCT_LIST_ORDER_BY]
        └── new MiniSearch({ ... }).addAll(products)

every keystroke
  └── miniSearch.search(query, { fuzzy: 0.2, prefix: true })
        └── ranked results into <SearchResults>
```

### MiniSearch field weights

```ts
fields: ["name", "tastingNotes", "categoryNames", "origin", "description"]
boost:  { name: 4, tastingNotes: 2, categoryNames: 2, origin: 1.5, description: 1 }
```

`categoryNames` includes both primary and secondary categories (changed in v0.102.0 to surface coffees that match a query through their non-primary categorization).

### State

- **[`store.ts`](../../app/(site)/_components/search/store.ts)** — Zustand store: `isOpen`, `query`, `activeChipSlug`. `close()` clears both `query` and `activeChipSlug` so reopening shows a fresh drawer.
- **No URL sync, no localStorage.** The drawer is purely modal; reload closes it.

### Close-on-link-click pattern

Both the drawer and the mobile menu Sheet use **event-delegated** close on any anchor click inside their body:

```tsx
onClick={(e) => {
  if ((e.target as HTMLElement).closest("a[href]")) close();
}}
```

This deliberately replaces a `usePathname()` effect because pathname-based close doesn't fire when the destination route equals the current route — so a user already on `/products/foo` clicking the foo result in the drawer would otherwise leave the drawer / menu stranded over a non-navigation. Event delegation closes synchronously regardless. (See PR #348, commits `430cfac` and the mobile-menu mirror.)

### Result-to-product navigation

A drawer result click → product page is the only navigation path the drawer creates (chips filter in-drawer, no nav). The destination — [`app/(site)/products/[slug]/page.tsx`](../../app/(site)/products/[slug]/page.tsx) — runs four top-level fetch steps on the cold path: `getProductBySlug` first (sequential, drives breadcrumb logic), then `getRelatedProducts`, `getProductAddOns`, and `getProductsByCategorySlug` fan out. Note that `getProductAddOns` itself is not a single round-trip — it does an add-on links query plus a `SiteSettings` lookup via `getWeightUnit()` — so the cold path includes five DB reads in total.

Those downstream loaders only depend on the product + display category resolved by the first, and are otherwise independent, so the page fans them out via `Promise.all` rather than running the top-level loaders in series. Total page latency reduces to roughly the slowest top-level fetch — large enough that the result→product transition feels instant on warm caches and the gap is barely perceptible on cold caches. (Shipped v0.103.2.)

The page itself uses `revalidate = 3600` ISR; first hit per product per Vercel edge node per hour is the cold path, subsequent hits within that window are cached HTML.

---

## Admin surface

[`/admin/settings/search`](../../app/admin/settings/search/page.tsx) writes two `SiteSettings` keys (down from three in v1 — the v2 refactor consolidated heading + chip categories into a single CategoryLabel reference):

| Key | Type (parsed) | Purpose |
|---|---|---|
| `search_drawer_chip_label` | string (CategoryLabel.id) | The label whose attached categories render as the chip row. **The chip-row heading is derived from `CategoryLabel.name`** — there is no separate "heading" key. Hidden labels (`isVisible: false`) are valid here; the search drawer reads them by id without filtering on visibility, cleanly separating "label exists for product menu" from "label exists for search curation." |
| `search_drawer_curated_category` | string (Category.slug) | The category whose products populate the curated section + no-results fallback |

The form auto-saves per field (debounced PUT to `/api/admin/settings/search-drawer`) and rolls back on failure with an inline "Couldn't save — try again" hint that auto-clears after 4 s or on the next successful save.

The admin PUT route calls `revalidateTag("search-drawer-config", "default")` so the storefront's server-side cache picks up the change on its next request. Menu Builder mutations that touch CategoryLabel / CategoryLabelCategory / Category rows also fire the same tag (via [`lib/cache/revalidate-search-drawer.ts`](../../lib/cache/revalidate-search-drawer.ts), shipped v0.103.1).

> **Caveat — admin edits don't appear in already-open storefront tabs without a hard refresh.** When admin saves a chip-label or curated-category change, `revalidateTag("search-drawer-config", "default")` busts the *server* cache. But any storefront tab already open holds the prior layout's RSC payload (in the browser HTTP cache + Next's client-side Router Cache), so a normal reload often serves the stale response. A hard refresh (Cmd/Ctrl + Shift + R) reliably shows the new data. Same behavior in dev and prod. Worth surfacing to admins so they don't read a stale chip row as "the save didn't work." Tracked as nitpick #13 in [`docs/features/keyword-search-drawer/nitpicks.md`](../features/keyword-search-drawer/nitpicks.md).

---

## Architecture decisions

| Decision | Choice | Rationale |
|---|---|---|
| Search engine for the drawer | **MiniSearch** (~20 KB, MIT) | Battery-included fuzzy + field-weighted ranking; smaller than FlexSearch; no SaaS dependency |
| Drawer primitive | **Vaul** (right-anchored) | Native-feel slide-in on mobile + desktop; cleaner than Radix Dialog for this layout |
| Animation pattern | Reuse homepage `<ScrollReveal>` for chip-active grids | Consistency across the storefront; avoids one-off `animate-in` keyframes that fight `animationFillMode` specificity |
| State persistence | **None** (no URL sync, no localStorage, no sessionStorage) | Drawer is purely modal; refresh closes it |
| Index freshness | Re-fetch on each drawer open | Simplest; admin edits are visible immediately on next open |
| Admin scope | Two `SiteSettings` keys + a chip-label join | Reuses Menu Builder for the underlying category list; no new admin UI for picking products |
| Close-on-link-click | Event-delegated `onClick` on drawer / Sheet body | Covers same-pathname clicks that `usePathname()` effects miss |

---

## Scale envelope

This architecture is **deliberately tuned for small-to-mid catalogs (≤ ~200 enabled products).** The single-fetch full-catalog model is the load-bearing assumption — everything downstream (0 ms keystroke search, fuzzy + field-weighted ranking, no FTS round-trip per character) follows from it.

The three scale-dependent risk areas below were reviewed during the v0.103.0 / v0.103.2 polish pass and **explicitly deferred** as out-of-scope for the target use case. They are documented here so a future revisit inherits the reasoning rather than the absence of a fix.

### Deferred — `/api/search/index` returns the full enabled catalog

- **Decision** — Keep the load-once-then-search-locally architecture. Don't introduce a `take` cap (would silently hide products from search), don't migrate to server-side search.
- **Why this is fine for the target** — At ≤ 200 products with the current `productCardIncludes`-shaped payload (image url/altText, tasting notes, roast level, slug, name, type, primary price, primary + secondary categories), the response stays well under the threshold where it would matter on the critical path. Cached `public, max-age=60, stale-while-revalidate=300`, so the typical visitor pays the cost once per minute per edge node at most.
- **What would change at scale** — At 500+ products this single-fetch payload grows linearly into KB territory and starts to matter on slow connections. A naive `take` cap would be the **wrong** mitigation: products beyond the cap would be unsearchable by name, description, or any other field — silent data loss from the user's perspective.
- **Revisit triggers**
  - Catalog grows past ~150 products, OR
  - Bundle / load profiling shows the drawer's index fetch on the critical path, OR
  - Multi-tenant where one heavy tenant inflates everyone's session payload
- **Correct mitigation when triggered** — Migrate the drawer from "load full catalog + MiniSearch" to "send query → server FTS → ranked results". The codebase already ships [`app/api/search/route.ts`](../../app/api/search/route.ts) using Postgres `tsvector` + `ts_rank`, which inherently searches `name`, `description`, `tastingNotes`, and category names. The drawer would need:
  - Debounced typing → POST query to the FTS endpoint
  - Server returns top-N products (e.g. 20)
  - Render through the existing mini-card pipeline
  - Curated and chip-active grids continue to fetch their own focused datasets — chip-active becomes a category-slug fetch instead of an in-memory filter
  - **Trade-off:** every keystroke now hits the server (~50–150 ms RTT) instead of a 0 ms in-memory search; debounce + server-side caching mitigate. Description matching is preserved by the existing FTS implementation.
- **Why we don't ship this prophylactically** — Real engineering effort (~1 day), changes the UX latency profile (network RTT vs 0 ms), and the target catalog size simply doesn't need it.

### Deferred — `getSearchDrawerConfig` underlying query graph not yet split

- **Decision** — The `unstable_cache` wrap landed in PR #343 (60 s TTL, tag `search-drawer-config`, admin PUT calls `revalidateTag` on save). Don't further split the curated-products fetch into a client-triggered endpoint.
- **Why this is fine for the target** — Cache hits are cheap. Cache misses (1× per 60 s per Vercel edge node, plus admin saves that bust the tag) hit Prisma for ~3 queries + a 6-product `findMany` with `productCardIncludes`. That's acceptable cost for layout-time render at small catalog scale, especially since the drawer is the showcase entry point — paying for it on every render means it's already warm when a visitor opens it.
- **What splitting would buy at scale** — Avoids layout-time DB work for visitors who never open the drawer. Costs: a network round-trip when they do open it, plus a loading state in the drawer's curated section.
- **Revisit triggers**
  - p99 storefront page TTFB is dominated by this cache miss in production traces, OR
  - Admin saves cause noticeable cache stampede (multiple visitors arrive within the same revalidation window), OR
  - Curated-products payload grows materially
- **Correct mitigation when triggered** — Move `curatedProducts` out of `getSearchDrawerConfig` into a dedicated endpoint (e.g. `/api/search-drawer/curated`) fetched client-side on first drawer open, with its own cache tag. Drawer renders chips immediately (config payload shrinks to chip metadata + setting refs), curated grid renders after the round-trip with a skeleton in place.

### Deferred — link prefetch on visible search results

- **Decision** — Don't add Next.js Link prefetch (`prefetch={true}`) on result `<Link>`s in the drawer body. Rely on the v0.103.2 query parallelization for the result→product transition feel.
- **Why this is fine for the target** — After the parallelization, cold-cache product page loads feel near-instant on the demo. With small catalog + low traffic, paying the latency once per actual click is preferable to prefetching every visible result.
- **What prefetch would buy at scale** — Warming the destination route's RSC payload before the user clicks, so the click → render is instantaneous even on cold ISR caches. Useful when the destination has heavier-than-`Promise.all` data fetching, or when users browse rapidly and the pre-warm consistently lands.
- **What it costs** — Each prefetch is a real HTTP request that runs the destination's data path. A drawer with 10 visible results × every drawer-open + filter session = 10 prefetched product pages even if the user clicks zero or one. At 200+ products with real traffic that's meaningful Vercel function invocations, DB load, and mobile data for users on metered connections — paid for results that go unviewed.
- **Revisit triggers**
  - Catalog grows to a scale where ISR cold-cache misses dominate the perceived navigation latency, OR
  - Real-user telemetry shows the result→product transition is the slowest interaction in the drawer, OR
  - We're on a usage tier where prefetch invocations are cheap and the latency fix is worth the bandwidth
- **Correct mitigation when triggered** — Hover/focus prefetch via `useRouter().prefetch()` on `onMouseEnter` / `onFocus`, with `prefetch={false}` on the `<Link>`. Pays one prefetch per *near-click* (intent-driven) rather than one per *visible result* (viewport-driven). Mobile clients without hover skip the prefetch entirely and fall back to the click-only cold path — acceptable trade-off given the cost shape.

---

## Critical files

| File | Role |
|---|---|
| [`app/(site)/_components/search/SearchDrawer.tsx`](../../app/(site)/_components/search/SearchDrawer.tsx) | Drawer shell, input, results, no-results, curated fallback |
| [`app/(site)/_components/search/CuratedCategoryChips.tsx`](../../app/(site)/_components/search/CuratedCategoryChips.tsx) | Chip row using the shared `<Chip>` component |
| [`app/(site)/_components/search/CuratedProducts.tsx`](../../app/(site)/_components/search/CuratedProducts.tsx) | Curated grid + chip-active grid, supports `<ScrollReveal>` stagger |
| [`app/(site)/_components/search/store.ts`](../../app/(site)/_components/search/store.ts) | Zustand store: `isOpen`, `query`, `activeChipSlug` |
| [`app/(site)/_components/search/hooks/useSearchIndex.ts`](../../app/(site)/_components/search/hooks/useSearchIndex.ts) | Fetches the index, builds the MiniSearch instance |
| [`app/api/search/index/route.ts`](../../app/api/search/index/route.ts) | Returns the full enabled catalog for the client index |
| [`app/api/search/route.ts`](../../app/api/search/route.ts) | Legacy server-side FTS for `/search?q=` URL |
| [`app/(site)/layout.tsx`](../../app/(site)/layout.tsx) | `unstable_cache`-wrapped `getSearchDrawerConfig` reader |
| [`lib/data.ts`](../../lib/data.ts) (`getSearchDrawerConfig`, ~L893) | Reads chip-label categories + settings + curated products |
| [`lib/cache/revalidate-search-drawer.ts`](../../lib/cache/revalidate-search-drawer.ts) | One-line helper called from admin Menu Builder mutations to fire `revalidateTag("search-drawer-config")` |
| [`app/admin/settings/search/page.tsx`](../../app/admin/settings/search/page.tsx) + `_components/` | Admin form, auto-save with rollback indicator |
| [`app/api/admin/settings/search-drawer/route.ts`](../../app/api/admin/settings/search-drawer/route.ts) | PUT handler, `revalidateTag("search-drawer-config")` on save |

---

## Related documents

- [Keyword Search Drawer — feature plan](../features/keyword-search-drawer/plan.md) — original v1 plan, ACs, and verification checklist
- [Keyword Search Drawer v2 plan](../features/keyword-search-drawer/v2/plan.md) — the v2 polish iteration (chip filtering, secondary-category search, payload trim)
- [Search drawer nitpicks](../features/keyword-search-drawer/nitpicks.md) — durable list of polish items deferred from the post-launch review; revisit when there's a product driver
- [Smart Search archive](../internal/smart-search/README.md) — the agentic search era (v0.0–v0.101.0) and why it moved to a platform plugin
