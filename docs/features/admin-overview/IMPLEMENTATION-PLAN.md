# Implementation Plan — Admin Overview Makeover

> **Route:** `/admin`
> **Branch:** `feat/sales-analytics`
> **Depends on:** Shared primitives (Layer 1 + 2) built first
> **Date:** 2026-03-04

---

## Pre-requisite: Shared Infrastructure (Commits 1–3)

These commits are shared between Overview and Sales. Build once, used by both.

### Commit 1 — `chore: install recharts via shadcn chart component`

**Actions:**

1. Run `npx shadcn@latest add chart`
   - Auto-creates `components/ui/chart.tsx` (Recharts wrapper with CSS variable theming)
   - Adds `recharts` to `package.json`
2. Verify `components/ui/chart.tsx` exists and exports `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`
3. Run `npm run precheck` to confirm no type errors

**Files created:** `components/ui/chart.tsx`
**Files modified:** `package.json`, `package-lock.json`

---

### Commit 2 — `feat: add shared analytics utilities (periods, formatters, KPI helpers)`

**Files created:**

| File | Key Exports |
|------|-------------|
| `lib/analytics/types.ts` | `PeriodPreset` (`"7d"\|"30d"\|"90d"\|"6mo"\|"1yr"`), `CompareMode` (`"previous"\|"lastYear"\|"none"`), `DateRange` (`{ from: Date; to: Date }`), `KpiValue` (`{ current: number; previous?: number }`), `DeltaResult` (`{ value: number; direction: "up"\|"down"\|"flat" }`), `ChartDataPoint`, `RankedItem` |
| `lib/analytics/periods.ts` | `PERIOD_PRESETS` (array of `{ key, label, days }`), `getDateRange(preset): DateRange`, `getComparisonRange(range, mode): DateRange\|null`, `parsePeriodParam(param): PeriodPreset` |
| `lib/analytics/kpi-helpers.ts` | `computeDelta(current, previous): DeltaResult`, `formatDelta(delta): string` (e.g., "+12.3%", "−5.1%") |
| `lib/analytics/formatters.ts` | `formatCurrency(cents)` → "$1,234.56", `formatPercent(ratio)` → "12.3%", `formatNumber(n)` → "1,234", `formatWeight(grams)` → "2.4 lbs" |
| `lib/analytics/csv-export.ts` | `exportToCsv(columns: string[], rows: string[][], filename: string)` — generic CSV download, extracted from newsletter pattern |
| `lib/analytics/index.ts` | Barrel re-export |

**Testing:**

- Unit tests for `getDateRange`, `getComparisonRange`, `computeDelta`, `formatCurrency` in `lib/analytics/__tests__/`

---

### Commit 3 — `feat: add shared analytics UI primitives`

**Files created in `app/admin/_components/analytics/`:**

