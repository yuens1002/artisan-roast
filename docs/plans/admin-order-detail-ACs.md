# Admin Order Detail — AC Verification Report

**Branch:** `feat/admin-order-detail`
**Scope:** Shared order detail component + admin order detail page + double-click navigation

---

## Column Definitions

| Column | Filled by | When |
|--------|-----------|------|
| **Agent** | Verification sub-agent | During `/ac-verify` — PASS/FAIL with brief evidence |
| **QC** | Main thread agent | After reading sub-agent report — confirms or overrides |
| **Reviewer** | Human (reviewer) | During manual review — final approval per AC |

---

## Functional Acceptance Criteria (6)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | Shared `OrderDetail` orchestrator in `components/shared/order-detail/OrderDetail.tsx` accepts `order`, `variant` ("storefront" \| "admin"), `backLink`. Renders header (back button + "Order #xxx" + date), then `OrderItemsCard`, then side-by-side grid of `OrderInfoCard` + `ShippingInfoCard`. | Code review: component file, props interface, layout structure | Props typed correctly, layout renders 3 cards, variant prop threads to children | | | |
| AC-FN-2 | `OrderItemsCard` displays items table (product, price, qty, total), totals breakdown (subtotal, discount, shipping, tax, refund, total), and print button right-aligned in CardHeader. No status badge or tracking info on detail page. | Code review: component file + rendered output | Table rows match order items, totals computed correctly, PrintButton in header, no status badge | | | |
| AC-FN-3 | `OrderInfoCard` shows payment method (card last4), delivery method. In admin variant: also shows customer email, phone, Stripe Payment Intent link (`dashboard.stripe.com/payments/{id}`), Stripe Subscription link (if applicable). Storefront variant hides admin-only fields. | Code review: variant conditional rendering | Admin shows all 6 fields, storefront shows only payment + delivery | | | |
| AC-FN-4 | `ShippingInfoCard` shows shipping address (via `ShippingAddressDisplay`) or pickup info. Storefront pickup shows store address via `useSiteSettings`; admin shows "Store Pickup" label only. | Code review: component file, variant conditionals | Address renders, pickup differs by variant | | | |
| AC-FN-5 | Admin server page `app/admin/orders/[orderId]/page.tsx`: calls `requireAdmin()`, fetches order via Prisma with items + user include, returns 404 if not found. Passes order to `AdminOrderDetailClient` which wraps `OrderDetail` with `variant="admin"`. | Code review: auth check, Prisma query, 404 handling, client wrapper | Auth enforced, query includes items + user, notFound() on missing order | | | |
| AC-FN-6 | Storefront `OrderDetailClient.tsx` refactored from ~450 lines to thin wrapper around shared `OrderDetail` with `variant="storefront"` and `backLink={{ href: "/orders", label: "Back to Orders" }}`. | Code review: line count reduction, feature parity check | Wrapper < 30 lines, all existing storefront functionality preserved | | | |

## UI Acceptance Criteria (7)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-1 | Admin order detail page renders at `/admin/orders/[orderId]` with header showing back arrow + "Order #xxx" + formatted date. All expected data is visible: items, prices, quantities, totals, payment info, customer info, shipping address. | Screenshot at desktop + mobile | Header visible, all order data fields populated and readable | | | |
| AC-UI-2 | Order Items card shows items table with columns (product, price, qty, total), totals breakdown, and print button right-aligned in card header. | Screenshot at desktop + mobile | Table readable, totals correct, print button visible | | | |
| AC-UI-3 | Order Info and Shipping Info cards display side-by-side at md+ breakpoint (`md:grid-cols-5`, 3/2 split). Stack vertically on mobile. Admin variant shows customer email, phone, Stripe links with all expected data populated. | Screenshot at desktop (side-by-side) + mobile (stacked) | Side-by-side at md+, stacked on mobile, all admin fields visible with data | | | |
| AC-UI-4 | Print button triggers `window.print()`. CSS `@media print` hides nav, sidebar, back button. Print output shows: shop logo/text, order items with prices, totals, shipping info, and payment info. | Screenshot of print preview | Print hides chrome, shows logo + order detail + shipping + payment info | | | |
| AC-UI-5 | Storefront order detail at `/orders/[orderId]` renders with all expected data visible: items, prices, totals, payment, shipping. Admin-only fields (email, phone, Stripe links) are NOT visible. Visual parity with pre-refactor design. | Screenshot of storefront variant | All storefront data visible, admin fields hidden, no visual regression | | | |
| AC-UI-6 | Mobile views (both variants) have no visual defects: no text crowding, no unexpected line breaks, no content overlap, no content breaking out of parent containers. All text is readable and properly truncated where needed. | Screenshot at mobile (375px) for both admin + storefront | Clean mobile layout, no overflow/crowding/overlap issues | | | |
| AC-UI-7 | Both variants display all expected data fields for their context. Admin: items + totals + customer email + phone + payment method + Stripe links + delivery method + shipping address. Storefront: items + totals + payment method + delivery method + shipping address. | Visual comparison of both variants side-by-side | Every expected field is populated and visible per variant | | | |

## Navigation Acceptance Criteria (4)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-NAV-1 | Double-clicking a row in admin orders table (`OrderManagementClient`) navigates to `/admin/orders/[orderId]`. | Click interaction test on admin orders page | Double-click navigates, single click does not | | | |
| AC-NAV-2 | Double-clicking a row in sales analytics table (`SalesOrdersSection` via `DataTable.onRowDoubleClick`) navigates to `/admin/orders/[orderId]`. | Click interaction test on sales page | Double-click navigates to correct order | | | |
| AC-NAV-3 | Back button on admin order detail navigates to `/admin/orders`. Back button on storefront navigates to `/orders`. | Click back button on both variants | Correct navigation for each variant | | | |
| AC-NAV-4 | Navigating to `/admin/orders/[nonexistent-id]` shows Next.js 404 page. Non-admin users are redirected by auth middleware. | Navigate to invalid order ID + test as non-admin | 404 for missing order, redirect for non-admin | | | |

## Regression Acceptance Criteria (3)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-1 | `npm run precheck` passes with zero errors. | Run `npm run precheck` | Zero TypeScript and ESLint errors | | | |
| AC-REG-2 | `npm run test:ci` — all tests pass, 0 failures. | Run `npm run test:ci` | All tests pass | | | |
| AC-REG-3 | Admin orders table (`/admin/orders`) still functions: sorting, filtering, inline actions (Ship, Refund, Deliver, Cancel) all work. No regression from adding double-click handler. | Interact with orders table | All existing table functionality preserved | | | |

---

## Agent Notes

{Filled during verification.}

## QC Notes

{Filled during QC review.}

## Reviewer Feedback

{Human writes review feedback here.}
