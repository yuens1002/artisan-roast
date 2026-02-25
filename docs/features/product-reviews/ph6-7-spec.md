# Product Reviews Phase 6-7 — Detailed Spec

**Branch:** `feat/reviews-ph6-7`
**Status:** Draft — awaiting review

---

## Phase 6: Admin Reviews Moderation Page

### Page Layout

```
/admin/reviews                                                Desktop (md+)
┌──────────────────────────────────────────────────────────────────────────────┐
│  PageTitle: "Review Moderation"                                              │
│  Subtitle: "Manage and moderate customer reviews"                            │
├──────────────────────────────────────────────────────────────────────────────┤
│  [ All ][ Published ][ Flagged ][ Removed ]              ← Tab bar (status) │
├──────────────────────────────────────────────────────────────────────────────┤
│  ActionBar                                                                   │
│  Left:  [🔍 Search reviews...]  [🔻 dates  📅 Select range ▾  [...]]        │
│  Right: [Reviews: 47] [R/P 25 ▾] [< 1 2 >]                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  Date ↕     │ Customer ↕ │ Product ↕ │ Content       │ ★ ↕  │ Status ↕ │ ⋮ │
│  ───────────┼────────────┼───────────┼───────────────┼──────┼──────────┼───│
│  2 days ago │ Ana M.     │ Ethiopian…│ Exceptional…⌝ │★★★★★ │ Published│ ⋮ │
│  1 week ago │ James P.   │ Breakfast…│ Great morni…⌝ │★★★★☆ │ Published│ ⋮ │
│  2 weeks ago│ Tom G.     │ Peru Org… │ Disappointi…⌝ │★★☆☆☆ │ Flagged  │ ⋮ │
│  ...        │            │           │               │      │          │   │
└──────────────────────────────────────────────────────────────────────────────┘
                                        ⌝ = hover shows detail card (see below)
```

```
/admin/reviews                                                Mobile (< md)
┌──────────────────────────────────────────┐
│  Review Moderation                        │
├──────────────────────────────────────────┤
│ [All][Published][Flagged][Removed] ← scrollable tab bar (drag-to-scroll)
│ [🔍] [🔻]                Reviews: 47    │  ← icons only, no pagination
├──────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐ │
│ │ ★★★★★  Published        2 days ago  │ │  ← status badge + date
│ │ Ethiopian Yirgacheffe               │ │  ← product name
│ │ Ana M. · ana.morales@example.com    │ │  ← customer
│ │ "Exceptional coffee!"               │ │  ← title
│ │ Bright citrus notes with a clean... │ │  ← content preview
│ │ ☕ V60 Pour Over                    │ │  ← brew method badge
│ │ 🍋 Citrus · 🍫 Chocolate · 🌸 Floral │ │  ← tasting notes
│ │ 15g · 250ml · 200°F · 3:30         │ │  ← recipe strip
│ │                              [⋮]    │ │  ← actions menu
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ ★★★★☆  Published       1 week ago   │ │
│ │ Breakfast Blend                      │ │
│ │ ...                                  │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

---

### Dual Layout Strategy

The reviews moderation page uses a **dual layout** — similar to `OrderManagementClient`:

| Breakpoint | Layout | Component |
|---|---|---|
| **< md (mobile)** | Card grid — 1 column on xs-sm, 2 columns on sm-md | `ReviewCard` (custom, NOT MobileRecordCard — review data shape differs) |
| **≥ md (desktop)** | TanStack DataTable with columns, sorting, pagination | `DataTable` composition via `useReviewsTable` |

**Responsive toggle:**
- Cards: `grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden`
- Table: `hidden md:block`

---

### Status Tab Bar

Uses shadcn `Tabs` + `TabsList` + `TabsTrigger` — positioned ABOVE the ActionBar.

```typescript
<Tabs value={statusFilter} onValueChange={setStatusFilter}>
  <TabsList
    ref={tabsListRef}
    className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab"
  >
    <TabsTrigger value="all" className="shrink-0">All</TabsTrigger>
    <TabsTrigger value="PUBLISHED" className="shrink-0">Published</TabsTrigger>
    <TabsTrigger value="FLAGGED" className="shrink-0">Flagged</TabsTrigger>
    <TabsTrigger value="REMOVED" className="shrink-0">Removed</TabsTrigger>
  </TabsList>