| Component | Implementation Notes |
|-----------|---------------------|
| `PeriodSelector.tsx` | Row of `Button` with `variant="outline"` / `variant="default"` for presets. `Select` dropdown for comparison mode. Accepts `value: PeriodPreset`, `compare: CompareMode`, `onChange`. Two variants via prop: `syncMode="url"` (uses `useSearchParams` + `router.push`) or `syncMode="state"` (calls onChange directly). |
| `KpiCard.tsx` | Extends existing Card pattern. Props: `label, value: number, format, delta?: DeltaResult, icon?: LucideIcon, href?: string`. Uses `formatCurrency`/`formatNumber`/`formatPercent` based on `format` prop. Delta rendered as colored `Badge`. Wraps in `Link` if `href` provided. |
| `KpiChipBar.tsx` | Horizontal flex row of small pills. Each chip: `Badge variant="secondary"` with label + formatted value. Scrollable via `overflow-x-auto` on mobile. |
| `AlertStrip.tsx` | Conditional render: returns `null` if `alerts[]` empty. Maps alerts to amber/red `Badge` pills in a `bg-destructive/5` strip. Each links to relevant page. |
| `ChartCard.tsx` | `Card` with `CardHeader` containing title + optional `Tabs` row for chart type switching. `CardContent` renders `children` (the actual chart). Handles loading state with `Skeleton`. |
| `TrendChart.tsx` | Recharts `AreaChart` inside `ChartContainer`. Dual Y-axis: primary metric (left), secondary (right). `ChartTooltip` with formatted values. Optional `comparisonData` rendered as dashed `Line`. Responsive via `ResponsiveContainer`. |
| `DonutChart.tsx` | Recharts `PieChart` with `innerRadius`/`outerRadius` for donut. Center label with total. `ChartLegend` below. CSS variable colors. |
| `HBarChart.tsx` | Recharts `BarChart` with `layout="vertical"`. Category axis on left, value bars horizontal. `ChartTooltip` with formatted values. |
| `FunnelChart.tsx` | Three stacked bars (Views → Cart → Orders) with connecting arrows and step-to-step conversion percentages. Uses Recharts `BarChart` for the bars, custom labels for percentages. |
| `RankedList.tsx` | Ordered list with `#rank`, label, formatted value. Rows wrap in `Link` if `href` provided. Footer "View all →" link. Limit prop (default 5). |
| `SplitComparison.tsx` | Two-segment horizontal bar showing percentage split. Labels + values above bar. Color-coded segments. |
| `StatGrid.tsx` | `div` with `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-{columns} gap-4`. Just a layout wrapper. |
| `SkeletonDashboard.tsx` | Skeleton cards (stat-card size) + skeleton chart areas. Prop: `sections` count. |
| `index.ts` | Barrel re-export of all components. |

---

## Overview-Specific Implementation (Commits 4–6)

### Commit 4 — `feat: add dashboard API route with KPI aggregations`

**File created:** `app/api/admin/dashboard/route.ts`

**Implementation:**

```text
GET /api/admin/dashboard?period=30d&compare=previous
```

1. Zod-validate query params: `period` (PeriodPreset), `compare` (CompareMode)
2. Auth check: `auth()` → must be admin
3. Compute date range via `getDateRange(period)` and comparison via `getComparisonRange()`
4. Run Prisma queries in parallel (`Promise.all`):

| Query | Prisma Call | Returns |
|-------|-------------|---------|
| Revenue + Refunds | `order.aggregate({ _sum: { totalInCents, refundedAmountInCents } })` where status NOT IN (CANCELLED, FAILED) and createdAt in range | revenue, refunds |
| Order count | `order.count()` same filters | orders |
| Orders by status | `order.groupBy({ by: ["status"] })` | status breakdown |
| Revenue by day | `order.findMany({ select: { totalInCents, createdAt } })` → JS groupBy date | daily trend |
| Behavior funnel | `userActivity.count()` for PRODUCT_VIEW, ADD_TO_CART + `order.count()` | views, carts, orders |
| Subscription split | `orderItem.findMany` → join purchaseOption → groupBy type | sub vs one-time revenue |
| Customer split | `order.groupBy({ by: ["userId"] })` → count orders per user → new (1) vs repeat (2+) | new vs repeat |
| Reviews summary | `review.aggregate({ _avg: { rating } })` + `review.count({ where: { status: PENDING } })` + `review.groupBy({ by: ["productId"], _count: true, orderBy: { _count: { productId: "desc" } }, take: 1 })` | avg rating, pending, top reviewed |
| Top products | `orderItem.groupBy({ by: ["purchaseOptionId"] })` → join product names → sort by revenue | top 5 products |
| Top locations | `order.groupBy` equivalent via findMany + JS groupBy on `shippingState` | top 5 states |
| Top searches | `userActivity.groupBy({ by: ["searchQuery"], where: { activityType: SEARCH } })` | top 5 searches |
| Product count | `product.count()` | total products |
| User count | `user.count()` + `user.count({ where: { createdAt in range } })` | total + new |
| Newsletter | `newsletterSubscriber.count({ where: { isActive: true } })` | active subs |
| Comparison KPIs | Repeat revenue + order + review + user counts for comparison range | delta calculation |

1. Compute derived KPIs: AOV, net revenue, refund rate, fulfillment rate, subscription %, repeat rate, conversion rate
2. Build alerts array (conditional): refund rate > 10%, failed/cancelled > 5%, newsletter churn spike
3. Return typed JSON response

