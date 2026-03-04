# Sales Analytics Page — AC Verification Report

**Branch:** `feat/sales-analytics`
**Scope:** New `/admin/sales` deep-dive page — sales API, server-side table, charts, CSV export
**Commits:** 8–13 (of 13 on branch)

---

## Column Definitions

| Column | Filled by | When |
|--------|-----------|------|
| **Agent** | Verification sub-agent | During `/ac-verify` — PASS/FAIL with brief evidence |
| **QC** | Main thread agent | After reading sub-agent report — confirms or overrides |
| **Reviewer** | Human (reviewer) | During manual review — final approval per AC |

---

## Functional Acceptance Criteria (13)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | `useDataTable` supports `serverSide` option: when provided, sets `manualPagination`, `manualSorting`, `manualFiltering` on table, uses `rowCount` for page calculation, skips client-side sort/filter/pagination row models | Code review: `app/admin/_components/data-table/hooks/useDataTable.ts` | `serverSide` option in interface, conditional table config, `sorting` + `pagination` returned | | | |
| AC-FN-2 | Sales API route: `GET /api/admin/sales` validates admin auth via `requireAdminApi()`, accepts `period`, `compare`, `orderType`, `status`, `productId`, `categoryId`, `promoCode`, `location`, `page`, `pageSize`, `sort`, `dir` params | Code review: `app/api/admin/sales/route.ts` | Auth check, all params parsed, calls `getSalesAnalytics` | | | |
| AC-FN-3 | Sales API CSV export: When `?export=csv` is set, returns `text/csv` response with Content-Disposition header and formatted rows (Order #, Date, Email, Items, Type, Status, Total, Refunded, Location) | Code review: `app/api/admin/sales/route.ts` CSV branch | CSV content-type, correct headers, formatted values | | | |
| AC-FN-4 | Sales service: `getSalesAnalytics()` runs all queries in parallel via `Promise.all` — revenue aggregate, revenue by day, orders by status, purchase type split, top products (10), top locations (10), promo count, fulfilled count, category breakdown, coffee by weight, paginated table, comparison KPIs, comparison chart data | Code review: `lib/admin/analytics/services/get-sales-analytics.ts` | 13-way Promise.all, typed `SalesResponse` return | | | |
| AC-FN-5 | Sales KPIs: `SalesKpis` includes `revenue`, `netRevenue`, `orders`, `aov`, `refundAmount`, `refundRate`, `fulfillmentRate`, `avgItemsPerOrder`, `subscriptionRevenue`, `oneTimeRevenue`, `subscriptionPercent`, `promoOrderPercent` | Code review: `contracts.ts` SalesKpis + service KPI construction | All 12 KPI fields computed correctly | | | |
| AC-FN-6 | Category breakdown query: `getCategoryBreakdown()` aggregates order item revenue by product category, returns `{category, kind, revenue, orders}[]` sorted by revenue desc | Code review: `queries/order-aggregates.ts` + 3 tests in `order-aggregates.test.ts` | Correct aggregation, sorting, empty-category handling | | | |
| AC-FN-7 | Coffee by weight query: `getCoffeeByWeight()` aggregates `variant.weight × quantity` for COFFEE-type products only, returns `{product, weightSoldGrams, quantity}[]` sorted by weight desc | Code review: `queries/order-aggregates.ts` + 2 tests in `order-aggregates.test.ts` | MERCH excluded, weight aggregation correct | | | |
| AC-FN-8 | Sales table query: `getSalesTable()` returns paginated orders with `{rows, total, page, pageSize}`. Rows include `orderNumber` (last 8 chars of ID), `itemCount` (sum of quantities), `orderType` (ONE_TIME vs SUBSCRIPTION via `stripeSubscriptionId`), `subtotal` (total - tax - shipping) | Code review: `queries/order-aggregates.ts` + 3 tests in `order-aggregates.test.ts` | Correct pagination, field derivation, sort mapping | | | |
| AC-FN-9 | Comparison KPIs: When `compare !== "none"`, sales service fetches comparison period data and returns `comparisonKpis` with same shape as primary KPIs | Code review: `get-sales-analytics.ts` `getComparisonSalesKpis` | Comparison range queries parallel, typed SalesKpis | | | |
| AC-FN-10 | Sales page server component: Auth check via `auth()` + `prisma.user.findUnique`, redirects unauthenticated to `/auth/signin?callbackUrl=/admin/sales`, non-admin to `/` | Code review: `app/admin/sales/page.tsx` | Auth + admin check, redirect, metadata generation | | | |
| AC-FN-11 | Admin nav: "Sales" entry added to `adminNavConfig` and `mobileNavConfig` under Dashboard group, positioned between Overview and Analytics | Code review: `lib/config/admin-nav.ts` | Sales entry with DollarSign icon, href="/admin/sales" | | | |
| AC-FN-12 | Route registry: `admin.dashboard.sales` entry with pathname `/admin/sales`, `matchMode: "exact"`, parentId `admin.dashboard` | Code review: `lib/navigation/route-registry.ts` | Entry present with correct fields | | | |
| AC-FN-13 | All 8 new query tests pass: 3 for `getCategoryBreakdown`, 2 for `getCoffeeByWeight`, 3 for `getSalesTable` | Run tests: `jest --testPathPatterns="order-aggregates"` | 8 new tests pass (22 total in file) | | | |

## UI Acceptance Criteria (8)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-1 | Sales page loads at `/admin/sales` with "Sales Analytics" title and "Export CSV" button in top-right | Screenshot `/admin/sales` | Page renders with title + export button | | | |
| AC-UI-2 | Period selector in state mode: 5 preset buttons + comparison dropdown. Clicking presets triggers SWR refetch (no page navigation). | Screenshot + click interaction | Buttons render, SWR revalidates on change | | | |
| AC-UI-3 | 5 KPI cards: Revenue, Orders, AOV, Refunds, Sub % — with comparison deltas when enabled | Screenshot `/admin/sales` KPI row | 5 cards with formatted values and delta badges | | | |
| AC-UI-4 | Revenue Over Time: Recharts AreaChart with daily data, dual Y-axis, comparison dashed line overlay when comparison enabled | Screenshot revenue trend section | Area chart with fill, axes, tooltip, optional comparison line | | | |
| AC-UI-5 | Top Products ranked list (10 items) + Category Breakdown horizontal bar chart in 2-column grid | Screenshot products + category section | Ranked list with revenue values, bar chart with category labels | | | |
| AC-UI-6 | Orders by Status donut chart + Subscription vs One-time split bar in 2-column grid | Screenshot status + split section | Donut with legend, split bar with labels and percentages | | | |
| AC-UI-7 | Sales by Location ranked list + Coffee Sold by Weight horizontal bar chart in 2-column grid. Weight chart shows "No coffee orders" message when empty. | Screenshot location + weight section | Location list with revenue, weight chart with product labels + formatted weight | | | |
| AC-UI-8 | Export CSV button opens new tab with CSV download containing correct headers and data rows | Click Export CSV button | Browser downloads CSV with Order #, Date, Email, Items, Type, Status, Total, Refunded, Location columns | | | |

## Regression Acceptance Criteria (4)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-1 | `npm run precheck` passes with zero errors | Run `npm run precheck` | Zero TypeScript and ESLint errors | | | |
| AC-REG-2 | `npm run test:ci` — all 995 tests pass, 0 failures | Run `npm run test:ci` | All tests pass | | | |
| AC-REG-3 | Overview page (`/admin`) still renders correctly — KPIs, charts, sections all intact | Screenshot `/admin` | No visual regressions from sales page additions | | | |
| AC-REG-4 | Existing admin pages unaffected — `/admin/orders`, `/admin/products`, `/admin/analytics` all load | Navigate to each page | Pages render correctly, no console errors | | | |

---

## Agent Notes

{Filled during `/ac-verify`}

## QC Notes

{Filled during QC review}

## Reviewer Feedback

{Human writes review feedback here.}
