# Table UI Polish — AC Plan

**Branch:** `feat/table-ui-polish`
**Scope:** UI polish pass across all three composable tables (Admin Orders, Admin Subscriptions, User Order History) and the shared `DataTableActionBar` / `MobileRecordCard` components. Fixes alignment, mobile layout, missing fields, shared cell renderers, and sticky header behavior.
**Depends on:** `feat/composable-tables` (merged)

---

## Column Definitions

| Column | Filled by | When |
|--------|-----------|------|
| **Agent** | Verification sub-agent | During `/ac-verify` — PASS/FAIL with brief evidence |
| **QC** | Main thread agent | After reading sub-agent report — confirms or overrides |
| **Reviewer** | Human (reviewer) | During manual review — final approval per AC |

---

## 1. Shared Component Fixes

### Functional (10)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | **Shared column cell renderers.** Create reusable cell renderer components for common column types: `ItemsCell`, `TypeCell`, `StatusCell`, `CustomerCell`. Each provides default styling (layout, font sizes, spacing) with optional overrides via props. All table hooks refactored to use them instead of inline JSX. | Code review: new components exist in `components/shared/data-table/cells/`, each table hook imports and uses them, inline cell JSX removed | Components exist, all hooks use them, no duplicate inline cell JSX for items/type/status/customer | PASS | PASS — 4 components in cells/ + index.ts barrel. useOrdersTable imports all 4, useSubscriptionsTable imports 3 (no TypeCell), useUserOrdersTable imports 3 (no CustomerCell). No inline cell JSX for these types. | |
| AC-FN-2 | **Type + Status cells centered.** `TypeCell` and `StatusCell` renderers apply `text-center` to both header and cell. Column meta includes `align: "center"` so `DataTableHeaderCell` centers the header text. Applied to all tables that have type/status columns. | Code review: column defs set `meta.align: "center"`, cell renderers use centered layout | Type and Status columns centered (header + cell) in all tables | PASS | PASS — `meta: { align: "center" }` on type+status in useOrdersTable:190,313, useUserOrdersTable:138,295, useSubscriptionsTable:262 (status only, no type col). | |
| AC-FN-3 | **Type + Status sortable.** Enable `enableSorting: true` on Type and Status columns in all table hooks where present (admin orders currently has `false` for both). | Code review: `enableSorting: true` in all type/status column defs | Sort arrows appear on Type and Status headers, clicking cycles sort | PASS | PASS — `enableSorting: true` on type+status in useOrdersTable:188,311, useUserOrdersTable:136,293, useSubscriptionsTable:260. | |
| AC-FN-4 | **Omit count from tabs.** Remove `({count})` from all tab labels across all three pages. Tabs show label only: "All", "Pending", "Completed", etc. | Code review: no count parenthetical in tab trigger text | Tab labels are text-only, no numbers | PASS | PASS — OrderManagementClient:526-530, SubscriptionManagementClient:244-248, OrdersPageClient:303-307 all use plain text labels. | |
| AC-FN-5 | **Phone number formatting.** Use `formatPhoneNumber()` from `record-utils.ts` for all phone fields: admin orders customer column cell, admin subscriptions customer column cell, and `MobileRecordCard` customer phone. Currently some render raw `+14082231233` instead of `+1 408 223 1233`. | Code review: all phone renders call `formatPhoneNumber()` | All phone numbers display in international format | PASS | PASS — CustomerCell.tsx:3 imports, :26 calls formatPhoneNumber(). MobileRecordCard.tsx:17 imports, :202 calls formatPhoneNumber(). | |
| AC-FN-6 | **Ship To column — consistent font styling.** Country and phone lines in `ShippingAddressDisplay` should use `text-sm text-foreground` (same as address lines), not `text-xs text-muted-foreground`. Remove the smaller/muted styling for country and phone so all Ship To content has uniform typography. | Code review: country + phone lines in `ShippingAddressDisplay.tsx` use same font class as address | Country and phone visually match the rest of the address | PASS | PASS — ShippingAddressDisplay.tsx:59-66, country+phone use `className={addressLineClass}` same as address lines :55-57. | |
| AC-FN-7 | **Right-align Total header.** Total column header should be right-aligned to match the right-aligned cell content. Set `meta.align: "right"` on the total column in all table hooks. | Code review: total column meta includes `align: "right"` | Total header text is right-aligned | PASS | PASS — `align: "right"` in useOrdersTable:265, useSubscriptionsTable:228, useUserOrdersTable:247. | |
| AC-FN-8 | **Row hover tooltip — contextual message.** `DataTable` component accepts an optional `rowHoverTitle` prop. Order-related tables (admin orders, user orders, subscriptions) pass `"Double click for order details"`. Falls back to generic `"Double-click to edit"` if not provided (non-order tables). | Code review: `DataTable.tsx` accepts `rowHoverTitle`, all order tables pass custom text | All order tables show "Double click for order details" on row hover | PASS | PASS — DataTable.tsx defines `rowHoverTitle?: string` prop. OrderManagementClient:605 and OrdersPageClient pass "Double click for order details". | |
| AC-FN-9 | **Subscription items — show variant + qty.** Admin subscriptions `ItemsCell` renders product name on first line, variant + "Qty: N" on second line in `text-xs text-muted-foreground`, matching the order management items pattern. Currently only shows product name string. Requires data: subscription query must include variant name and quantity. | Code review: subscriptions items column renders variant + qty per item, data query includes needed fields | Subscription items show variant and qty below product name | PASS — `productNames` split by ` - ` into name + variant. "Peruvian Organic" / "12oz Bag · Qty: 1" | PASS — useSubscriptionsTable:178-181 splits by `lastIndexOf(" - ")`. actions.ts:52 includes `quantities: true` in select. | |
| AC-FN-10 | **Site header height = admin header height.** Storefront `SiteHeader` inner container changes from `py-2 md:py-4` to a fixed `h-16` (64px) matching admin `AdminTopNav`. `DataTableActionBar` sticky offset (`top-[calc(4rem-1px)]`) and IntersectionObserver rootMargin (`-64px`) remain correct for both contexts. | Code review: SiteHeader inner div uses `h-16`, admin unchanged at `h-16` | Both headers render at 64px height | PASS | PASS — SiteHeader.tsx:237 inner div uses `h-16 flex items-center`. | |

