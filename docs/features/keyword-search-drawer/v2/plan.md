# Keyword Search Drawer v2 — Plan

**Branch:** `feat/keyword-search-drawer` (same branch as v1, before merge)
**Base:** `main`
**Builds on:** [v1 plan](../plan.md), [v1 ACs](../acs.md) — all 53 v1 ACs verified

---

## Context

v1 shipped a working keyword search drawer with admin-curated chips heading + multi-select chip categories + curated category. Storefront feedback during reviewer pass surfaced UX/data-model refinements that warrant a second pass before merge:

- Admin chip configuration is over-flexible — admins shouldn't pick 6 arbitrary categories; they should pick a **Menu Builder label**, and its categories become the chips. Reuses existing menu structure, removes duplicate curation work.
- Drawer should look and behave like the cart drawer (right-anchored, vaul-driven slide-in). Currently a top-anchored Radix Dialog — inconsistent with the rest of the app.
- Chip click should filter results in-drawer (browse-without-leaving), not navigate away.
- Curated/category cards should reuse the canonical `ProductCard` component (also resolves the blank-image issue currently visible in the drawer).
- Form copy and admin UX should be intuitive enough to skip a Save button (auto-save, like the product edit page).

This iteration refactors v1 into the final shape. No new features beyond what v1 already covers — pure UX/data-model refinement.

---

## Out of scope

- Drawer-internal "View all" link from a chip's category section to the full category page (deferred — chip click + browsing categories cards covers it)
- Compound chip+query filtering (chip + query are mutually exclusive; last action wins)
- Search history dropdown (still deferred from v1)
- Facets, sort, pagination, GIN index, `pg_trgm` (still deferred from v1)
- AI plugin tab (still deferred)

---

## Polish principles

Carry over from v1:

- Loading skeleton when index fetches; error fallback when fetch fails
- aria-live results region; focus management on drawer open/close
- Microcopy stays non-AI ("Search products…" placeholder)
- Smooth animations (vaul handles drawer open/close out of the box)
- Admin UX matches CLAUDE.md conventions (`space-y-12` major sections, `max-w-[72ch]` inputs, flat cards)

New for v2:

- **Auto-save with silent rollback** — like product edit page. On change → PUT. On failure → revert to prior value silently (no toast, but inline indicator if value reverts).
- **Chip persistence across all drawer states** (already shipped in v1 iter-2, kept)

---

## Commit schedule

| # | Commit | Risk |
|---|---|---|
| 0 | `docs: add v2 plan + ACs` | — |
| 1 | `feat: data model — search drawer settings switch to label-based + Prisma migration` | Medium |
| 2 | `feat: server — getSearchDrawerConfig fetches by label id + curated default by order` | Low |
| 3 | `feat: switch drawer primitive to shadcn Drawer (vaul, direction="right", responsive widths)` | Medium |
| 4 | `feat: drawer header redesign — move-right anchor btn, no divider, input reset` | Low |
| 5 | `feat: chip click in-body filtering (active chip state + category products)` | Medium |
| 6 | `feat: reuse ProductCard for curated + category products + fix images` | Low–Medium |
| 7 | `feat: admin form — label single-select + read-only chip preview + auto-save` | Medium |
| 8 | `feat: admin empty state + form copy refresh` | Low |
| 9 | `feat: seed — add "Top Categories" label demo + drop deprecated SiteSettings rows` | Low |

9 implementation commits + 1 plan commit.

---

## Architecture decisions

| Decision | Choice | Rationale |
|---|---|---|
| Drawer primitive | **vaul Drawer** `direction="right"` (via shadcn drawer) | Same shell as cart drawer — visual / behavioral consistency. Mobile-friendly out of the box. Free animations. |
| Chip data source | **CategoryLabel** | Reuses Menu Builder. Admin doesn't curate twice; updating menu structure updates search chips automatically. |
| Settings storage | `search_drawer_chip_label` stores **CategoryLabel.id** (not name) | Robust to admin renames. Standard relational pattern. |
| Default selection | **`order` field ascending** | Categories have `order` (used for menu sort); CategoryLabel also has `order`. Most explicit, matches Menu Builder display order. |
| Save UX | **Silent auto-save with rollback on failure** | Matches product edit page convention; less noise than toast on every change. |
| Migration approach | **Prisma migration (DELETE)** + seed (CREATE) | DROP rows for deprecated keys. New row + new label seeded via existing seed pattern. |

---

## Data model

### Migration (drop deprecated rows)

```sql
-- prisma/migrations/YYYYMMDDhhmmss_search_drawer_v2_label_based/migration.sql

DELETE FROM "SiteSettings" WHERE "key" IN (
  'search_drawer_chips_heading',
  'search_drawer_chip_categories'
);
```

### New `SiteSettings` keys

| Key | Type (parsed) | Default | Purpose |
|---|---|---|---|
| `search_drawer_chip_label` | `string` (CategoryLabel.id) | 1st label by `order` | Drives chip row in drawer; chips are categories under this label |
| `search_drawer_curated_category` | `string` (Category.slug) | 1st category by `order` | Drives curated products section (KEEPS from v1) |

