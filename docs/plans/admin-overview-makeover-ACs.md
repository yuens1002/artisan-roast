# Admin Overview Makeover — AC Verification Report

**Branch:** `feat/sales-analytics`
**Scope:** Overview page (`/admin`) makeover — shared analytics infra + KPI dashboard
**Commits:** 1–7 (of 13 on branch)

---

## Column Definitions

| Column | Filled by | When |
|--------|-----------|------|
| **Agent** | Verification sub-agent | During `/ac-verify` — PASS/FAIL with brief evidence |
| **QC** | Main thread agent | After reading sub-agent report — confirms or overrides |
| **Reviewer** | Human (reviewer) | During manual review — final approval per AC |

---

## Functional Acceptance Criteria (12)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | Recharts installed via shadcn chart component. `components/ui/chart.tsx` exports `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`. | Code review: `components/ui/chart.tsx` + `package.json` recharts dep | Exports present, recharts in dependencies | | | |
| AC-FN-2 | Shared contracts define `DashboardResponse`, `DashboardKpis`, `ChartDataPoint`, `FunnelStep`, `SplitPayload`, `ChipPayload`, `AlertPayload`, `RankedItem`, `StatusBreakdownItem`, `DeltaResult`, `PeriodPreset`, `CompareMode` | Code review: `lib/admin/analytics/contracts.ts` | All types exported with correct fields | | | |
| AC-FN-3 | Time policy: `getDateRange()` returns UTC `[from, to)` intervals for 5 presets (7d, 30d, 90d, 6mo, 1yr). `getComparisonRange()` supports `previous` and `lastYear` modes. `toDateKey()` uses UTC. | Code review: `lib/admin/analytics/time.ts` + `time.test.ts` (13 tests pass) | All functions correct, UTC-safe, 13 tests green | | | |
| AC-FN-4 | Metric registry: 10 pure functions — `computeDelta`, `computeNetRevenue`, `computeAov`, `computeRefundRate`, `computeFulfillmentRate`, `computeSubscriptionPercent`, `computePromoPercent`, `computeAvgItems`, `computeConversionRate`, `computeSplit` | Code review: `lib/admin/analytics/metrics-registry.ts` + `metrics-registry.test.ts` (22 tests pass) | All functions correct, edge cases handled, 22 tests green | | | |
| AC-FN-5 | Formatters: `formatCurrency`, `formatCompactCurrency`, `formatPercent`, `formatNumber`, `formatCompactNumber`, `formatWeight`, `formatDelta`, `formatByType` | Code review: `lib/admin/analytics/formatters.ts` + `formatters.test.ts` (12 tests pass) | All functions correct, 12 tests green | | | |
| AC-FN-6 | Filter builder: `buildOrderWhere()` applies date range, status, orderType, promoCode, location, productId, categoryId. `buildKpiOrderWhere()` excludes CANCELLED/FAILED. | Code review: `lib/admin/analytics/filters/build-order-where.ts` + `build-order-where.test.ts` (11 tests pass) | Correct Prisma WHERE clauses, 11 tests green | | | |
| AC-FN-7 | Order aggregate queries: `getRevenueAggregate`, `getRevenueByDay`, `getOrdersByStatus`, `getPurchaseTypeSplit`, `getTopProducts`, `getTopLocations`, `getPromoOrderCount`, `getFulfilledCount` — all accept Prisma `where` clause | Code review: `lib/admin/analytics/queries/order-aggregates.ts` + `order-aggregates.test.ts` (14 tests pass) | All queries correct, 14 tests green | | | |
| AC-FN-8 | Entity/activity queries: `getReviewsSummary`, `getEntityCounts`, `getCustomerSplit`, `getBehaviorFunnel`, `getTopSearches` | Code review: `queries/entity-queries.ts` + `queries/activity-queries.ts` + respective test files (10 tests pass) | All queries correct, 10 tests green | | | |
| AC-FN-9 | Dashboard service: `getDashboardAnalytics()` runs all queries in parallel via `Promise.all`, fixes funnel order count post-hoc, builds KPIs, chips, alerts, comparison deltas | Code review: `lib/admin/analytics/services/get-dashboard-analytics.ts` | Correct orchestration, typed `DashboardResponse` return | | | |
| AC-FN-10 | Dashboard API route: `GET /api/admin/dashboard` validates admin auth via `requireAdminApi()`, parses `period` + `compare` params, calls `getDashboardAnalytics`, returns typed JSON | Code review: `app/api/admin/dashboard/route.ts` | Auth check, param validation, typed response | | | |
| AC-FN-11 | Overview `page.tsx`: Server component accepts `searchParams`, calls `parsePeriodParam`/`parseCompareParam`, fetches `getDashboardAnalytics`, passes `userName` + `data` to client | Code review: `app/admin/page.tsx` | Server-side data fetching, typed props | | | |
| AC-FN-12 | CSV export utility: `buildCsvString()` handles commas and quotes in cells. `exportToCsv()` triggers browser download. | Code review: `lib/admin/analytics/csv-export.ts` + `csv-export.test.ts` (4 tests pass) | Correct escaping, 4 tests green | | | |