**Testing:** Unit test for the aggregation logic (mock Prisma, verify computations)

---

### Commit 5 — `feat: overview page — KPI cards, alert strip, trend chart, funnel`

**Files modified:**

| File | Changes |
|------|---------|
| `app/admin/page.tsx` | Accept `searchParams` for `period` and `compare`. Fetch dashboard data server-side via internal API call or direct Prisma (TBD — if SSR, call Prisma directly to avoid network hop; pass serialized data to client). Pass data + period to `AdminDashboardClient`. |
| `app/admin/AdminDashboardClient.tsx` | **Full rewrite.** New layout: `PeriodSelector` (url-sync) → `AlertStrip` → `StatGrid` with 6× `KpiCard` → `KpiChipBar` (4 chips) → 2-col grid: `RevenueTrendSection` + `ConversionFunnelSection`. |

**Files created:**

| File | Implementation |
|------|---------------|
| `app/admin/_components/overview/RevenueTrendSection.tsx` | `ChartCard` with `TrendChart`. Title: "Revenue & Orders Trend". Data: `revenueByDay[]`. Comparison overlay if enabled. |
| `app/admin/_components/overview/ConversionFunnelSection.tsx` | `ChartCard` with `FunnelChart`. Steps: Product Views → Add to Cart → Orders. Shows step conversion %. |

---

### Commit 6 — `feat: overview page — mix/retention, top movers, nav update`

**Files created:**

| File | Implementation |
|------|---------------|
| `app/admin/_components/overview/MixRetentionSection.tsx` | `ChartCard` titled "Mix & Retention". Contains 2× `SplitComparison`: Subscription vs One-time revenue, New vs Repeat customers. Drill link to `/admin/sales`. |
| `app/admin/_components/overview/TopMoversSection.tsx` | 3-column grid (stacked on mobile): `RankedList` for Top Products (→ `/admin/sales?sort=revenue`), Top Locations (→ `/admin/sales?view=location`), Top Searches (→ `/admin/analytics`). |

**Files modified:**

| File | Changes |
|------|---------|
| `lib/config/admin-nav.ts` | Add `{ label: "Sales", href: "/admin/sales" }` to Dashboard children in both `adminNavConfig` and `mobileNavConfig`. |
| `app/admin/AdminDashboardClient.tsx` | Add `MixRetentionSection` + `TopMoversSection` below trend/funnel row. |

---

## Data Flow

```text
User selects period (URL param)
        ↓
page.tsx reads searchParams → fetches dashboard data (server-side Prisma)
        ↓
AdminDashboardClient receives serialized data as props
        ↓
Renders: PeriodSelector (url-sync) → AlertStrip → KpiCards → KpiChips
         → RevenueTrend + Funnel → Mix + TopMovers
        ↓
Period change → URL update → server re-renders with new data
```

**Why server-side?** Overview is the admin landing page — must be fast on first load. No loading spinners for initial render. Period changes trigger full page transition (with Next.js streaming, this is fast).

---

## States

| State | Behavior |
|-------|----------|
| **Loading** | `SkeletonDashboard` shown during server transition (via `loading.tsx` or Suspense) |
| **No data** | KPI cards show "$0" / "0" with "No data in selected period" subtitle. Charts show empty state message. |
| **Error** | Section-level error cards with retry. Non-blocking — other sections still render. |
| **Partial data** | Each section handles its own empty state independently. |

---

## Acceptance Criteria (from README)

| # | AC | How Verified |
|---|-----|-------------|
| 1 | `/admin` shows 6 executive KPIs with period delta and consistent formulas | Screenshot + manual check against Prisma queries |
| 2 | Revenue trend chart and conversion funnel render from live data | Screenshot with real/seeded data |
| 3 | Subscription mix and repeat customer metrics are visible | Screenshot of Mix & Retention section |
| 4 | At least 2 operational alert conditions implemented | Code review: refund spike + failed/cancelled rate checks |
| 5 | Every KPI card links to a relevant drill-through page | Click test: each card href goes to correct filtered page |
| 6 | Empty state and loading state handled for all sections | Screenshot with empty date range + loading skeleton |