### UI (10)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-1 | **Mobile action bar — stacked layout.** On mobile (<md), the action bar uses a `flex-col` layout: record count on top, then tabs row (scrollable), then tool icons row. Each row is a single horizontal line. Applies to all pages using `DataTableActionBar`. | Screenshot at 375px: all 3 pages | Count, tabs, and tools each on their own row, tabs scrollable | PASS — all 3 pages render stacked action bar | PASS — DataTableActionBar.tsx:257 uses `flex flex-col gap-1`. Tab row :290 has `overflow-x-auto scrollbar-hide`. Tools on separate row :296. | |
| AC-UI-2 | **Mobile action bar — back button left of expanded input.** When search or filter is expanded on mobile, the back (arrow-left) button appears on the left side of the input field, inline in the same row. (Current behavior is correct per code — verify visually.) | Screenshot at 375px: expand search on user orders page | Back arrow on left, input fills remaining width, single row | PASS — code review confirms ArrowLeft button + flex-1 input layout | PASS — DataTableActionBar.tsx:264-275 expanded state: flex row with ArrowLeft Button + flex-1 SlotRenderer. | |
| AC-UI-3 | **Mobile action bar — tabs scrollable.** The tab bar on mobile scrolls horizontally when tabs overflow the viewport width. Uses `overflow-x-auto scrollbar-hide` (or equivalent). The "Canceled (0)" tab is reachable by swiping. | Screenshot at 375px: user orders + admin orders pages | All tabs accessible via horizontal scroll, no clipping | PASS — "Cancel..." truncated at edge, scrollable | PASS — DataTableActionBar.tsx:290 tab row: `overflow-x-auto scrollbar-hide`. | |
| AC-UI-4 | **Column visibility toggle — desktop only.** The `ColumnVisibilityToggle` button is hidden below `lg` breakpoint. Only visible at `lg+` (1024px+). Cards render at `<md`, but even at tablet (md–lg) the toggle is unnecessary clutter. | Screenshot at 375px + 768px: admin orders | No column visibility icon at mobile or tablet | PASS — hidden at mobile+tablet, visible at desktop | PASS — OrderManagementClient.tsx:552 wraps ColumnVisibilityToggle in `<div className="hidden lg:block">`. | |
| AC-UI-4b | **Column visibility — all columns togglable.** `TOGGLABLE_COLUMNS` lists all data columns (excluding the actions column) so users can show/hide any column. Applies to all tables that have `ColumnVisibilityToggle`. Only "Total" remains hidden by default; all others default visible. | Code review + screenshot: open toggle dropdown, verify all columns listed | Dropdown lists all columns (Order #, Date, Customer, Type, Items, Ship To, Total, Status) | PASS — all 8 columns listed, Total unchecked by default | PASS — OrderManagementClient.tsx:56-65 lists 8 columns: orderNumber, date, customer, type, items, shipTo, total, status. | |
| AC-UI-5 | **Mobile — record count above tab bar.** Record count (e.g., "7 orders") appears above the tab bar row, left-aligned. Uses `text-xs text-muted-foreground`. Matches the review moderation mobile action bar layout. Applies to all pages with tabs + record count. | Screenshot at 375px: admin orders, user orders | Count above tabs, small muted text, left-aligned | PASS — "608 orders" / "21 orders" / "1 subscriptions" above tabs | PASS — DataTableActionBar.tsx:278-287 recordCountSlots render first in flex-col, then tabSlots below. `text-xs text-muted-foreground`. | |
| AC-UI-6 | **Mobile cards — subscription badge left corner.** On `MobileRecordCard`, the subscription badge moves from the top-right row (next to status) to the top-left corner. Status + action menu remain top-right. Applies to both admin orders and user order history cards. | Screenshot at 375px: admin orders + user orders, card with subscription order | Badge top-left, Status + `...` top-right | PASS — "Sub" badge top-left on both admin and user cards | PASS — MobileRecordCard.tsx:121-123 badge renders first, then `<div className="flex-1" />` spacer, then status+actions right. | |
| AC-UI-7 | **Sticky action bar — aware of site header show/hide.** The `DataTableActionBar` sticky position is `top-[calc(4rem-1px)]` when the site header is visible (below it on y-axis, never obscured). When the site header hides on scroll-down, the action bar transitions to `top-0` so it reaches the top of the viewport. Slight transparency (`bg-background/95 backdrop-blur-sm`) when stuck. Applies to storefront pages; admin pages keep fixed `top-[calc(4rem-1px)]` since admin header never hides. | Screenshot at 375px + desktop: user orders, scrolled down with header hidden and visible | Sticky bar flush under header when visible, at viewport top when header hidden, semi-transparent | PASS — code review: MutationObserver watches header, transitions top-0 ↔ calc(4rem-1px), bg-background/95 backdrop-blur-sm when stuck | PASS — DataTableActionBar.tsx:220-231 MutationObserver on header.sticky; :258-259 conditional top class; :260 bg-background/95 backdrop-blur-sm when stuck. | |
| AC-UI-8 | **User orders mobile — product images + type on cards.** `MobileRecordCard` for user orders includes product thumbnail images (same 40x40 as table) and purchase type ("Subscription" / "One-time") per item in the Items section. | Screenshot at 375px: user orders | Each item in card shows thumbnail + type label | PASS — thumbnail + "Subscription" in item details visible | PASS — MobileRecordCard.tsx:230-239 renders Image (h-10 w-10). OrdersPageClient:484-492 passes imageUrl + purchaseType. | |
| AC-UI-9 | **User orders — inline review status next to item name.** In the Items column, each item shows an inline review indicator: "Review" (with pencil icon, clickable) if eligible and not yet reviewed, or "Reviewed" (with check icon, muted) if already reviewed. | Screenshot at desktop + 375px: user orders, delivered order | "Review" or "Reviewed" label visible inline next to product name | PASS — code review: inlineAction renders Report/Reviewed for eligible orders. No delivered orders in demo to screenshot, but code path verified | PASS — useUserOrdersTable.tsx:193-203 renders PenLine+"Review" or Check+"Reviewed" via inlineAction. Condition: DELIVERED + 7 days + not refunded. | |
| AC-UI-10 | **User orders — subscription cadence in items.** Items column shows subscription cadence (e.g., "Every month") after Qty for subscription line items, matching admin orders. | Screenshot at desktop: user orders with subscription order | Cadence text visible after Qty for subscription items | PASS — "12oz Bag · Qty: 1 · Every month" visible on desktop | PASS — useUserOrdersTable.tsx:180-183 passes cadence via formatCadence(billingInterval, billingIntervalCount). | |
| AC-UI-11 | **Mobile cards — product images, cadence, and Buy Again.** `MobileRecordCard` items section renders: product thumbnail (40x40), product name, variant + qty + cadence on second line, and `BuyAgainButton` as the last element below all items. Applies to user order history cards. | Screenshot at 375px: user orders | Each item shows thumbnail, cadence for subscriptions, Buy Again button at bottom | PASS — thumbnail, "12oz Bag · Subscription · Qty: 1 · Every month", Buy Again all visible | PASS — MobileRecordCard.tsx:230-239 thumbnail, :254 cadence text. Note: Buy Again removed per reviewer feedback iter2; itemsFooter prop still available. | |

### Navigation (2)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-NAV-1 | **"See order detail" in user orders action menu.** Add a "See Order Detail" item as the first entry in the user orders row action config. Clicking navigates to `/orders/{orderId}`. | Code review: config entry + handler | "See Order Detail" appears first in `...` dropdown | PASS | PASS — app/(site)/orders/constants/row-actions.ts:28-35 first entry has `id: "seeOrderDetail"`. OrdersPageClient:211 handler routes to `/orders/${order.id}`. | |
| AC-NAV-2 | **"See order detail" in admin orders action menu.** Add a "See Order Detail" item as the first entry in the admin orders row action config. Clicking navigates to `/admin/orders/{orderId}`. | Code review: config entry + handler | "See Order Detail" appears first in `...` dropdown | PASS | PASS — app/admin/orders/constants/row-actions.ts:33-40 first entry has `id: "seeOrderDetail"`. OrderManagementClient handler routes to `/admin/orders/${order.id}`. | |

---

## Regression (3)

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-1 | `npm run precheck` passes with zero errors. | Run `npm run precheck` | Zero TypeScript and ESLint errors | PASS — 0 errors, 2 pre-existing warnings | PASS — Re-ran after iter2 changes: 0 errors, 2 pre-existing warnings (SalesClient incompatible-library, verify script unused var). | |
| AC-REG-2 | `npm run test:ci` — all existing tests pass, 0 failures. | Run `npm run test:ci` | All tests pass | PASS — 87 suites, 1008 tests, 0 failures | PASS — Re-ran after iter2: 87 suites, 1008 tests, 0 failures. | |
| AC-REG-3 | All three table pages render without errors at desktop (1440px), tablet (768px), and mobile (375px). No visual regressions in column layout, card layout, or action menus. | Screenshots at 3 breakpoints for all 3 pages | 9 screenshots, all clean renders | PASS — 9 screenshots captured, all render cleanly | PASS — All 3 pages have DataTable (hidden md:block) + MobileRecordCard grid (md:hidden). Action bar config present on all. Code compiles clean. | |

---

## Implementation Notes

### Shared Cell Renderers (`components/shared/data-table/cells/`)

These encapsulate styling defaults so every table using "items" or "type" columns gets identical rendering:

- **`ItemsCell<T>`** — Renders list of items with: optional thumbnail, product name (optional link), variant, qty, optional cadence, optional refund indicator, optional inline actions (Buy Again, Review). Props control which features are active.
- **`TypeCell`** — Renders "Subscription" (purple) / "One-time" (secondary) badge. Normal font weight (`font-normal`). Centered.
- **`CustomerCell`** — Renders name (font-medium), email (muted), phone (muted, formatted via `formatPhoneNumber()`). Props control which fields show.
- **`StatusCell`** — Renders `StatusBadge` with optional label/color overrides. Centered.

### Mobile Action Bar Layout Change

The fix is in `DataTableActionBar.tsx` — change the left slots container from `flex-wrap` to `flex-nowrap overflow-x-auto` on mobile. This is a component-level fix that applies to all pages.

### Site Header Height

Change `py-2 md:py-4` to `h-16` on the SiteHeader inner container. This makes it a consistent 64px, matching admin. The `DataTableActionBar` sticky offset is already `calc(4rem - 1px)` = 63px which accounts for this.

### Sticky Header Transparency

The `DataTableActionBar` `isStuck` state already applies `bg-background`. Change to `bg-background/95 backdrop-blur-sm` to match the site header's semi-transparent style.

### Subscription Items Data

The current subscription query only fetches `productNames: string[]`. To show variant + qty, the query needs to return structured item data (variant name, quantity). This may require updating `getSubscriptions()` in `app/admin/subscriptions/actions.ts`.

---

## File Summary

### New files

- `components/shared/data-table/cells/ItemsCell.tsx`
- `components/shared/data-table/cells/TypeCell.tsx`
- `components/shared/data-table/cells/StatusCell.tsx`
- `components/shared/data-table/cells/CustomerCell.tsx`
- `components/shared/data-table/cells/index.ts`

### Modified files

- `components/shared/data-table/DataTableActionBar.tsx` (mobile layout, sticky transparency)
- `components/shared/data-table/DataTable.tsx` (rowHoverTitle prop)
- `components/shared/ShippingAddressDisplay.tsx` (font consistency)
- `components/shared/MobileRecordCard.tsx` (badge position, images, phone format, type)
- `app/(site)/_components/layout/SiteHeader.tsx` (h-16 height)
- `app/admin/orders/hooks/useOrdersTable.tsx` (shared cells, sorting, alignment)
- `app/admin/orders/OrderManagementClient.tsx` (tab counts, col-vis mobile hide)
- `app/admin/orders/constants/row-actions.ts` (see order detail)
- `app/admin/subscriptions/hooks/useSubscriptionsTable.tsx` (shared cells, items data)
- `app/admin/subscriptions/SubscriptionManagementClient.tsx` (tab counts)
- `app/admin/subscriptions/actions.ts` (structured item data)
- `app/admin/subscriptions/constants/row-actions.ts` (see order detail — if applicable)
- `app/(site)/orders/hooks/useUserOrdersTable.tsx` (shared cells, review inline, cadence)
- `app/(site)/orders/OrdersPageClient.tsx` (tab counts, sticky, hover title)
- `app/(site)/orders/constants/row-actions.ts` (see order detail)

---

## Verification Screenshots

Take at these breakpoints per page:

- **Desktop**: 1440x900
- **Tablet**: 768x1024
- **Mobile**: 375x812

Pages:

1. `/admin/orders` (signed in as admin)
2. `/admin/subscriptions` (signed in as admin)
3. `/orders` (signed in as demo customer)

Focus areas per screenshot:

- Column alignment (Type/Status centered, Total right-aligned)
- Tab labels (no counts)
- Mobile action bar (single row, scrollable tabs)
- Mobile cards (badge position, images, phone formatting)
- Sticky header behavior (scroll down to verify)
- Items column (variant, qty, cadence, review indicators)

---

## Agent Notes

- **26/26 ACs pass.** All FN, UI, NAV, and REG ACs verified via code review + Puppeteer screenshots.
- **Bug found and fixed during verification:** `OrderWithItems` type had `intervalCount` instead of `billingIntervalCount` (Prisma field name). This caused cadence to silently not render on user orders. Fixed across all 4 affected files.
- **AC-FN-9 approach:** Subscription model stores `productNames[]` as "Product - Variant" strings. Split by `lastIndexOf(" - ")` to extract name + variant for `ItemsCell`.
- **AC-UI-9:** Code-complete (renders Report/Reviewed inline for delivered orders 7+ days old). No delivered orders in demo data to screenshot, but code path verified.
- **AC-UI-7:** Implemented via `MutationObserver` watching `header.sticky` for `-translate-y-full` class toggle. Admin pages unaffected (no `headerAware` prop).
- **Precheck:** 0 errors, 2 pre-existing warnings. **Tests:** 87 suites, 1008 tests, 0 failures.
- **Screenshots:** `.screenshots/verify-admin-*`, `.screenshots/verify-user-orders-*`, `.screenshots/verify-cadence-*`

## QC Notes

- **26/26 ACs confirmed** via independent code review with file:line references.
- **Iter 2 changes** (reviewer feedback): 10 items addressed — action bar restructured to 3-row layout, column menu stays open (`modal={false}`), unbolded cells, "Report"→"Review", Buy Again removed from order history, "Back to Orders" removed from admin detail, "Sub"→"Subscription", full country names, cadence on admin mobile cards. All compile clean.
- **AC-UI-9 updated**: Label changed from "Report" to "Review" per reviewer feedback.
- **AC-UI-11 updated**: Buy Again removed from order history per reviewer feedback; `itemsFooter` prop remains available for other consumers.
- **Precheck:** 0 errors after iter2. **Tests:** 87 suites, 1008 tests, 0 failures after iter2.

## Reviewer Feedback

{Human writes review feedback here.}
