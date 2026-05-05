# Keyword Search Drawer — Plan

**Branch:** `feat/keyword-search-drawer`
**Base:** `main`

---

## Context

The Smart Search / Counter strip ([v0.101.0](../../../CHANGELOG.md), PR #342) removed the agentic search layer and left the core with a thin keyword `/api/search` route. The baseline audit ([archive README](../../internal/smart-search/README.md), conversation 2026-04-25) surfaced 8 bugs in the resulting search experience — most notably:

- Merch is invisible (coffee-only hardcode at `app/api/search/route.ts:18`)
- Search returns spurious coffee hits for merch queries (e.g. "air dripper" → 3 unrelated coffees)
- "0 FTS matches" silently returns the entire roast category instead of "no results"
- No discovery surface — `/search` is a blank page until you type
- Server-side FTS adds network latency to every keystroke if we ever wanted real-time UX

This iteration delivers a **first-class polished keyword search** as an in-app drawer following the discovery-surface pattern (search input + curated chips + curated products). It uses **client-side search** (in-browser index) for sub-millisecond as-you-type results and is intentionally architected as a **discovery surface with a mode-switch slot** — when the platform plugin lands, an "Ask the Counter" tab can be added without renovating the surface.

**Design references:** `.screenshots/keyword-search-drawer/general-layout.png` (desktop) + `mobike.png` (mobile) — illustrate the layout, spacing, chip wrapping, section hierarchy. Implementation matches the structure shown there; brand styling is our own.

Scope-disciplined per the iter-1→7b lesson: many things considered (facets, sort, pagination, GIN index, `pg_trgm`, search history, view toggle) — explicitly dropped to ship one tight branch.

**Aim points addressed (vs. baseline):**

| # | Aim | Approach |
|---|-----|----------|
| 1 | Find merch via keyword | Client index includes all products; legacy `/api/search` drops the COFFEE hardcode |
| 3 | Honest "no results" | Drawer trivially shows fallback; legacy route stops returning all-of-category on FTS-zero |
| 4 | Better ranking | MiniSearch field-weighted ranking (name > tasting notes > description) |
| 5 | Typo tolerance | MiniSearch fuzzy matching (`fuzzy: 0.2`) |
| 8 | A11y | aria-live results region + drawer focus management |

**Out of scope (deferred / dropped):** facets, sort, pagination, persisted tsvector + GIN index, `pg_trgm`, search history dropdown, grid/list view toggle, AI plugin tab (slot reserved, not built).

---

## Polish principles

This iteration optimizes for **a polished UX flow and a polished admin section** — not feature breadth. Quality over scope. Every state and interaction gets considered:

- **Loading**: skeleton placeholders while index fetches; never raw empty containers
- **Error**: friendly fallback when `/api/search/index` fails; chips remain navigable
- **Empty**: first-time admin (no settings configured) shows admin link; customer view degrades gracefully
- **Animations**: drawer open ≤200ms with slide+fade; results fade in; no layout shifts
- **Microcopy**: deliberate, non-agentic ("Search products…", not "Ask anything…")
- **Admin feedback**: Sonner toast on save success/failure; explicit visual feedback at the 6-chip cap
- **Visual rhythm**: matches CLAUDE.md admin UI conventions (`space-y-12` major, `space-y-6` minor, flat cards `rounded-lg border p-6`, `max-w-[72ch]` on inputs)
- **A11y**: aria-live results region, focus management, keyboard escape

---

## Commit Schedule

| # | Message | Issues | Risk |
|---|---------|--------|------|
| 0 | `docs: add plan + ACs for keyword search drawer` | — | — |
| 1 | `feat: add server endpoint for client-side search index` | new `/api/search/index` route | Low |
| 2 | `feat: add SearchDrawer scaffolding (Radix Dialog, responsive)` | Drawer shell, header trigger | Low |
| 3 | `feat: integrate MiniSearch client-side index in drawer` | as-you-type, fuzzy, field-weighted | Medium |
| 4 | `feat: drawer empty state — chips + curated products` | static curation, no admin yet | Low |
| 5 | `feat: drawer results + no-results states with fade-in` | tailwindcss-animate | Low |
| 6 | `feat: admin Search settings page + nav entry` | new route `/admin/settings/search`, route registry + admin-nav | Low |
| 7 | `feat: admin search drawer form + seed defaults (heading + chips + curated)` | Zod max-6, reuse `CheckboxListContent`, single-select Combobox, save toast, `prisma/seed/settings.ts` upsert with `update: { value }` | Medium |
| 8 | `fix: legacy /api/search drops COFFEE hardcode + honest no-results` | merch inclusion, no fall-through | Low |
| 9 | `feat: a11y polish — aria-live + focus management + tests` | screen reader announcements | Low |

---

## Architecture decisions

| Decision | Choice | Rationale |
|---|---|---|
| Search engine | **MiniSearch** (~20KB, MIT) | Battery-included fuzzy + field weights; simpler API than FlexSearch; smaller than alternatives; no SaaS dependency |
| Drawer primitive | **Radix Dialog** (shadcn) | Already in codebase; clean responsive (fullscreen on mobile, top-anchored desktop) via Tailwind; better fit than vaul for this layout |
| Animation | `tailwindcss-animate` (`fade-in-0`) | Already installed; no framer-motion needed |
| State persistence | **None** (URL doesn't sync, no localStorage, no sessionStorage) | Drawer is purely modal; refresh closes it; reload-with-same-query is edge case |
| Index freshness | Re-fetch on each drawer open | Simplest; no cache invalidation logic; admin edits visible immediately |
| Admin scope | Two `SiteSettings` fields, both pick from existing categories | Reuses Menu Builder; no new admin UI for product picking |

---

## Data model

**New `SiteSettings` keys** (no schema change — `SiteSettings` is generic K/V):

| Key | Type (parsed) | Default | Purpose |
|---|---|---|---|
| `search_drawer_chips_heading` | `string` | `"Top Categories"` | Heading shown above the chip row |
| `search_drawer_chip_categories` | `string[]` (max 6) | `[]` | The categories rendered as chips below the heading |
| `search_drawer_curated_category` | `string \| null` | `null` | Single category for curated products section. Section header is derived from the picked category's display name (e.g. "Staff Picks") — no separate setting. |

**No new tables, no migrations on data, no Prisma schema change.**

---

## Admin UI

**Location:** new admin page at `/admin/settings/search` (registered in `lib/navigation/route-registry.ts` per [`docs/navigation/README.md`](../../navigation/README.md), and surfaced as a nav child of `admin.settings` in `lib/config/admin-nav.ts`). Sits between **Commerce** and **Shipping** in the settings nav order.

**Page layout:** single section, follows CLAUDE.md admin conventions (flat `rounded-lg border p-6` cards, `space-y-12` between major sections, `max-w-[72ch]` on inputs and text).

**Three form fields, in order. The form drives one consolidated section in the drawer:**

```text
[Search input]

{chips_heading}                      ← Setting 1 (text input, default "Top Categories")
[chip] [chip] [chip] [chip] [chip] [chip]   ← Setting 2 (max 6 categories)

{curated_category.name}              ← Setting 3 (display name of picked category, e.g. "Staff Picks")
[product card] [product card] [product card]
```

### 1. Chips section heading

| Aspect | Spec |
|---|---|
| Component | shadcn `Input` (text) |
| Label | "Section heading" |
| Helper text | "Shown above the chip row in the search drawer. Default: 'Top Categories'." |
| Default value | `"Top Categories"` |
| Validation | Zod `z.string().min(1).max(60)` — non-empty, reasonable length |
| Storage key | `search_drawer_chips_heading` |

> **Note:** The curated products section uses the picked category's display name as its heading — no separate input. If admin picks the category "Staff Picks", the products section displays "Staff Picks" above the grid.

### 2. Top Categories (multi-select, max 6)

| Aspect | Spec |
|---|---|
| Component | **Reuse existing `CheckboxListContent`** from `app/admin/product-menu/menu-builder/components/shared/CheckboxListContent.tsx` — same primitive that powers `AddCategoriesDropdown` / `AddProductsDropdown` in Menu Builder. Renders search input + "Added" section (selected) + "Available" section (unselected), all checkboxes. Visually consistent with the rest of admin. |
| Label | "Top Categories" |
| Helper text | "Up to 6 categories shown as quick-navigation chips at the top of the search drawer. Click order = display order." |
| Behavior | When 6 are checked, items in the "Available" section render as `disabled` (parent computes per-item disabled state from current count); attempting to check a 7th is impossible from UI. Drag-to-reorder is **out of scope for v1** — display order = selection order. |
| Validation | Zod `z.array(z.string()).max(6)` — server rejects >6 as a defense in depth |
| Storage key | `search_drawer_chip_categories` |

### 3. Curated products category (single-select)

| Aspect | Spec |
|---|---|
| Component | shadcn `Combobox` (searchable single-select) — different interaction from Setting 2 because single-select doesn't fit a checkbox-list UX |
| Label | "Curated products category" |
| Helper text | "Products from this category appear in the curated section (empty state + no-results state). Pick any existing category — admin controls whether it also appears in the storefront menu via the Menu Builder's label assignments." |
| Behavior | Searchable single-select with category name + slug visible. Optional "None" / clear selection. |
| Validation | Zod `z.string().nullable()` |
| Storage key | `search_drawer_curated_category` |

**Save behavior:**

- Single "Save" button at the bottom of the form (per CLAUDE.md: `flex flex-col` + `mt-auto pt-5`, never `w-full`)
- On success: Sonner `toast.success("Search settings saved")`
- On validation error: Sonner `toast.error(<message>)` + inline field error
- Optimistic UI not required — wait for server response before showing toast
- Disabled state on Save while in-flight; spinner inside button

**Empty form state (first-time):**

When all three settings are at default (no chip categories selected, no curated category set):

- Heading field shows default `"Most Popular"`
- Chip multi-select shows empty placeholder ("Select up to 6 categories…")
- Curated single-select shows empty placeholder ("Select a category…")
- Helper banner at top: "The search drawer will work with defaults until you configure these settings. The curated products section will be empty until a category is selected."

---

## API surface

### New: `GET /api/search/index`

Returns the catalog index for client-side search. Cacheable.

```ts
// Response
{
  products: Array<{
    id: string;
    name: string;
    slug: string;
    type: "COFFEE" | "MERCH";
    description: string | null;       // truncated to ~200 chars
    tastingNotes: string[];
    origin: string[];
    roastLevel: string | null;
    isFeatured: boolean;
    primaryCategory: { name: string; slug: string } | null;
    primaryImage: { url: string; altText: string } | null;
    minPriceInCents: number | null;   // for sort/display
  }>;
  generatedAt: string;                // ISO timestamp for cache busting
}
```

`Cache-Control: public, max-age=60, stale-while-revalidate=300` — short TTL, refreshed often.

### Modified: `GET /api/search` (legacy keyword route)

- Drop the `type: ProductType.COFFEE` hardcode (allow merch through)
- Fix the "FTS-zero on roast pattern" bug — return empty results, not all products in roast category
- Otherwise unchanged

### New: `GET /api/admin/search-drawer-settings` + `PUT /api/admin/search-drawer-settings`

Read + write the three `SiteSettings` keys (heading, chip categories, curated category). Admin-gated. Zod validation on PUT enforces the 6-chip cap and heading length.

---

## Frontend components

```text
app/(site)/_components/search/
├── SearchDrawer.tsx                  # Radix Dialog shell, responsive
├── SearchInput.tsx                   # input + magnifier icon + close
├── SearchEmptyState.tsx              # chips + curated products section
├── SearchResults.tsx                 # results list with fade-in
├── SearchNoResults.tsx               # "no results for X" + curated products
├── CuratedCategoryChips.tsx          # chip row from settings
├── CuratedProducts.tsx               # product grid from settings.curated_category
└── hooks/
    ├── useSearchIndex.ts             # fetch + memoize MiniSearch instance
    └── useSearchAnalytics.ts         # debounced UserActivity logging
```

```text
app/admin/settings/search/
├── page.tsx                             # admin Search settings page
└── _components/
    ├── SearchSettingsForm.tsx           # parent form, wires save → PUT
    ├── ChipsHeadingField.tsx            # text input (setting 1)
    ├── TopCategoriesMultiSelect.tsx     # wraps CheckboxListContent (setting 2); enforces max-6 via per-item disabled
    └── CuratedCategorySelect.tsx        # shadcn Combobox single-select (setting 3)
```

---

## Acceptance Criteria

(Full ACs in [`acs.md`](acs.md). Summary below.)

- **UI:** drawer fullscreen on mobile, top-anchored on desktop with backdrop blur; empty/results/no-results states render correctly; admin form enforces 6-chip cap visually; chips + curated products visible on storefront
- **FN:** client-side search runs every keystroke (sub-ms); admin Zod max-6 enforced server-side; merch returned by both drawer and legacy `/api/search`; honest no-results on legacy route; UserActivity debounced
- **TST:** MiniSearch search returns expected fuzzy + field-weighted results for fixture catalog; new `/api/search/index` endpoint returns valid shape; legacy route merch fix + no-results fix have tests
- **REG:** precheck clean; full Jest suite passes; storefront homepage unchanged; existing `/search?q=` route still works

---

## Verification

**Pre-flight:**

1. Dev server running (`npm run dev`)
2. Branch registered in `.claude/verification-status.json` with status `"planned"`

**During implementation:**

- After each commit: `npm run precheck` (Husky pre-commit handles this automatically)
- After commit 3 (MiniSearch integration): manually verify "air dripper" returns the dripper, "Yirgachefe" matches Yirgacheffe
- After commit 6 (admin form): create a hidden category, set as curated, verify it appears in drawer

**End-to-end (post-implementation, before PR):**

1. `npm run precheck` — TS + ESLint clean
2. `npm run test:ci` — all green
3. **Manual storefront UX walk:**
   - Click search trigger in header → drawer opens
   - Empty state shows chips + curated products
   - Type "air dripper" → see Origami Air Dripper (merch) in results
   - Type "Yirgachefe" (typo) → fuzzy match returns Ethiopia Yirgacheffe
   - Type "zzzzz" → "No results for 'zzzzz'" + curated products fallback
   - Click chip → navigates to category page
   - Mobile (<768px): drawer is fullscreen
   - Desktop (≥768px): drawer is top-anchored with backdrop blur
4. **Manual admin UX walk:**
   - Navigate to **Settings → Search** in admin nav (item appears between Commerce and Shipping)
   - Edit the **Curated section heading** field; verify it updates the drawer's "Most Popular" heading
   - Open the **Top Categories** multi-select; pick 6 categories; verify chips render with × delete buttons; verify the add affordance disables at 6
   - Open the **Curated products category** single-select; verify hidden categories (`isVisible: false`) appear as options; pick one
   - Click **Save** → toast confirms; reopen drawer to see settings reflected
   - Refresh admin page → form re-populates with saved values
5. **Legacy route check:** `/api/search?q=air+dripper` returns merch (not just coffee)
6. **No console errors / no LLM API calls during typical browse session**

---

## Critical files

| File | Action |
|---|---|
| `app/(site)/_components/search/SearchDrawer.tsx` and siblings | New — drawer shell + content |
| `app/api/search/index/route.ts` | New — catalog index endpoint |
| `app/api/search/route.ts` | Modify — drop COFFEE hardcode, fix no-results |
| `app/api/admin/search-drawer-settings/route.ts` | New — admin GET/PUT, Zod validation |
| `app/admin/settings/search/page.tsx` + `_components/` | New — admin Search settings page (heading + chip multi-select + curated single-select) |
| `lib/navigation/route-registry.ts` | Add `admin.settings.search` route entry per `docs/navigation/README.md` |
| `lib/config/admin-nav.ts` | Add `{ label: "Search", href: "/admin/settings/search" }` between Commerce and Shipping (both occurrences in the file) |
| `app/(site)/_components/layout/SiteHeader.tsx` | Replace `/search` link with drawer trigger |
| `app/(site)/_components/layout/SiteHeaderWrapper.tsx` | Pass curation settings to header (or fetch in drawer directly) |
| `lib/data.ts` | Add `getSearchIndex()` data fetcher |
| `lib/site-settings.ts` | Add `searchDrawerChipsHeading` + `searchDrawerChipCategories` + `searchDrawerCuratedCategory` to `SiteSettings` shape |
| `package.json` | Add `minisearch` dependency |

---

## Demo configuration (prod demo app)

Baked into `prisma/seed/settings.ts` as authoritative defaults. **Reseed overwrites** the three search-drawer settings via `upsert({ where, update: { value }, create })` — same pattern as `app.weightUnit` / `app.locationType` in the existing seed. This keeps the demo showcase fresh on every refresh.

**Demo lifecycle:**

1. Seed runs → search settings reset to the demo defaults below
2. Demo admin changes settings via the Search settings UI → writes persist to DB (no demo-mode guard blocks the mutation)
3. Next reseed → demo defaults restored

Demo admins can experiment freely between reseeds. Demo guests always see the curated showcase on a fresh deploy.

| Setting | Seed default value | Storage key |
|---|---|---|
| **Chips section heading** | `Top Categories` | `search_drawer_chips_heading` |
| **Top Categories** (slugs in order) | `["single-origin", "fruity-floral", "medium-roast", "cold-brew-blends", "drinkware", "central-america"]` | `search_drawer_chip_categories` |
| **Curated products category** | `staff-picks` | `search_drawer_curated_category` |

### Category prerequisites

Of the 7 categories referenced (6 chips + 1 curated), only `Single Origin` and `Medium Roast` currently exist in `prisma/seed/categories.ts`. The remaining 5 — `Fruity & Floral`, `Cold Brew Blends`, `Drinkware`, `Central America`, and `Staff Picks` — must be added to the categories seed so a fresh `npm run seed` produces a fully-configured demo.

**Slugs to add (using existing `upsert + update: {}` pattern so admin's catalog work survives reseed):**

| Name | Slug | Notes |
|---|---|---|
| Fruity & Floral | `fruity-floral` | New category; admin associates with relevant coffees |
| Cold Brew Blends | `cold-brew-blends` | New category |
| Drinkware | `drinkware` | New merch category |
| Central America | `central-america` | New origin category |
| Staff Picks | `staff-picks` | Used as the curated category in search drawer |

> **Note on the two patterns:** Search drawer settings reset on reseed (`update: { value }`) because they're showcase configuration. New categories follow the existing categories-seed pattern (`update: {}`) because admin catalog work — adding products, linking labels — is creative output the admin shouldn't lose on reseed. Same file, two different patterns, intentional.

The seed adds the categories with no products attached — admin populates them via Menu Builder per existing workflow. Default `isVisible: true`; admin decides whether to add label associations to surface them in the storefront menu (per the discussion 2026-04-25, this is independent of search drawer use).

### Demo-mode write gating

The `PUT /api/admin/search-drawer-settings` endpoint must **not** be blocked by demo-mode guards. Search settings are an explicit exception to whatever read-only / sandboxed admin policies the demo build enforces elsewhere. Implementation: ensure the endpoint's auth middleware doesn't include `requireNotDemo()` (or whatever the project's demo-block helper is named) — only `requireAdminApi()`.