</Tabs>
```

- **Scrollable** on mobile (drag-to-scroll, hidden scrollbar) — same pattern as VariantsSection
- Client-side filter: `statusFilter === "all" ? allReviews : allReviews.filter(r => r.status === statusFilter)`
- Tab bar does NOT show counts (clean labels only)

---

### Table Columns — Desktop (≥ md / 768px)

| # | Column ID | Header | Width | Sortable | Description |
|---|-----------|--------|-------|----------|-------------|
| 1 | `date` | Date | 120px | **Yes (default desc)** | Relative date (e.g., "2 days ago"). Sorts on `createdAt` timestamp. |
| 2 | `customer` | Customer | 140px | Yes | User display name. Sorts alphabetically. |
| 3 | `product` | Product | 180px | Yes | Product name, truncated. Sorts alphabetically. |
| 4 | `content` | Content | flex | No | Review title (bold) + content preview, truncated. **Hover shows detail card.** |
| 5 | `rating` | ★ | 80px | Yes | StarRating (compact). Sorts on integer `rating`. |
| 6 | `status` | Status | 100px | Yes | Colored badge. Sorts on status string. |
| 7 | `actions` | _(none)_ | 48px | No | `RowActionMenu` (three-dot). Context-aware per status. |

**Notes:**
- No pinned/sticky columns — table scrolls horizontally if needed
- All columns visible at md+ (no responsive hiding needed since mobile uses cards)
- Columns 1-6 have `enableResizing: true`

### Column Details

#### Date

- `createdAt` rendered as relative date: "2 days ago", "1 week ago", "Jan 15, 2026"
- **Default sort column**, descending (newest first)
- `enableSorting: true`
- `accessorFn: (row) => row.createdAt` for proper date sorting (sorts on Date object, displays as relative string)

#### Customer

- Shows `user.name` (e.g., "Ana M.")
- **Fallback:** if `user.name` is null → show email prefix (e.g., `ana.morales` from `ana.morales@example.com`)
- `enableSorting: true` — alphabetical sort on display name

#### Product

- Shows `product.name` (e.g., "Ethiopian Yirgacheffe")
- `enableSorting: true` — alphabetical sort
- Text truncated with CSS `truncate` class
- `cellClassName: "font-medium"`

#### Content (with hover detail card)

- **Cell display:** Two-line layout:
  - **Line 1 (bold, `font-medium`):** Review title (if present)
  - **Line 2 (normal, `text-muted-foreground`):** Content preview
  - `line-clamp-2` for consistent row height
- **Not sortable**
- **On hover** → shows a detail HoverCard anchored to the cell, containing the review detail card (same layout as mobile card) **minus data already shown in other columns** (date, customer, product, rating, status). The hover card shows:
  - Review title (full, not truncated)
  - Full review content text
  - Brew method badge (e.g., "☕ V60 Pour Over")
  - Tasting notes (e.g., "🍋 Citrus · 🍫 Chocolate · 🌸 Floral")
  - Recipe strip (e.g., "15g · 250ml · 200°F · 3:30")
  - Flag reason (if status is FLAGGED)

#### Rating

- Renders existing `StarRating` component (compact, ~16px stars)
- Integer ratings 1-5 (no half-stars in reviews)
- `enableSorting: true` — numeric sort on `rating` field

#### Status

- Colored badge (inline, small):
  - `PUBLISHED` → `bg-emerald-50 text-emerald-700 border-emerald-200`
  - `FLAGGED` → `bg-amber-50 text-amber-700 border-amber-200`
  - `REMOVED` → `bg-red-50 text-red-700 border-red-200`
- `enableSorting: true` — alphabetical sort on status string

#### Actions (RowActionMenu)

Context-aware menu items based on the review's current status:

| Current Status | Menu Items |
|---|---|
| **PUBLISHED** | Flag (opens reason dialog) · _separator_ · Remove |
| **FLAGGED** | Restore · _separator_ · Remove |
| **REMOVED** | Restore · _separator_ · Permanently Delete _(destructive)_ |

---

### Mobile Review Card

A custom `ReviewCard` component (NOT reusing `MobileRecordCard` — the review data shape is too different from orders/subscriptions).

**Card layout (top → bottom):**

```
┌────────────────────────────────────────┐
│ ★★★★★  Published  badge    2 days ago  │  ← row: rating + status badge + date (right-aligned)
│ Ethiopian Yirgacheffe                  │  ← product name (font-medium)
│ Ana M. · ana.morales@example.com       │  ← customer name + email (muted)
│ "Exceptional coffee!"                  │  ← title (font-medium, italic quotes)
│ Bright citrus notes with a clean       │  ← content preview (line-clamp-3)
│ finish that lingers...                 │
│ ☕ V60 Pour Over                       │  ← brew method badge (if present)
│ 🍋 Citrus · 🍫 Chocolate · 🌸 Floral    │  ← tasting notes (if present)
│ 15g · 250ml · 200°F · 3:30            │  ← recipe strip (if present)
│ ⚠ Flagged: Spam                       │  ← flag reason (if FLAGGED, amber text)
│                                 [⋮]   │  ← actions dropdown (bottom-right)
└────────────────────────────────────────┘
```

**Grid:** `grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden`

Each card wraps in a shadcn `<Card>` with the review content inside.

---

### Desktop Content Hover Detail Card

When hovering over the Content cell in the desktop table, a `HoverCard` (shadcn) shows the **same card layout as mobile** but **excluding data already visible in other table columns** (date, customer, product, rating, status):

```
┌────────────────────────────────────────┐
│ "Exceptional coffee!"                  │  ← title (full, not truncated)
│                                        │
│ Bright citrus notes with a clean       │  ← full content text (no line-clamp)
│ finish that lingers. The fruity        │
│ acidity is perfectly balanced with     │
│ sweetness...                           │
│                                        │
│ ☕ V60 Pour Over                       │  ← brew method badge (if present)
│ 🍋 Citrus · 🍫 Chocolate · 🌸 Floral    │  ← tasting notes (if present)
│ 15g · 250ml · 200°F · 3:30            │  ← recipe strip (if present)
│ ⚠ Flagged: Spam                       │  ← flag reason (if FLAGGED)
└────────────────────────────────────────┘
```

**Implementation:** shadcn `HoverCard` component (new — needs `components/ui/hover-card.tsx`). `HoverCardTrigger` wraps the content cell, `HoverCardContent` renders the detail card.

**Max width:** `max-w-md` (~28rem). Content text scrolls if very long (`max-h-64 overflow-y-auto`).

---

### ActionBar Configuration

Follows the `ActionBarConfig` slot system.

#### Desktop (≥ lg / 1024px)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [🔍 Search reviews...] [🔻 dates 📅 Select range▾ ...] │ Reviews: 47 │ R/P 25▾│ < 1 2 > │
│ ← left slots                                             ← right slots              │
└─────────────────────────────────────────────────────────────────────┘
```

