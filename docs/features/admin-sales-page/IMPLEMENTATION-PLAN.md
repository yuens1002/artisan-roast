# Implementation Plan — Admin Sales Page

> **Route:** `/admin/sales`
> **Branch:** `feat/sales-analytics`
> **Depends on:** Shared primitives from Commits 1–3 (see admin-overview IMPLEMENTATION-PLAN)
> **Date:** 2026-03-04

---

## Overview

The Sales page is a **client-side interactive** page (unlike the server-rendered Overview). Uses SWR for data fetching so the admin can change filters, dates, and chart views without full page reloads.

---

## Commit 7 — `feat: add sales API route with filtering and pagination`

**File created:** `app/api/admin/sales/route.ts`

### Endpoint

```text
GET /api/admin/sales?from=&to=&compare=previous&orderType=ALL&status=&productId=&categoryId=&promoCode=&location=&page=1&pageSize=25&sort=createdAt&dir=desc
```

### Query Params (Zod-validated)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `from` | ISO date string | 30 days ago | Period start |
| `to` | ISO date string | now | Period end |
| `compare` | `"previous"\|"lastYear"\|"none"` | `"previous"` | Comparison mode |
| `orderType` | `"ALL"\|"SUBSCRIPTION"\|"ONE_TIME"` | `"ALL"` | Filter by purchase type |
| `status` | comma-separated OrderStatus values | all | Filter by order status |
| `productId` | string | — | Filter by product |
| `categoryId` | string | — | Filter by category |
| `promoCode` | string | — | Filter by promo code |
| `location` | string | — | Filter by state |
| `page` | number | 1 | Pagination |
| `pageSize` | number | 25 | Rows per page |
| `sort` | string | `"createdAt"` | Sort column |
| `dir` | `"asc"\|"desc"` | `"desc"` | Sort direction |

### Response Shape

```ts
{
  period: { from: string; to: string };
  comparison: { from: string; to: string } | null;

  // KPIs
  kpis: {
    revenue: number;              // cents
    netRevenue: number;           // revenue - refunds
    orders: number;
    aov: number;                  // cents
    refundAmount: number;         // cents
    refundRate: number;           // 0-100
    fulfillmentRate: number;      // 0-100
    avgItemsPerOrder: number;
    subscriptionRevenue: number;  // cents
    oneTimeRevenue: number;       // cents
    subscriptionPercent: number;  // 0-100
    promoOrderPercent: number;    // 0-100
  };
  comparisonKpis: { /* same shape */ } | null;

  // Chart data
  revenueByDay: { date: string; revenue: number; orders: number }[];
  comparisonByDay: { date: string; revenue: number; orders: number }[] | null;
  categoryBreakdown: { category: string; kind: "COFFEE"|"MERCH"|"BOTH"; revenue: number; orders: number }[];
  ordersByStatus: { status: string; count: number }[];
  purchaseTypeSplit: { type: "ONE_TIME"|"SUBSCRIPTION"; revenue: number; orders: number }[];
  salesByLocation: { state: string; city: string; orders: number; revenue: number }[];
  coffeeByWeight: { product: string; weightSoldGrams: number; quantity: number }[];

  // Breakdown lists
  topProducts: { name: string; slug: string; quantity: number; revenue: number; weightSoldGrams: number }[];
  topLocations: { state: string; orders: number; revenue: number }[];

  // Paginated table
  table: {
    rows: SalesRow[];
    total: number;
    page: number;
    pageSize: number;
  };
}
```

### `SalesRow` (table row type)

```ts
{
  id: string;               // order ID
  orderNumber: string;      // display ID (truncated cuid or sequential)
  createdAt: string;        // ISO
  customerEmail: string | null;
  customerName: string | null;  // from user.name or recipientName
  itemCount: number;
  orderType: "ONE_TIME" | "SUBSCRIPTION";
  promoCode: string | null;
  subtotal: number;         // cents (sum of items)
  discount: number;         // cents
  tax: number;              // cents
  shipping: number;         // cents
  total: number;            // cents
  refunded: number;         // cents
  status: string;
  city: string | null;
  state: string | null;
}
```

