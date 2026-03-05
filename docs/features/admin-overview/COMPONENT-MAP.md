# Component Mapping — Admin Dashboard Pages

> **Scope:** `/admin` (Overview), `/admin/sales`, `/admin/analytics` (future refactor)
> **Goal:** Maximum reusability — shared primitives first, page-specific composition second.
> **Date:** 2026-03-04

---

## Layer Architecture

```text
Layer 1 — Shared Primitives (app/admin/_components/analytics/)
  Reusable across all 3 dashboard pages. Zero business logic.

Layer 2 — Shared Utilities (lib/analytics/)
  KPI formulas, date math, formatters, CSV export.

Layer 3 — API Routes (app/api/admin/)
  One route per page. Each returns pre-computed KPIs + chart data.

Layer 4 — Page Composition (app/admin/*, app/admin/sales/)
  Page-specific layouts composing Layer 1 primitives with page-specific data.
```

---

## Layer 1 — Shared Primitives

### New Components: `app/admin/_components/analytics/`

| Component | Props (key) | Description | Used By |
|-----------|-------------|-------------|---------|
| `PeriodSelector` | `value`, `onChange`, `presets[]`, `showCompare?` | Period preset buttons (7d/30d/90d/6mo/1yr) + comparison toggle dropdown (vs previous, vs last year, none). URL-synced variant for SSR pages, state variant for CSR. | Overview, Sales |
| `KpiCard` | `label`, `value`, `delta?`, `deltaLabel?`, `icon?`, `href?`, `format: "currency"\|"number"\|"percent"` | Stat card with formatted value, colored delta badge (↑ green / ↓ red), optional drill-through link. Extends existing Card/CardHeader/CardContent pattern. | Overview, Sales |
| `KpiChipBar` | `chips: { label, value, format }[]` | Horizontal row of small supporting metric pills. Scrollable on mobile. | Overview |
| `AlertStrip` | `alerts: { severity, message, href }[]` | Conditional banner showing operational warnings. Renders nothing when empty. | Overview |
| `ChartCard` | `title`, `description?`, `children`, `tabs?: { key, label }[]`, `activeTab?`, `onTabChange?` | Card wrapper for any chart. Optional tab row for switching chart views (e.g., Revenue Trend \| Category). | Overview, Sales |
| `TrendChart` | `data: { date, primary, secondary? }[]`, `primaryLabel`, `secondaryLabel?`, `comparisonData?[]` | Recharts AreaChart with dual Y-axis. Comparison period as dashed overlay. Responsive. | Overview, Sales |
| `DonutChart` | `data: { label, value, color? }[]`, `centerLabel?` | Recharts PieChart (donut). Center label for total. Legend below. | Overview, Sales |
| `HBarChart` | `data: { label, value }[]`, `valueFormat?` | Recharts horizontal BarChart. Used for category breakdowns. | Overview, Sales |
| `FunnelChart` | `steps: { label, value }[]` | Vertical funnel: Views → Cart → Orders with step-to-step conversion %. Built with styled divs + Recharts bar. | Overview, Analytics |
| `RankedList` | `items: { rank, label, value, href? }[]`, `valueLabel?`, `limit?` | Numbered list with value column. Clickable rows. "View all →" link at bottom. | Overview, Sales |
| `SplitComparison` | `left: { label, value, percent }`, `right: { label, value, percent }` | Side-by-side split visualization (e.g., Subscription vs One-time, New vs Repeat). Two colored bars. | Overview, Sales |
| `StatGrid` | `columns: number`, `children` | Responsive grid wrapper for KPI cards. Handles 2-col mobile, configurable desktop cols. | Overview, Sales |
| `SkeletonDashboard` | `sections: number` | Loading skeleton matching the card + chart layout. | Overview, Sales |

### Existing Components to Reuse (no changes needed)

