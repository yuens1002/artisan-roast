# Admin Overview — Insights Rework Plan

> **Status:** Proposed
> **Date:** 2026-03-03
> **Scope:** Rework `/admin` overview page using currently available data models only

---

## Objective

Rework the admin home page into an **insight-first dashboard** (not a data dump) that gives a quick, accurate read on store health in under 30 seconds.

This plan follows common e-commerce dashboard patterns used by platforms like Shopify, WooCommerce analytics plugins, and GA4-style commerce views:

1. **Executive summary first** (core business KPIs)
2. **Trend + context** (period-over-period)
3. **Funnel + operations** (what drives/blocks revenue)
4. **Actionable exceptions** (what needs attention now)

---

## Visual Reference

- See `docs/features/admin-overview/VISUAL-MOCKUP.md` for desktop/mobile wireframes and layout diagram.

---

## Data Available Now

Based on existing documented sources, we can reliably compute:

- **Orders:** revenue, refunds, tax, shipping, status, promo usage, delivery/pickup, timestamps, location fields
- **Order items:** quantities, product linkage, purchase option type (subscription vs one-time)
- **Users:** account creation, admin flag, ordering behavior
- **Products/variants:** product counts, category linkage, variant disabled state, sale pricing
- **Analytics events:** product views, page views, add/remove cart, search, sessions
- **Newsletter:** active/inactive subscriber status and signup timestamps
- **Reviews:** ratings, moderation status, admin response coverage

---

## Recommended KPI Set (Overview Page)

Keep this page intentionally focused: **8–10 headline KPIs** total, then deeper detail in dedicated pages.

### 1) Executive KPI Cards (Top Row)

1. **Total Revenue (period)**
2. **Total Orders (period)**
3. **AOV** = Revenue / Orders
4. **Net Revenue** = Revenue - Refund Amount
5. **View → Order Conversion** = Orders / Product Views
6. **Repeat Customer Rate** = Customers with 2+ orders / Customers

### 2) Supporting KPI Chips (Secondary Row)

- **Subscription Revenue %**
- **Refund Rate %**
- **Fulfillment Rate %**
- **Active Subscriber %**

### 3) Operational Alerts (Exception Strip)

Show only if threshold is hit:

- Refund Rate spike (vs prior period)
- Failed/Cancelled orders above threshold
- Newsletter churn spike
- Zero-order products count increasing

---

## Suggested Overview Layout

## Section A — KPI Summary

- 6 primary cards + delta vs previous matching period
- delta styles: positive / neutral / negative

## Section B — Revenue & Orders Trend

- Combined chart (area/line): Revenue + Orders over time
- Granularity: day (30d), week (quarter), month (year)

## Section C — Conversion Funnel

- Product Views → Add to Cart → Orders
- Show both absolute numbers and step conversion rates

## Section D — Mix & Retention

- Subscription vs One-time revenue split
- New vs Repeat customer order split

## Section E — Top Movers (Actionable Lists)

- Top products by revenue
- Top locations by revenue
- Search terms with high volume but low conversion (if available from event/order linking)

---

## KPI Definitions (Source-of-Truth)

Use these definitions consistently across `/admin` and `/admin/sales`.

- **Total Revenue**: `SUM(Order.totalInCents)` for selected period
- **Net Revenue**: `SUM(totalInCents - refundedAmountInCents)`
- **AOV**: `SUM(totalInCents) / COUNT(orders)`
- **Refund Rate**: `COUNT(orders with refundedAmountInCents > 0) / COUNT(orders)`
- **Fulfillment Rate**: `(Delivered + PickedUp) / Total Orders`
- **Subscription Revenue %**: `subscriptionRevenue / totalRevenue`
- **Repeat Customer Rate**: `distinct users with >=2 orders / distinct users with >=1 order`
- **View → Order Conversion**: `orders / productViews`
- **Cart → Order Conversion**: `orders / addToCart events`

---

## Benchmark Approach (Common E-comm Pattern)

### What to adopt

- **Fixed KPI cards** with period delta at top
- **Single date control** that drives entire dashboard
- **Chart toggle per section** (area/bar/pie where it makes sense)
- **Actionable drill-through links** from cards/charts to detail routes

### What to avoid

- Too many cards on first load
- Inconsistent KPI formulas between pages
- Charts without benchmark context (always include delta or prior period)

---

## Technical Implementation Plan

### Phase 1 — KPI service foundation

- Add a shared admin analytics service layer for periodized KPI queries
- Centralize KPI formulas/types to avoid duplication
- Return normalized response shape for cards/charts/lists

### Phase 2 — Overview page rework (`/admin`)

- Replace current stat-only row with structured sections above
- Keep existing admin navigation and shell
- Add reusable chart + stat card wrappers if existing components are insufficient

### Phase 3 — Drill-through and linking

- Link KPI cards to `/admin/orders`, `/admin/analytics`, `/admin/newsletter`, `/admin/sales`
- Preserve selected date range in URL search params

### Phase 4 — Validation and instrumentation

- Verify formula consistency against known sample windows
- Add loading, empty, and partial-data states
- Performance check for default 30-day range

---

## Initial Date Presets

- Today
- Last 7 Days
- Last 30 Days (default)
- This Quarter
- Custom Range

---

## Risks & Mitigations

- **Risk:** Event data may be sparse for conversion KPIs
  - **Mitigation:** show confidence note and fall back to order-based KPIs
- **Risk:** Query cost for many cards/charts on initial load
  - **Mitigation:** aggregate in one backend payload per period
- **Risk:** KPI confusion from similar metrics (Revenue vs Net Revenue)
  - **Mitigation:** tooltip definitions and shared glossary

---

## MVP Acceptance Criteria

1. `/admin` shows 6 executive KPIs with period delta and consistent formulas
2. Revenue trend chart and conversion funnel render from live data
3. Subscription mix and repeat customer metrics are visible
4. At least 2 operational alert conditions are implemented
5. Every KPI card links to a relevant drill-through page
6. Empty state and loading state are handled for all sections