#### Tablet (md – lg)

```
┌───────────────────────────────────────────────┐
│ [🔍 Search reviews...] [🔻 dates 📅...] │ Reviews: 47 │ < 1 2 > │
│                                                      (no page size)       │
└───────────────────────────────────────────────┘
```

#### Mobile (< md / xs-sm)

```
┌───────────────────────────────────────┐
│ [🔍] [🔻]                Reviews: 47 │   ← icon-only search + filter, review count, NO pagination
└───────────────────────────────────────┘
```

- **Mobile omits pagination** — cards scroll infinitely (all loaded client-side, no virtual scroll needed at this scale)
- **Mobile shows review count** on the right side
- Search and filter collapse to **icon-only buttons** below lg (existing `collapse` config)
- Tapping icon expands slot full-width with back arrow (existing ActionBar pattern)
- Active filter shows red dot indicator on collapsed icon
- Page size selector: `hidden lg:flex` (existing behavior of `DataTablePageSizeSelector`)

#### ActionBar Code

```typescript
const actionBarConfig: ActionBarConfig = {
  left: [
    {
      type: "search",
      value: searchQuery,
      onChange: setSearchQuery,
      placeholder: "Search reviews...",
      collapse: { icon: Search },       // icon-only below lg
    },
    {
      type: "filter",
      configs: filterConfigs,
      activeFilter,
      onFilterChange: setActiveFilter,
      collapse: { icon: Filter },       // icon-only below lg
    },
  ],
  right: [
    {
      type: "recordCount",
      count: table.getFilteredRowModel().rows.length,
      label: "Reviews",
    },
    {
      type: "pageSizeSelector",          // hidden below lg (built-in)
      table,
    },
    {
      type: "pagination",               // hidden below md via custom class
      table,
      className: "hidden md:flex",
    },
  ],
};
```