| Component | From | Used For |
|-----------|------|----------|
| `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription` | `components/ui/card` | All cards, chart wrappers |
| `Badge` | `components/ui/badge` | Delta badges on KPI cards |
| `Button` | `components/ui/button` | Period presets, export, filter actions |
| `Calendar` | `components/ui/calendar` | Custom date range picker |
| `Popover`, `PopoverTrigger`, `PopoverContent` | `components/ui/popover` | Date picker, filter dropdowns |
| `Tabs`, `TabsList`, `TabsTrigger` | `components/ui/tabs` | Chart workspace tab switching |
| `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` | `components/ui/select` | Comparison mode dropdown |
| `Skeleton` | `components/ui/skeleton` | Loading states |
| `Table`, `TableHeader`, `TableRow`, etc. | `components/ui/table` | Sales report table |
| `DataTable` + `useDataTable` | `admin/_components/data-table/` | Sales report table (full featured) |
| `DataTableActionBar` | `admin/_components/data-table/` | Sales table action bar |
| `DataTableFilter` (dateRange mode) | `admin/_components/data-table/` | Reference for date range UX |
| `PageTitle` | `admin/_components/forms/PageTitle` | Page headers |
| `StatusBadge` | `components/shared/StatusBadge` | Order status in sales table |
| `formatPrice` | `components/shared/record-utils` | Currency formatting |

### New shadcn Install Required

| Package | Command | Provides |
|---------|---------|----------|
| `chart` | `npx shadcn@latest add chart` | `components/ui/chart.tsx` — Recharts wrapper with CSS variable theming, `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend` |

---

## Layer 2 — Shared Utilities

### New: `lib/analytics/`

| File | Exports | Description |
|------|---------|-------------|
| `periods.ts` | `PeriodPreset`, `DateRange`, `getDateRange(preset)`, `getComparisonRange(range, mode)`, `PERIOD_PRESETS` | Date math: preset → { from, to }, comparison period calculation. Shared by API routes + client components. |
| `kpi-helpers.ts` | `computeDelta(current, previous)`, `formatDelta(delta)`, `DeltaResult` | Computes % change and direction (up/down/flat). Used by KpiCard. |
| `formatters.ts` | `formatCurrency(cents)`, `formatPercent(ratio)`, `formatNumber(n)`, `formatWeight(grams)` | Consistent formatting across all dashboard pages. |
| `csv-export.ts` | `exportToCsv(columns, rows, filename)` | Generic CSV export (extracted + generalized from newsletter pattern). |
| `types.ts` | `KpiValue`, `ChartDataPoint`, `RankedItem`, `PeriodParams`, `CompareMode` | Shared type definitions for API responses and component props. |

---

## Layer 3 — API Routes

| Route | File | Responsibility |
|-------|------|----------------|
| `GET /api/admin/dashboard` | `app/api/admin/dashboard/route.ts` | Overview page: 6 KPIs + 4 chips + alerts + trend + funnel + mix + top movers. Accepts `?period=30d&compare=previous`. |
| `GET /api/admin/sales` | `app/api/admin/sales/route.ts` | Sales page: revenue/order KPIs + chart data + breakdown data + paginated order table. Accepts `?from=&to=&compare=&orderType=&status=&productId=&categoryId=&promoCode=&location=&page=&pageSize=&sort=&dir=`. |
| `GET /api/admin/analytics` | `app/api/admin/analytics/route.ts` | **Exists.** Keep as-is for now. Future: align response shape with shared types. |

---

## Layer 4 — Page Composition

### Overview Page (`/admin`) — Mockup Section → Component Map

| Mockup Section | Target Component(s) | File Location | Data Source |
|----------------|---------------------|---------------|-------------|
| **Page Header** | `PageTitle` + `PeriodSelector` | `app/admin/AdminDashboardClient.tsx` | URL search params |
| **Alert Strip** | `AlertStrip` | `app/admin/AdminDashboardClient.tsx` | `GET /api/admin/dashboard` → `alerts[]` |
| **KPI Cards (6)** | `StatGrid` > 6× `KpiCard` | `app/admin/AdminDashboardClient.tsx` | `dashboard.kpis` + `dashboard.comparisonKpis` |
| **Supporting KPI Chips** | `KpiChipBar` | `app/admin/AdminDashboardClient.tsx` | `dashboard.chips` |
| **Revenue & Orders Trend** | `ChartCard` > `TrendChart` | `app/admin/_components/overview/RevenueTrendSection.tsx` | `dashboard.revenueByDay` |
| **Conversion Funnel** | `ChartCard` > `FunnelChart` | `app/admin/_components/overview/ConversionFunnelSection.tsx` | `dashboard.behaviorFunnel` |
| **Mix & Retention** | `ChartCard` > 2× `SplitComparison` | `app/admin/_components/overview/MixRetentionSection.tsx` | `dashboard.subscriptionSplit`, `dashboard.customerSplit` |
| **Top Products** | `ChartCard` > `RankedList` | `app/admin/_components/overview/TopMoversSection.tsx` | `dashboard.topProducts` |
| **Top Locations** | `RankedList` | `app/admin/_components/overview/TopMoversSection.tsx` | `dashboard.topLocations` |
| **Top Searches** | `RankedList` | `app/admin/_components/overview/TopMoversSection.tsx` | `dashboard.topSearches` |