### Prisma Query Strategy

All queries filter by the same base `where` clause built from params:

```ts
const baseWhere = {
  createdAt: { gte: from, lte: to },
  ...(statusFilter && { status: { in: statusFilter } }),
  ...(promoCode && { promoCode }),
  ...(location && { shippingState: location }),
  // orderType filter applied via join to OrderItem → PurchaseOption
  status: { notIn: ["CANCELLED", "FAILED"] },  // for KPIs only; table shows all
};
```

| Data | Query |
|------|-------|
| KPIs | `order.aggregate` (sums) + `order.count` + `orderItem` joins for type split |
| Revenue by day | `order.findMany({ select: { totalInCents, createdAt } })` → JS `Map<dateString, { revenue, orders }>` |
| Category breakdown | `orderItem.findMany` with product → category includes → JS groupBy category |
| Orders by status | `order.groupBy({ by: ["status"], _count: true })` |
| Purchase type split | `orderItem.findMany` with purchaseOption include → JS groupBy type |
| Sales by location | `order.findMany({ select: { shippingState, shippingCity, totalInCents } })` → JS groupBy state |
| Coffee by weight | `orderItem.findMany` with variant + product include → filter `product.type=COFFEE` → JS sum `variant.weight × quantity` |
| Top products | Derived from orderItem groupBy, sorted by revenue desc, take 10 |
| Top locations | Derived from salesByLocation, sorted by revenue desc, take 10 |
| Table rows | `order.findMany` with includes, offset/limit pagination, dynamic orderBy |
| Table total | `order.count` with same filters (for pagination) |
| Comparison KPIs | Same KPI queries with comparison date range |

**Testing:** Unit test for KPI computation (mock Prisma responses, verify math)

---

## Commit 8 — `feat: sales page shell with filter bar, KPI grid, and chart workspace`

### Files Created

| File | Purpose | Implementation |
|------|---------|---------------|
| `app/admin/sales/page.tsx` | Server component: auth guard + metadata | Auth check via `auth()`, redirect if not admin. `generateMetadata()` for SEO. Renders `<SalesClient />`. |
| `app/admin/sales/SalesClient.tsx` | Main client component | `"use client"`. State: `period`, `compare`, `filters`. SWR fetch: `useSWR(\`/api/admin/sales?${params}\`)`. Renders:`PageTitle` → `PeriodSelector` (state-sync) + Export button → KPI grid → `SalesChartWorkspace` → `SalesBreakdownPanel` → Sales table (via `useSalesTable`). |
| `app/admin/sales/SalesChartWorkspace.tsx` | Tabbed chart area | `ChartCard` with tabs: "Revenue Trend", "By Category", "Sub Split", "By Location", "Order Status". Active tab renders the appropriate chart (`TrendChart`, `HBarChart`, `DonutChart`). Comparison overlay on Revenue Trend tab. |

### KPI Cards Selected (8 cards, 2 rows of 4)

| Card | Format | Drill Link |
|------|--------|------------|
| Total Revenue | currency | — |
| Net Revenue | currency | — |
| Orders | number | `/admin/orders` |
| AOV | currency | — |
| Refund Rate | percent | — |
| Fulfillment Rate | percent | — |
| Subscription Rev % | percent | — |
| Promo Orders % | percent | — |

All cards show delta badge from comparison period.

---

## Commit 9 — `feat: sales page — DataTable, breakdown panel, CSV export`

### Sales Table Architecture

The sales report table follows the exact same declarative config pattern as the products table (`useProductsTable`) and reviews table (`useReviewsTable`):

```text
useSalesTable (hook)
  ├── ColumnDef<SalesRow>[]         — column definitions with meta
  ├── FilterConfig[]                — declarative filter configs
  ├── filterToColumnFilters()       — maps ActiveFilter → ColumnFiltersState
  ├── useDataTable()                — TanStack table instance + state
  └── useColumnVisibility()         — togglable columns + alwaysHidden
          ↓
SalesClient (page)
  ├── DataTableActionBar config     — wired from useSalesTable returns
  ├── DataTable                     — renders the table
  └── Empty                         — no-data state
```