**Search** filters across: product name, customer name, review title, review content.

---

### Filter System

Uses the existing `DataTableFilter` component. Filters are **mutually exclusive** — only one active at a time (matching products table UX). The `[...]` menu switches between filter types.

**Note:** Status filtering is handled by the Tab Bar (above), NOT by the filter system. The filter system handles date range and star rating only.

**Default state:** Date range filter active, showing "Select range" (no filtering applied).

#### Filter 1: Date Range (new filter type)

```
[ 🔻  dates   📅   Select range ▾   [...] ]
```

- **Type:** `dateRange` _(new — extends DataTableFilter)_
- **Shell:** Filter icon → "dates" label → calendar icon → dropdown trigger
- **Dropdown options (preset list):**
  - Pick a range → opens Calendar popover (two-month date range picker)
  - Last 7 days
  - Current month
  - Last 90 days
  - Last 6 months
- **After selection:** Shell shows the active range: "Last 7 days" or "Feb 17 – Feb 24"
- **Dependencies:** `react-day-picker` (new dep) + shadcn `Calendar` component (new) + `date-fns` (existing)

```typescript
{ id: "date", label: "Dates", shellLabel: "dates", filterType: "dateRange" }
```

**Filter value shape:**
```typescript
type DateRangeFilterValue = {
  preset: string;           // "last7" | "currentMonth" | "last90" | "last6mo" | "custom"
  from: Date;
  to: Date;
};
```

**Preset calculations:**

| Preset | From | To |
|---|---|---|
| Last 7 days | `subDays(now, 7)` | `now` |
| Current month | `startOfMonth(now)` | `now` |
| Last 90 days | `subDays(now, 90)` | `now` |
| Last 6 months | `subMonths(now, 6)` | `now` |
| Pick a range | user-selected start | user-selected end |

#### Filter 2: Star Rating (multiSelect)

```
[ 🔻  rating   Select... ▾   [...] ]
```

- **Type:** `multiSelect` (existing)
- **Options:** 5 items with star characters as labels

```typescript
{ id: "rating", label: "Rating", filterType: "multiSelect",
  options: [
    { label: "★★★★★", value: "5" },
    { label: "★★★★☆", value: "4" },
    { label: "★★★☆☆", value: "3" },
    { label: "★★☆☆☆", value: "2" },
    { label: "★☆☆☆☆", value: "1" },
  ]
}
```

#### Filter Type Switching

The `[...]` (MoreHorizontal) button opens a dropdown to switch filter types:

```
┌─────────────┐
│ None         │
│ Dates        │  ← default active
│ Rating       │
└─────────────┘
```

---

### DataTableFilter Extension

The existing `DataTableFilter` needs a new filter renderer for `dateRange`. Changes required:

**1. `types.ts`** — Extend `FilterConfig`:

```typescript
export type FilterConfig = {
  id: string;
  label: string;
  shellLabel?: string;
  filterType: "comparison" | "multiSelect" | "dateRange";  // add dateRange
  options?: { label: string; value: string }[];
};
```