### Sales Page (`/admin/sales`) — Mockup Section → Component Map

| Mockup Section | Target Component(s) | File Location | Data Source |
|----------------|---------------------|---------------|-------------|
| **Page Header** | `PageTitle` + `PeriodSelector` + Export button | `app/admin/sales/SalesClient.tsx` | Client state |
| **KPI Grid (8)** | `StatGrid` > 8× `KpiCard` | `app/admin/sales/SalesClient.tsx` | `GET /api/admin/sales` → `kpis` |
| **Chart Workspace** | `ChartCard` (tabbed) > `TrendChart` / `HBarChart` / `DonutChart` | `app/admin/sales/SalesChartWorkspace.tsx` | `sales.revenueByDay`, `sales.categoryBreakdown`, etc. |
| **Breakdown Panel** | 3× `RankedList` | `app/admin/sales/SalesBreakdownPanel.tsx` | `sales.topProducts`, `sales.topLocations`, `sales.categoryBreakdown` |
| **Sales Table** | `DataTableActionBar` + `DataTable` via `useSalesTable` hook | `app/admin/sales/SalesClient.tsx` + `app/admin/sales/hooks/useSalesTable.tsx` | `GET /api/admin/sales` → `table.rows` |
| **CSV Export** | `exportToCsv()` utility | triggered from `ActionBarConfig` left slot button | `table.getFilteredRowModel().rows` → download |

#### Sales Table — DataTable Architecture (matches `useProductsTable` / `useReviewsTable`)

```text
useSalesTable (hook)                          ← app/admin/sales/hooks/useSalesTable.tsx
  ├── ColumnDef<SalesRow>[]                   ← 14 columns, desktop/mobile responsive via DataTableColumnMeta
  │     ├── pin: "left" on orderNumber        ← same as products name column
  │     ├── responsive: "desktop"             ← hides subtotal/discount/tax/shipping on mobile
  │     ├── responsive: "mobile"              ← compact mobileTotal + mobileActions
  │     └── filterFn per column               ← dateRange (reviews pattern), multiSelect, comparison (products pattern)
  ├── FilterConfig[]                          ← uses EXISTING filter types only (no new types)
  │     ├── dateRange  → "createdAt"          ← same as useReviewsTable "date" filter
  │     ├── multiSelect → "status"            ← same as useProductsTable "categories" filter
  │     ├── multiSelect → "orderType"         ← ONE_TIME / SUBSCRIPTION options
  │     └── comparison → "total"              ← same as useProductsTable "price" filter
  ├── filterToColumnFilters()                 ← maps ActiveFilter → ColumnFiltersState
  ├── useColumnVisibility(key, ALWAYS_HIDDEN) ← promoCode/subtotal/discount/tax/shipping hidden by default
  ├── TOGGLABLE_COLUMNS                       ← exposed to ColumnVisibilityToggle in action bar
  └── useDataTable({ storageKey: "sales-table-state" })
          ↓
SalesClient (page component)
  ├── ActionBarConfig { left: [Export, Search, Filter], right: [ColVis, RecordCount, PageSize, Pagination] }
  ├── DataTableActionBar config={actionBarConfig}
  ├── DataTable table={table} onRowDoubleClick={→ /admin/orders?highlight=id}
  └── Empty (when table.rows.length === 0)
```

