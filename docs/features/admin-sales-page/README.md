# Admin Sales Page — Reporting Plan

> **Status:** Proposed
> **Date:** 2026-03-03
> **Scope:** New `/admin/sales` page for deep-dive sales reporting using current data

---

## Objective

Create a dedicated sales analytics page that supports:

- deep KPI analysis,
- flexible filtering,
- chart exploration,
- and export-ready tabular reporting.

The page should align with common e-commerce reporting workflows seen in Shopify/BigCommerce admin analytics: **summary → breakdowns → raw order table → export**.

---

## Visual Reference

- See `docs/features/admin-sales-page/VISUAL-MOCKUP.md` for desktop/mobile wireframes and layout diagram.

---

## Route & IA

- **New route:** `/admin/sales`
- **Navigation placement:** under admin analytics/dashboard group
- **Primary audience:** operators, finance, founders

---

## Data Available Now (for Sales)

From current models, we can support:

- Revenue totals and components (gross, discounts, tax, shipping, refunds)
- Order status and fulfillment metrics
- Subscription vs one-time revenue/order splits
- Promo code usage and impact
- Product/category/location revenue breakdowns
- Time-based trends and cohort-like repeat behavior indicators

---

## Recommended KPI Set (Sales Page)

Use 3 groups: **Revenue**, **Orders**, **Mix/Quality**.

### A) Revenue KPIs

1. Total Revenue
2. Net Revenue
3. AOV
4. Refund Amount
5. Refund Rate
6. Discount Amount
7. Tax Collected
8. Shipping Revenue

### B) Orders KPIs

1. Total Orders
2. Orders by Status
3. Fulfillment Rate
4. Cancellation Rate
5. Avg Items per Order
6. Avg Fulfillment Time

### C) Mix & Quality KPIs

1. Subscription Revenue
2. One-time Revenue
3. Subscription vs One-time Split
4. Orders with Promo (%)
5. Revenue per Customer
6. Repeat Customers

---

## Core Page Structure

## Section 1 — Control Bar

- Date range picker (preset + custom)
- Filters: order type, status, product, category, source/promo, location
- Reset filters
- Export button (CSV first, Excel optional)

## Section 2 — KPI Grid

- 8–12 KPI cards based on selected filter context
- each card supports current value + prior-period delta

## Section 3 — Chart Workspace

- User-selectable chart per metric family:
  - Revenue over time (area/line)
  - Revenue by category (bar)
  - Subscription split (pie/donut)
  - Revenue by location (table/bar)
  - Orders by status (donut)

## Section 4 — Detailed Sales Table

Columns (default):

- Order #
- Date/Time
- Customer
- Items
- Order Type (Subscription / One-time)
- Promo/Coupon
- Subtotal / Discount / Tax / Shipping / Total
- Refunded Amount
- Fulfillment Status
- Shipping City/State

Capabilities:

- sort + paginate
- column show/hide (optional in phase 2)
- CSV export respects active filters

---

## KPI Formula Definitions

- **Total Revenue:** `SUM(totalInCents)`
- **Net Revenue:** `SUM(totalInCents - refundedAmountInCents)`
- **AOV:** `SUM(totalInCents) / COUNT(orders)`
- **Refund Rate:** `COUNT(refunded orders) / COUNT(orders)`
- **Fulfillment Rate:** `(Delivered + PickedUp) / Total Orders`
- **Cancellation Rate:** `Cancelled / Total Orders`
- **Subscription Revenue:** revenue from order items where purchase option type = subscription
- **Revenue per Customer:** total revenue / distinct ordering users

All formulas should be reused from a shared KPI definition module used by both overview and sales pages.

---

## Filter Model (MVP)

Required filters:

- `dateRange` (required)
- `orderType` (`ALL | SUBSCRIPTION | ONE_TIME`)
- `status` (multi-select)
- `productId` (optional)
- `categoryId` (optional)
- `promoCode` (optional)
- `location` (city/state optional)

Optional phase-2 filters:

- delivery method
- min/max order total

---

## Common E-comm Patterns to Follow

### Must have

- One global filter state controlling cards, charts, and table
- Prior period comparison for headline KPIs
- Drill-down consistency (click chart segment → filtered table)
- Export that exactly matches on-screen filter context

### Nice to have (phase 2)

- Saved views (e.g., "Weekly Ops", "Finance Month-End")
- Shareable URL with filter params
- Scheduled email exports

---

## Technical Plan

### Phase 1 — Data contract + services

- Build `/admin/sales` server data pipeline
- Implement KPI aggregation functions with strict typing
- Implement table query with filters + pagination
- Add CSV export endpoint using same filter contract

### Phase 2 — UI implementation

- Create sales page client shell with:
  - control bar,
  - KPI cards,
  - chart workspace,
  - data table
- Add empty/loading/error states

### Phase 3 — Drill-through integration

- Link overview cards into `/admin/sales` with query params
- chart selection updates table filters

### Phase 4 — Validation

- cross-check totals against `/admin/orders`
- verify CSV values match table results exactly
- run precheck and targeted tests

---

## MVP Acceptance Criteria

1. `/admin/sales` route exists and loads with default 30-day range
2. KPI cards display accurate values and prior-period deltas
3. At least 3 chart views are available (trend, split, breakdown)
4. Sales table supports sorting, pagination, and key filters
5. CSV export returns data matching active filters and visible totals
6. Subscription vs one-time metrics are clearly visible and consistent
7. Page handles no-data periods gracefully

---

## Future Extensions

- Contribution margin/profit view (if COGS data becomes available)
- Cohort retention view by first purchase month
- Attribution model improvements (email/newsletter/coupon/direct)
- Forecasting widgets (simple trend projection)