### Demo seed — new "Top Categories" label

`prisma/seed/menu.ts` adds a new `CategoryLabel` named "Top Categories" with:

- `order: 99` (high so it doesn't compete with existing nav labels in case it ever did surface)
- **`isVisible: false`** — hides the label from the product menu nav. Search drawer reads CategoryLabel by id without filtering on visibility, so the hidden label still drives chip rendering. Cleanly separates "label exists for menu nav" from "label exists for search curation."

Attached categories: the 6 demo slugs from v1 (`single-origin`, `fruity-floral`, `medium-roast`, `cold-brew-blends`, `drinkware`, `central-america`) via `CategoryLabelCategory` join rows. Category visibility unchanged — categories themselves remain visible for direct browsing.

`prisma/seed/settings.ts` reads the seeded label's id and stores it as `search_drawer_chip_label` (overwrite on reseed via `update: { value }`).

`search_drawer_curated_category` continues to seed `staff-picks` (overwrite).

---

## Admin UI

**Location:** `/admin/settings/search` (unchanged route).

**Layout:** two stacked sections, no Save button. Auto-save on each change.

### Section 1 — Search drawer chips

- **Title:** "Search drawer chips"
- **Description:** "Use Menu Builder to add or select an existing label to showcase categories."
- **Field:** Label single-select (shadcn `Combobox`). Options sourced from all `CategoryLabel` rows. Default: 1st by `order`.
- **Read-only preview below:** chip buttons matching storefront styling (`rounded-md border bg-background px-4 py-2 text-sm`), one per category under the selected label, in the label's category-order. Non-clickable, slightly muted (`opacity-70` or similar).
- **Empty state:** if no labels exist in DB, render hint "No labels yet — create one in Menu Builder to use search chips" with a link to `/admin/product-menu`.

### Section 2 — Curated products

- **Title:** "Curated products"
- **Description:** "Select a product category to show as the default or when no search is found."
- **Field:** Category single-select (shadcn `Combobox`). Options sourced from all `Category` rows (any label / no-label). Default: 1st by `order`.
- **Empty state:** if no categories exist in DB, render hint "No categories yet — create one in Menu Builder."

### Auto-save behavior

- On each select change → `PUT /api/admin/settings/search-drawer` with the changed field
- Optimistic UI: field updates instantly
- On failure (non-200 response): silent rollback to prior value. No toast.
- Inline subtle indicator if rollback happens (e.g. red field border briefly, or hint text "Couldn't save — try again")

### API

`GET /api/admin/settings/search-drawer` returns `{ chipLabelId, curatedCategorySlug }`.
`PUT /api/admin/settings/search-drawer` accepts `{ chipLabelId?, curatedCategorySlug? }` (partial update — auto-save only sends what changed). Zod validates non-empty strings.

---

## Drawer

### Shell

**Component:** `vaul` Drawer via shadcn drawer wrapper. `direction="right"`. Same shell as cart drawer.

**Sizing:**

- Mobile (`<md`): width 100% of screen, height 100vh
- md+: width 80% of screen, height 100vh, dimmed backdrop on the left ~20%

**Animation:** vaul defaults (slide in from right, ~200ms).

### Layout

```text
┌─────────────────────────────────────────────────────┐
│  ┌─────────────────────────────┐    ┌─┐             │
│  │ 🔍 Search products…    │ × ││    │>│             │  ← top row, vertically aligned
│  └─────────────────────────────┘    └─┘             │     (no border-bottom divider)
│                                                      │
│  Top Categories                                      │  ← chip heading = label.name
│  [chip] [chip] [chip] [chip] [chip] [chip]          │
│                                                      │
│  Most Popular | (or category name when chip active)  │  ← curated/category section
│  [ProductCard] [ProductCard] [ProductCard]           │
│  [ProductCard] [ProductCard] [ProductCard]           │
└─────────────────────────────────────────────────────┘
```

### Top row

- Search `Input` on the left (autofocus), placeholder "Search products…"
- × icon button at right end of input — clears query (only visible when query non-empty)
- `MoveRight` arrow (→) close button on the right edge of the drawer, **vertically centered with the input row**, replaces the X close
- No `border-bottom` divider

### State machine

| State | Trigger | Body content |
|---|---|---|
| Empty | drawer just opened, no query, no chip | chips + curated products |
| Chip active | chip clicked, no query | chips (active highlighted) + that category's products |
| Results | query typed | chips + result cards (MiniSearch) |
| No results | query, zero matches | chips + "No results for 'X'" + curated products fallback |

### Interaction rules (mutually exclusive)

- **Type query** → clears active chip if any. Body shows search results.
- **Click chip** → clears query input. Body shows that category's products.
- **Click chip again (same one)** → deselects, returns to empty state.
- **Click × on input** → clears query, returns to empty state (or chip-active if a chip was active before typing — actually no, chips are wiped by typing, so just empty).
- **Click `>` close** → drawer slides closed.

State implementation: extend `useSearchDrawerStore` with `activeChipSlug: string | null`. Chip click sets it; typing clears it; query state and chip state toggle each other.

### ProductCard reuse

Current `CuratedProducts` uses inline custom card layout. Replace with `app/(site)/_components/product/ProductCard`. Confirm + fix the blank-image issue during the swap — likely cause is my custom Next/Image wiring with insufficient sizing/domain config; ProductCard handles all cases (placeholder included).

Mobile constraint: half-height image. ProductCard supports a `cardPaddingClass` prop already; check if it has an image-size variant or accept the default (likely fine — mobile is single-column so cards aren't tiny).

### Category products fetch

When chip clicked: drawer fetches products for `category.slug` via the existing `getProductsByCategorySlug` data layer (or a new lightweight client-side filter against the already-loaded MiniSearch index). The MiniSearch index has `primaryCategory.slug` per product → can filter client-side without a network round trip:

```ts
const categoryProducts = useMemo(
  () => products.filter((p) => p.primaryCategory?.slug === activeChipSlug),
  [products, activeChipSlug]
);
```

This is preferable — instant (no spinner), already-loaded data.

---

## Files modified

| File | Action |
|---|---|
| `prisma/migrations/YYYYMMDDhhmmss_search_drawer_v2_label_based/migration.sql` | New — DELETE deprecated rows |
| `prisma/seed/menu.ts` | Add "Top Categories" label + 6 category attachments (using existing CategoryLabelCategory upsert pattern) |
| `prisma/seed/settings.ts` | Replace 3 search-drawer upserts → 2 (drop heading, drop chip_categories array, add chip_label storing the label id) |
| `lib/data.ts` | `getSearchDrawerConfig` rewrites: fetches CategoryLabel by id → resolves categories under it → returns same shape (chipsHeading from label.name, chips from categories, curatedCategory unchanged) |
| `app/api/admin/settings/search-drawer/route.ts` | GET/PUT updated for new schema (chipLabelId + curatedCategorySlug); partial update support |
| `app/admin/settings/search/page.tsx` | Refactor: remove text input field; add label single-select; default to 1st label/category by order; empty states |
| `app/admin/settings/search/_components/SearchSettingsForm.tsx` | Replace multi-select with `LabelSelect`; replace explicit Save with auto-save handlers; add inline rollback indicator |
| `app/admin/settings/search/_components/LabelSelect.tsx` | New — single-select Combobox over CategoryLabel + read-only chip preview |
| `app/admin/settings/search/_components/CuratedCategorySelect.tsx` | Keep (single-select over Category) — minor: auto-save handler instead of explicit save |
| ~~`app/admin/settings/search/_components/TopCategoriesMultiSelect.tsx`~~ | Delete — replaced by LabelSelect |
| ~~`app/admin/settings/search/_components/ChipsHeadingField.tsx`~~ | Delete (was inlined in SearchSettingsForm; the input field is removed entirely) |
| `components/ui/drawer.tsx` | shadcn drawer component (already present from cart? if not, install via shadcn CLI) |
| `app/(site)/_components/search/SearchDrawer.tsx` | Major rewrite: switch from Dialog to Drawer; new top row layout (input + reset + close anchor); chip filter state; reuse ProductCard for cards |
| `app/(site)/_components/search/store.ts` | Add `activeChipSlug` + setter |
| `app/(site)/_components/search/CuratedCategoryChips.tsx` | Click handler change: invokes store.setActiveChipSlug instead of navigating; receives `activeChipSlug` for highlighting |
| `app/(site)/_components/search/CuratedProducts.tsx` | Refactor to use ProductCard component instead of inline card layout |
| Delete `useSearchAnalytics.ts`? | Keep — still useful for activity logging |

---

## Verification

End-to-end checks after the strip:

1. `npm run precheck` — TS + ESLint clean
2. `npm run test:ci` — all green (existing 1161 + new tests)
3. **Manual storefront walk:**
   - Click search icon in header → drawer slides in from right at 80% width on desktop, 100% on mobile
   - Drawer header shows search input + `MoveRight` arrow (→) close anchor on right edge, vertically centered with input
   - Empty state shows "Top Categories" heading + 6 chips + "Staff Picks" heading + 6 product cards (with images!)
   - Type "ethiopia" → results render in body, chips persist
   - Click × on input → query clears, empty state returns
   - Click "Brewing" chip → query clears, body shows Brewing's products with chip highlighted
   - Click chip again → deselects, empty state returns
   - Click `>` → drawer closes
4. **Manual admin walk:**
   - Navigate to `/admin/settings/search`
   - Page shows two sections (chips, curated), no Save button
   - Label single-select defaults to 1st label by order
   - Below it: read-only chip preview shows that label's categories
   - Change label → drawer reflects on next open
   - Change curated category → silently saved, drawer reflects
   - Disconnect network briefly → change a setting → field reverts to prior value (silent rollback indicator briefly visible)
5. **Empty-state walks:**
   - Delete all CategoryLabel rows in DB → admin form shows empty state with link to Menu Builder
   - (Skip in practice — admin generally has labels)
6. **Migration:** apply Prisma migration → confirm deprecated rows dropped from DB