## UI Acceptance Criteria (10)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-1 | 6 KPI cards display in responsive grid (2-col mobile, 6-col desktop): Revenue, Orders, AOV, Reviews, Products, Users | Screenshot `/admin` at mobile + desktop breakpoints | Cards render with correct labels, formatted values, icons | | | |
| AC-UI-2 | KPI cards with comparison enabled show colored delta badges (green for up, red for down) | Screenshot `/admin?compare=previous` | Delta badges visible with correct direction colors | | | |
| AC-UI-3 | Period selector shows 5 preset buttons (7d, 30d, 90d, 6mo, 1yr) + comparison dropdown. Clicking a preset navigates via URL search params. | Screenshot + click interaction | Buttons render, active state highlighted, URL updates on click | | | |
| AC-UI-4 | Alert strip displays warning/error badges when refund rate > 10% or failed/cancelled > 5%. Hidden when no alerts. | Code review: `AlertStrip` rendering + `buildAlerts` logic | Conditional rendering with severity-colored badges | | | |
| AC-UI-5 | Supporting chip bar shows Net Revenue, Fulfillment %, Promo Orders, Newsletter count as Badge pills | Screenshot `/admin` | 4 chips visible in horizontal scrollable row | | | |
| AC-UI-6 | Revenue & Orders Trend: Recharts AreaChart with dual Y-axis (revenue left, orders right), daily data points, comparison overlay when enabled | Screenshot `/admin` revenue trend section | Chart renders with area fill, axis labels, tooltip | | | |
| AC-UI-7 | Orders by Status: Recharts PieChart donut with legend, total count in center | Screenshot `/admin` orders status section | Donut chart with colored segments and legend | | | |
| AC-UI-8 | Conversion Funnel: Views → Cart → Orders with conversion % between steps | Screenshot `/admin` funnel section | 3 bars with decreasing values and conversion arrows | | | |
| AC-UI-9 | Mix & Retention: Two SplitComparison bars — Subscription vs One-time revenue, New vs Repeat customers | Screenshot `/admin` mix section | Two horizontal split bars with labels and percentages | | | |
| AC-UI-10 | Top Movers: 3-column grid with Top Products, Top Locations, Top Searches as ranked lists | Screenshot `/admin` top movers section | 3 ranked lists with values, Products has "View all" link to /admin/sales | | | |

## Regression Acceptance Criteria (3)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-1 | `npm run precheck` passes with zero errors | Run `npm run precheck` | Zero TypeScript and ESLint errors | | | |
| AC-REG-2 | `npm run test:ci` — all 995 tests pass, 0 failures | Run `npm run test:ci` | All tests pass | | | |
| AC-REG-3 | Admin nav still works — Dashboard dropdown shows Overview, Sales, Analytics. Other nav groups (Products, Orders, Pages, Management, Settings) unaffected. | Screenshot admin nav dropdown | All nav items visible and correct | | | |

---

## Agent Notes

{Filled during `/ac-verify`}

## QC Notes

{Filled during QC review}

## Reviewer Feedback

{Human writes review feedback here.}