### Files Created

| File | Purpose |
|------|---------|
| `app/admin/sales/hooks/useSalesTable.tsx` | Table hook (see detail below) |
| `app/admin/sales/SalesBreakdownPanel.tsx` | 3× `RankedList` in 3-col grid |

### `useSalesTable` — Full Specification

Follows `useProductsTable` / `useReviewsTable` pattern exactly:

```ts
interface UseSalesTableOptions {
  rows: SalesRow[];            // from API response table.rows
}

export function useSalesTable({ rows }: UseSalesTableOptions) {
  // 1. useColumnVisibility with ALWAYS_HIDDEN + TOGGLABLE_COLUMNS
  // 2. Column defs via useMemo
  // 3. FilterConfigs via useMemo
  // 4. filterToColumnFilters via useCallback
  // 5. useDataTable({ ... storageKey: "sales-table-state" })
  // 6. Return { table, searchQuery, setSearchQuery, activeFilter, setActiveFilter,
  //            filterConfigs, columnVisibility, handleVisibilityChange }
}
```

#### Column Definitions

| Column ID | Header | Size | Sorting | Responsive | Cell Renderer | Notes |
|-----------|--------|------|---------|------------|---------------|-------|
| `orderNumber` | Order # | 100 | ✓ | `pin: "left"` | Truncated cuid | Font medium |
| `createdAt` | Date | 120 | ✓ | desktop | `format(date, "MMM d, h:mm a")` | Default sort desc |
| `customerName` | Customer | 140 | ✓ | desktop | Name fallback to email | — |
| `itemCount` | Items | 60 | ✓ | desktop | Number | — |
| `orderType` | Type | 100 | ✓ | desktop | Badge: "Sub" / "One-time" | — |
| `promoCode` | Promo | 100 | ✗ | desktop, alwaysHidden | Code string or "—" | Hidden by default, togglable |
| `subtotal` | Subtotal | 90 | ✓ | desktop, alwaysHidden | `formatPrice()` | Hidden by default, togglable |
| `discount` | Discount | 90 | ✓ | desktop, alwaysHidden | `formatPrice()` | Hidden by default, togglable |
| `tax` | Tax | 80 | ✓ | desktop, alwaysHidden | `formatPrice()` | Hidden by default, togglable |
| `shipping` | Shipping | 80 | ✓ | desktop, alwaysHidden | `formatPrice()` | Hidden by default, togglable |
| `total` | Total | 100 | ✓ | all | `formatPrice()` | Font medium |
| `refunded` | Refunded | 90 | ✓ | desktop | `formatPrice()`, red if >0 | — |
| `status` | Status | 110 | ✓ | all | `StatusBadge` from `components/shared/` | — |
| `location` | Location | 130 | ✓ | desktop | `city, state` | — |
| `mobileTotal` | Total | 80 | ✗ | mobile | `formatPrice()` | Mobile summary |
| `mobileActions` | — | 48 | ✗ | mobile | `RowActionMenu` | — |
| `actions` | — | 48 | ✗ | desktop | `RowActionMenu` | — |

#### Filter Configs (extends existing `FilterConfig` type system)

```ts
const filterConfigs: FilterConfig[] = [
  {
    id: "createdAt",
    label: "Dates",
    shellLabel: "dates",
    filterType: "dateRange",           // existing type in DataTableFilter
  },
  {
    id: "status",
    label: "Status",
    filterType: "multiSelect",         // existing type in DataTableFilter
    options: [
      { label: "Delivered", value: "DELIVERED" },
      { label: "Shipped", value: "SHIPPED" },
      { label: "Pending", value: "PENDING" },
      { label: "Cancelled", value: "CANCELLED" },
      { label: "Failed", value: "FAILED" },
      { label: "Picked Up", value: "PICKED_UP" },
      { label: "Out for Delivery", value: "OUT_FOR_DELIVERY" },
    ],
  },
  {
    id: "orderType",
    label: "Order Type",
    filterType: "multiSelect",         // existing type in DataTableFilter
    options: [
      { label: "One-time", value: "ONE_TIME" },
      { label: "Subscription", value: "SUBSCRIPTION" },
    ],
  },
  {
    id: "total",
    label: "Total",
    shellLabel: "total $",
    filterType: "comparison",          // existing type in DataTableFilter
  },
];
```