**2. `DataTableFilter.tsx`** — Add `DateRangeFilterContent` renderer:

```typescript
// New renderer
function DateRangeFilterContent({ config, filter, onFilterChange }: FilterRendererProps) {
  // Renders: [calendar icon] [dropdown: preset list + "Pick a range"]
  // When "Pick a range" selected → opens Popover with Calendar (date range mode)
  // Display shows: preset label OR "Feb 17 – Feb 24" for custom ranges
}

// Register in renderer map
const FILTER_RENDERERS: Record<string, ComponentType<FilterRendererProps>> = {
  comparison: ComparisonFilterContent,
  multiSelect: MultiSelectFilterContent,
  dateRange: DateRangeFilterContent,        // NEW
};
```

**3. New component** — `components/ui/calendar.tsx` (shadcn Calendar wrapping `react-day-picker`)

**4. New component** — `components/ui/hover-card.tsx` (shadcn HoverCard for content detail)

**5. New dep** — `react-day-picker` package

---

### Dialogs

#### FlagReasonDialog

- **Trigger:** "Flag" action from RowActionMenu on a PUBLISHED review
- **Content:**
  - Title: "Flag Review"
  - Description: "This review will be hidden from the storefront. Please provide a reason."
  - Textarea: placeholder "Reason for flagging..." (required, min 1 char)
  - Footer: [Cancel] [Flag Review] (amber/warning variant)
- **On confirm:** PATCH `{ action: "flag", reason }` → refetch → toast "Review flagged"

#### RemoveConfirmDialog

- **Trigger:** "Remove" action from RowActionMenu
- **Content:**
  - Title: "Remove Review"
  - Description: "This will remove the review from the storefront. The review can be restored later."
  - Footer: [Cancel] [Remove] (destructive variant)
- **On confirm:** PATCH `{ action: "remove" }` → refetch → toast "Review removed"

#### PermanentDeleteDialog

- **Trigger:** "Permanently Delete" from RowActionMenu on a REMOVED review
- **Content:**
  - Title: "Permanently Delete Review"
  - Description: "This will permanently delete this review. This action cannot be undone."
  - Footer: [Cancel] [Delete Forever] (destructive variant)
- **On confirm:** DELETE → refetch → toast "Review permanently deleted"

---

### Data Flow

1. On mount: `fetch("/api/admin/reviews")` → returns all reviews with product + user data
2. Client-side: Tab bar filters by status, TanStack handles pagination, sorting (default: date desc), search, column filtering
3. Filter: date range/rating applied as TanStack column filters via `filterToColumnFilters`
4. Moderation action → API call → refetch reviews list → toast notification
5. Product rating summary recomputed server-side on every status change

---

### Navigation Changes (3 files)

**1. `lib/navigation/route-registry.ts`** — Between `admin.management.newsletter` and `admin.management.support`:

```typescript
{
  id: "admin.management.reviews",
  pathname: "/admin/reviews",
  matchMode: "exact",
  label: "Reviews",
  parentId: "admin.management",
  isNavigable: true,
},
```

**2. `lib/config/admin-nav.ts`** — `adminNavConfig` → Management children (after Newsletter, before Support):

```typescript
{ label: "Reviews", href: "/admin/reviews" },
```

**3. `lib/config/admin-nav.ts`** — `mobileNavConfig` → Management children (same position):

```typescript
{ label: "Reviews", href: "/admin/reviews" },
```

**Result:**
- Desktop "More" dropdown → Management section: All Users, Newsletter, **Reviews**, Support
- Mobile nav → Management accordion: All Users, Newsletter, **Reviews**, Support
- Breadcrumb: Home > Management > Reviews (auto from route registry `parentId`)

---

### Component Files