---

## Gap-Fix Patch Plan (Modularity, Reuse, Maintainability)

This section is an explicit patch on top of the current plan. If any earlier section conflicts with this, **this section wins**.

### P0 (Must Fix Before Feature Coding)

#### 1) Single KPI Formula Source of Truth

Create a metric registry and remove ad-hoc KPI math from route handlers.

**New files:**

- `lib/admin/analytics/metrics-registry.ts`
- `lib/admin/analytics/contracts.ts`

**Requirements:**

- Every KPI formula lives in `metrics-registry.ts` as pure functions.
- Both dashboard and sales APIs import the same metric functions.
- All currency units are cents. All percentage units are normalized ratios (`0..1`) at compute-time, formatted at UI-time.

#### 2) Thin Route Handlers, Service Layer Ownership

Move heavy query and aggregation logic out of route files.

**New files:**

- `lib/admin/analytics/services/get-dashboard-analytics.ts`
- `lib/admin/analytics/queries/dashboard-queries.ts`
- `lib/admin/analytics/filters/build-order-where.ts`

**Requirements:**

- Route responsibility only: validate params, enforce auth, call service, return typed JSON.
- Query code only in `queries/*`.
- Computation code only in registry/service layer.

#### 3) Canonical Date/Timezone Policy

Prevent chart/KPI mismatches due to date boundaries.

**New file:**

- `lib/admin/analytics/time.ts`

**Requirements:**

- Define canonical timezone (UTC by default unless a configured store timezone exists).
- Define period boundaries as `[fromInclusive, toExclusive)`.
- Reuse same bucket helper for trend and comparison series.

#### 4) Shared API Contracts

Use one response type for server/client/test consistency.

**Requirements:**

- `contracts.ts` exports `DashboardResponse`, `DashboardQueryParams`, `KpiCardPayload`, `AlertPayload`, chart/list payloads.
- `app/api/admin/dashboard/route.ts`, `app/admin/page.tsx`, `AdminDashboardClient.tsx` all consume shared contracts.

---

### P1 (High-Value Refactor During Implementation)

#### 5) Split Multi-Purpose Components

Avoid overloading shared components with both stateful and presentational concerns.

**Refactor target pattern:**

- `PeriodSelector` (presentational)
- `UrlSyncedPeriodSelector` (adapter)
- `StatePeriodSelector` (adapter)

Apply same split when needed for chart containers/tabs to keep shared primitives single-purpose.

#### 6) Alert Rule Engine Extraction

Move alert threshold logic into a dedicated module.

**New file:**

- `lib/admin/analytics/alert-rules.ts`

**Requirements:**

- Input: normalized KPI snapshot + comparison snapshot.
- Output: typed `alerts[]` consumed by `AlertStrip`.
- Rule thresholds are centralized constants, not hardcoded in route/service bodies.

#### 7) Observability + Performance Guardrails

Add instrumentation for aggregate query blocks.

**Requirements:**

- Service logs duration per query block and total request duration.
- Add warning threshold for slow responses (e.g., > 800ms server compute).
- Keep this internal (no noisy client surfacing).

---

### Updated Commit Sequence (Patch)

Use this sequence instead of the implicit sequence in earlier sections:

1. `chore: install chart dependency via shadcn`
2. `feat: add shared analytics contracts, time policy, metric registry`
3. `feat: add shared analytics query builders and dashboard service`
4. `feat: add shared analytics UI primitives`
5. `feat: add dashboard api route using typed service layer`
6. `feat: implement overview sections using shared contracts`
7. `feat: extract alert rules and add observability`

---

### Definition of Done Additions

The Overview implementation is not complete until:

1. No KPI formula is duplicated in route handlers.
2. Dashboard API compiles against `DashboardResponse` from shared contracts.
3. Period/timezone utilities are reused by both dashboard and sales plans.
4. Alert thresholds live in one module with unit tests.
5. At least one integration-style test validates KPI parity between registry outputs and API payload.