**Key point:** All four filter types (`dateRange`, `multiSelect`, `comparison`) already exist in `DataTableFilter.tsx`'s `FILTER_RENDERERS` registry. No new filter types needed for MVP.

#### `filterToColumnFilters` mapping

```ts
function salesFilterToColumnFilters(filter: ActiveFilter): ColumnFiltersState {
  switch (filter.configId) {
    case "createdAt":
      return filter.value ? [{ id: "createdAt", value: filter.value }] : [];
    case "status":
      return Array.isArray(filter.value) && filter.value.length > 0
        ? [{ id: "status", value: filter.value }] : [];
    case "orderType":
      return Array.isArray(filter.value) && filter.value.length > 0
        ? [{ id: "orderType", value: filter.value }] : [];
    case "total":
      return typeof filter.value === "number"
        ? [{ id: "total", value: { operator: filter.operator ?? "=", num: filter.value * 100 } }] : [];
    default:
      return [];
  }
}
```

#### Column Filter Functions (on column defs)

```ts
// dateRange filter — same pattern as useReviewsTable
filterFn: (row, _columnId, filterValue: DateRangeFilterValue) => {
  if (!filterValue?.from || !filterValue?.to) return true;
  return isWithinInterval(new Date(row.original.createdAt), {
    start: filterValue.from, end: filterValue.to,
  });
}

// multiSelect filter — same pattern as useReviewsTable (rating) / useProductsTable (categories)
filterFn: (row, _columnId, filterValue: string[]) => {
  if (!filterValue || filterValue.length === 0) return true;
  return filterValue.includes(row.original.status);
}

// comparison filter — reuse comparisonFilter from useProductsTable
filterFn: (row, _columnId, filterValue) =>
  comparisonFilter(row.original.total, filterValue);
```

#### ActionBarConfig (in SalesClient, wired to useSalesTable)

```ts
const actionBarConfig: ActionBarConfig = {
  left: [
    {
      type: "button",
      label: "Export CSV",
      icon: Download,
      onClick: handleExportCsv,
      variant: "outline",
      iconOnly: "below-lg",
    },
    {
      type: "search",
      value: searchQuery,
      onChange: setSearchQuery,
      placeholder: "Search orders...",
      collapse: { icon: Search },
    },
    {
      type: "filter",
      configs: filterConfigs,
      activeFilter,
      onFilterChange: setActiveFilter,
      collapse: { icon: Filter },
    },
  ],
  right: [
    {
      type: "custom",
      content: (
        <ColumnVisibilityToggle
          columns={TOGGLABLE_COLUMNS}
          visibility={columnVisibility}
          onVisibilityChange={handleVisibilityChange}
        />
      ),
    },
    {
      type: "recordCount",
      count: table.getFilteredRowModel().rows.length,
      label: "orders",
    },
    { type: "pageSizeSelector", table },
    { type: "pagination", table },
  ],
};
```

This follows the exact same `ActionBarConfig` slot structure as `ProductManagementClient.tsx`.

#### Togglable Columns

```ts
const ALWAYS_HIDDEN = { promoCode: false, subtotal: false, discount: false, tax: false, shipping: false };

export const TOGGLABLE_COLUMNS = [
  { id: "promoCode", label: "Promo Code" },
  { id: "subtotal", label: "Subtotal" },
  { id: "discount", label: "Discount" },
  { id: "tax", label: "Tax" },
  { id: "shipping", label: "Shipping" },
  { id: "refunded", label: "Refunded" },
  { id: "location", label: "Location" },
];
```

### Row Actions (deferred order detail)

```ts
const items: RowActionItem[] = [
  {
    type: "item",
    label: "View in Orders",
    icon: ExternalLink,
    onClick: () => router.push(`/admin/orders?highlight=${row.original.id}`),
  },
  // Future: { type: "item", label: "Order Detail", ... }
];
```