**Reused from `_components/data-table/`:** `DataTable`, `DataTableActionBar`, `DataTableFilter` (all 3 renderer types), `DataTablePagination`, `DataTablePageSizeSelector`, `DataTableHeaderCell`, `ColumnVisibilityToggle`, `RowActionMenu`, `useDataTable`, `useColumnVisibility`. **Zero new data-table infrastructure needed.**

---

## Reuse Matrix

Shows which shared primitives are used by each page:

| Primitive | Overview | Sales | Analytics (future) |
|-----------|----------|-------|-------------------|
| **New shared (analytics/)** | | | |
| `PeriodSelector` | ✅ | ✅ | ✅ |
| `KpiCard` | ✅ | ✅ | ✅ |
| `KpiChipBar` | ✅ | — | — |
| `AlertStrip` | ✅ | — | — |
| `ChartCard` | ✅ | ✅ | ✅ |
| `TrendChart` | ✅ | ✅ | ✅ |
| `DonutChart` | ✅ | ✅ | — |
| `HBarChart` | ✅ | ✅ | — |
| `FunnelChart` | ✅ | — | ✅ |
| `RankedList` | ✅ | ✅ | ✅ |
| `SplitComparison` | ✅ | ✅ | — |
| `StatGrid` | ✅ | ✅ | ✅ |
| `SkeletonDashboard` | ✅ | ✅ | ✅ |
| **New shared (lib/analytics/)** | | | |
| `exportToCsv` | — | ✅ | — |
| `periods.ts` | ✅ | ✅ | ✅ |
| `kpi-helpers.ts` | ✅ | ✅ | ✅ |
| `formatters.ts` | ✅ | ✅ | ✅ |
| **Existing (data-table/) — zero changes** | | | |
| `DataTable` | — | ✅ | — |
| `DataTableActionBar` + `ActionBarConfig` | — | ✅ | — |
| `DataTableFilter` (comparison) | — | ✅ (total) | — |
| `DataTableFilter` (multiSelect) | — | ✅ (status, orderType) | — |
| `DataTableFilter` (dateRange) | — | ✅ (createdAt) | — |
| `useDataTable` + `useColumnVisibility` | — | ✅ | — |
| `ColumnVisibilityToggle` | — | ✅ | — |
| `RowActionMenu` | — | ✅ | — |
| `DataTablePagination` + `PageSizeSelector` | — | ✅ | — |
| **Existing (components/shared/)** | | | |
| `StatusBadge` | — | ✅ (status column) | — |
| `formatPrice` (record-utils) | — | ✅ (money columns) | — |

---

## File Tree Summary (New Files)

```text
lib/analytics/
  periods.ts
  kpi-helpers.ts
  formatters.ts
  csv-export.ts
  types.ts

app/admin/_components/analytics/
  PeriodSelector.tsx
  KpiCard.tsx
  KpiChipBar.tsx
  AlertStrip.tsx
  ChartCard.tsx
  TrendChart.tsx
  DonutChart.tsx
  HBarChart.tsx
  FunnelChart.tsx
  RankedList.tsx
  SplitComparison.tsx
  StatGrid.tsx
  SkeletonDashboard.tsx
  index.ts                       ← barrel export

app/api/admin/dashboard/
  route.ts

app/api/admin/sales/
  route.ts

app/admin/_components/overview/
  RevenueTrendSection.tsx
  ConversionFunnelSection.tsx
  MixRetentionSection.tsx
  TopMoversSection.tsx

app/admin/sales/
  page.tsx
  SalesClient.tsx
  SalesChartWorkspace.tsx
  SalesBreakdownPanel.tsx
  hooks/useSalesTable.tsx         ← follows useProductsTable/useReviewsTable pattern exactly

components/ui/chart.tsx            ← auto-generated by shadcn
```

---

## Deferred (Not in Scope)

| Item | Reason | Backlog |
|------|--------|---------|
| Order detail page | Separate feature | Follow-up ticket |
| `/admin/analytics` refactor to shared primitives | Keep working, refactor after shared layer is proven | Phase 2 |
| Store visits by source | `UserActivity.source` not populated | Needs tracking work first |
| Mobile vs desktop | Not tracked | Needs `userAgent` parsing in activity API |
| Marketing channel funnel | No order → campaign attribution | Needs `source` field population |