| File | Type | Description |
|------|------|-------------|
| `app/admin/reviews/page.tsx` | Server | `requireAdmin()` guard + PageTitle + mount client component |
| `app/admin/reviews/ReviewModerationClient.tsx` | Client | Fetches data, composes Tabs + ActionBar + DataTable + cards + dialogs |
| `app/admin/reviews/hooks/useReviewsTable.tsx` | Client | Column defs (`ColumnDef[]`), filter configs, `useDataTable()` call |
| `app/admin/reviews/_components/ReviewCard.tsx` | Client | Mobile card component for review display |
| `app/admin/reviews/_components/ReviewDetailCard.tsx` | Client | Shared detail card content (used in both mobile card and desktop hover) |

### Shared Component Changes

| File | Change |
|------|--------|
| `app/admin/_components/data-table/types.ts` | Add `"dateRange"` to `filterType` |
| `app/admin/_components/data-table/DataTableFilter.tsx` | Add `DateRangeFilterContent` renderer |
| `components/ui/calendar.tsx` | **NEW** — shadcn Calendar component (wraps `react-day-picker`) |
| `components/ui/hover-card.tsx` | **NEW** — shadcn HoverCard component |

---

## Phase 7: Review Request Email

### Email Template

**File:** `emails/ReviewRequestEmail.tsx`

**Subject:** "How was your coffee? Share a Brew Report!"

**Layout:**

```
┌──────────────────────────────────────────┐
│           [Artisan Roast Logo]           │
│                                          │
│  Hi {customerName},                      │
│                                          │
│  We hope you're enjoying your recent     │
│  order! Help fellow coffee lovers find   │
│  their perfect cup by sharing a Brew     │
│  Report.                                 │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ [img] Ethiopian Yirgacheffe       │  │
│  │       [Write a Brew Report →]     │  │
│  ├────────────────────────────────────┤  │
│  │ [img] Breakfast Blend             │  │
│  │       [Write a Brew Report →]     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Each CTA links to:                      │
│  /products/{slug}#reviews                │
│                                          │
│  ──────────────────────────────────────  │
│  Artisan Roast · artisanroast.app        │
└──────────────────────────────────────────┘
```

**Pattern:** Follows `OrderConfirmationEmail.tsx` using React Email components (`Html`, `Head`, `Body`, `Container`, `Section`, `Text`, `Button`, `Img`).

### Send Function

**File:** `lib/email/send-review-request.ts`

```typescript
interface ReviewRequestEmailData {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  products: Array<{ name: string; slug: string; imageUrl: string | null }>;
  storeName: string;
}

export async function sendReviewRequest(data: ReviewRequestEmailData): Promise<void>
```

Uses `resend.emails.send()` from `lib/services/resend.ts`.

### Cron Endpoint

**File:** `app/api/cron/review-emails/route.ts`

**Authorization:** Bearer token check against `CRON_SECRET` env var (follows `app/api/cron/heartbeat/route.ts` pattern).

**Eligible order query:**

```sql
SELECT o.*, u.email, u.name
FROM "Order" o
JOIN "User" u ON o."userId" = u.id
WHERE o.status = 'SHIPPED'
  AND o."shippedAt" < NOW() - INTERVAL '{emailDelayDays} days'
  AND u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ReviewEmailLog" rel
    WHERE rel."orderId" = o.id AND rel."userId" = u.id
  )
LIMIT 50
```

For each eligible order:
1. Find coffee products in the order that the user hasn't reviewed yet
2. If unreviewable products exist → send email
3. Log to `ReviewEmailLog` (one entry per user+product+order)
4. Skip if `reviews.enabled` setting is `false`

---

## Schema Change

**Add to Review model in `prisma/schema.prisma`:**

```prisma
flagReason    String?       // Admin-provided reason when flagging a review
```

Single additive column — no data migration needed.

---

## API Endpoints Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/admin/reviews` | Admin | List all reviews (any status) with product + user data |
| PATCH | `/api/admin/reviews/[reviewId]` | Admin | Flag / restore / remove a review |
| DELETE | `/api/admin/reviews/[reviewId]` | Admin | Permanently delete a review |
| GET | `/api/cron/review-emails` | CRON_SECRET | Send review request emails for eligible orders |

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| `react-day-picker` | Calendar component for date range filter |