### CSV Export

- Button in the `ActionBarConfig` left slot triggers `exportToCsv()` from `lib/analytics/csv-export.ts`
- Exports all rows from `table.getFilteredRowModel().rows` (client-side filtered data)
- Columns match visible table columns (respects column visibility)
- Filename: `sales-export-{from}-to-{to}.csv`

### SalesBreakdownPanel

3-column grid (stacked on mobile): `RankedList` for Top Products (qty + revenue), Top Locations (orders + revenue), Top Categories (revenue). Data from API response.

### Table Row Click

- **Deferred:** Order detail page doesn't exist yet.
- `onRowDoubleClick` navigates to `/admin/orders?highlight=${id}` to jump to existing orders page.
- Future backlog ticket: `/admin/orders/[id]` detail page.

---

## Data Flow

```text
Admin lands on /admin/sales
        ↓
SalesClient mounts with default state (30d, compare=previous, no filters)
        ↓
SWR fetches GET /api/admin/sales?period defaults
        ↓
Response populates: KPI cards, chart workspace, breakdown lists, table
        ↓
Admin changes filter/period → state updates → SWR re-fetches → UI updates
        ↓
Admin clicks "Export CSV" → fetch all matching rows → download
```

---

## States

| State | Behavior |
|-------|----------|
| **Loading (initial)** | `SkeletonDashboard` for KPI area + chart. Table shows row skeletons. |
| **Loading (filter change)** | Existing data stays visible (SWR `keepPreviousData`), subtle loading indicator on period selector. |
| **No data** | KPI cards show "—". Charts show centered "No sales data for selected filters" with Reset Filters button. Table shows `Empty` component. |
| **Error** | Toast notification + section-level error message with retry button. |
| **Partial data** | Sections render independently — if table loads but chart errors, chart shows error while table works. |

---

## Acceptance Criteria (from README)

| # | AC | How Verified |
|---|-----|-------------|
| 1 | `/admin/sales` route exists, loads with default 30-day range | Navigate to page, verify loads |
| 2 | KPI cards display accurate values and prior-period deltas | Compare KPI values against manual Prisma query |
| 3 | At least 3 chart views available (trend, split, breakdown) | Screenshot of each chart tab |
| 4 | Sales table supports sorting, pagination, and key filters | Interact with table: sort by Total, paginate, filter by status |
| 5 | CSV export returns data matching active filters and visible totals | Export with filters applied, verify CSV contents match table |
| 6 | Subscription vs one-time metrics clearly visible and consistent | Check Sub Split chart + Subscription Rev % KPI card |
| 7 | Page handles no-data periods gracefully | Select future date range, verify empty states render |

---

## Full Commit Schedule (All 9 Commits)

| # | Scope | Description | Files |
|---|-------|-------------|-------|
| 1 | `chore` | Install recharts via shadcn chart | `components/ui/chart.tsx`, `package.json` |
| 2 | `feat` | Shared analytics utilities | `lib/analytics/*` (5 files + tests) |
| 3 | `feat` | Shared analytics UI primitives | `app/admin/_components/analytics/*` (13 components + barrel) |
| 4 | `feat` | Dashboard API route | `app/api/admin/dashboard/route.ts` |
| 5 | `feat` | Overview page — KPIs, alerts, trend, funnel | `app/admin/page.tsx`, `AdminDashboardClient.tsx`, 2 section components |
| 6 | `feat` | Overview page — mix, top movers, nav update | `lib/config/admin-nav.ts`, 2 section components |
| 7 | `feat` | Sales API route | `app/api/admin/sales/route.ts` |
| 8 | `feat` | Sales page — shell, filters, KPIs, charts | `app/admin/sales/` (4 files) |
| 9 | `feat` | Sales page — breakdown, table, CSV, tests | `app/admin/sales/` (3 files + hook + tests) |

---

## Deferred to Backlog

| Item | Ticket |
|------|--------|
| Order detail page (`/admin/orders/[id]`) | Separate feature — table row click disabled until built |
| Chart → table cross-filtering (click category segment → filter table) | Phase 2 enhancement |
| Coffee by weight chart (bottom of sales page) | Included in chart workspace as optional tab if time allows, otherwise Phase 2 |
| Sales report table footer totals | Phase 2 — requires summing visible page vs all-pages (UX decision needed) |

---

## Gap-Fix Patch Plan (Modularity, Reuse, Maintainability)

This section is an explicit patch on top of the current plan. If any earlier section conflicts with this, **this section wins**.

### P0 (Must Fix Before Sales Buildout)

#### 1) Server-Authoritative Filtering/Sorting/Pagination

Prevent client/server drift by making backend the source of truth for table data operations.

**Requirements:**

- URL/search params define all filter/sort/pagination state.
- API executes filtering/sorting/pagination; client table reflects server-returned rows.
- Client-side DataTable filters are UI controls only (state emitters), not a second data authority.

#### 2) Export Parity Contract

Resolve CSV mismatch risk between current page subset and full filtered dataset.

**New route:**

- `GET /api/admin/sales/export` (same validated filter contract as `/api/admin/sales`)

**Requirements:**

- Export always uses server-side query with full matching scope.
- Export and table share identical where-builder.
- Export includes metadata row block (from/to, compare mode, applied filters).

#### 3) Shared Query/Filter Builder Reuse

No duplicated where-clause assembly across routes.

**New files:**

- `lib/admin/analytics/filters/build-sales-filters.ts`
- `lib/admin/analytics/services/get-sales-analytics.ts`
- `lib/admin/analytics/queries/sales-queries.ts`

**Requirements:**

- `build-sales-filters.ts` is reused by both sales data route and export route.
- Query modules handle DB interaction only; services compose metrics and payloads.

#### 4) Shared Contracts + Unit Semantics

Align payload typing and metric units with overview.

**Requirements:**

- Use `lib/admin/analytics/contracts.ts` as single response contract source.
- Currency units are cents end-to-end.
- Percentage values are normalized ratios (`0..1`) in API payload and formatted in UI.
- KPI cards never infer business logic locally.

#### 5) Canonical Time Policy Reuse

Reuse shared time handling from overview patch.

**Requirements:**

- Import period/bucket functions from shared `time.ts`.
- Use `[fromInclusive, toExclusive)` in sales route and export route.
- Comparison windows use same helper as overview.

---

### P1 (High-Value Refactor During Sales Implementation)

#### 6) Split `SalesClient` by Responsibility

Reduce component complexity and improve testability.

**Target split:**

- `SalesFiltersController` (URL/search params + change handlers)
- `SalesDataController` (SWR query, loading/error, retry)
- `SalesView` (presentational composition only)

#### 7) API Composition Tests + Golden Fixtures

Add stable verification against drift.

**Requirements:**

- Contract test validates `/api/admin/sales` response shape.
- Golden fixture test validates KPI calculations for known dataset.
- Export parity test validates `/api/admin/sales/export` row set equals equivalent unpaginated filter query.

#### 8) Performance Observability

Track bottlenecks early.

**Requirements:**

- Log query-block durations and total response time in sales service.
- Flag slow requests over threshold.
- Ensure logs include filter cardinality context (without sensitive data).

---

### Updated Commit Sequence (Patch)

Use this sequence for sales-related work (builds on shared overview patch commits):

1. `feat: add shared sales filter builder, query module, and sales service`
2. `feat: implement typed /api/admin/sales using shared service`
3. `feat: implement /api/admin/sales/export with parity contract`
4. `feat: build sales page controllers and presentational view split`
5. `feat: wire server-authoritative table controls and chart workspace`
6. `feat: add breakdown panel and export action wiring`
7. `test: add contract, golden-fixture, and export parity tests`
8. `chore: add observability and slow-query logging`

---

### Definition of Done Additions

The Sales implementation is not complete until:

1. Table rows, totals, and export are generated by the same server filter contract.
2. No duplicated filter-building logic exists across sales data and export routes.
3. Sales payload compiles against shared analytics contracts.
4. `SalesClient` responsibilities are split so rendering is decoupled from data orchestration.
5. Export parity and KPI golden-fixture tests pass.
