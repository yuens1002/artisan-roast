# Artisan Roast — Install Verification

> **Reference stack:** Neon (database) + Vercel (deployment).
> Any hosted PostgreSQL accepting standard Prisma connection strings is supported,
> but results are only guaranteed on the reference stack.
>
> Verified nightly against a fresh install: empty Neon database + dedicated QA Vercel deployment.
> Push to `main` triggers DB reset + redeployment (`install-test.yml`); browser verification
> runs the following morning at 6am UTC (`qa-nightly.yml`) via Claude Agent SDK + Playwright.
> Known values are injected from CI secrets — never hardcoded in this file.

---

## Install Flow

| AC | What | Verification | Pass |
|----|------|-------------|------|
| AC-IF-1 | /setup accessible on fresh install | Navigate to /setup; assert URL, EULA heading text, absence of "You're all set" | Page loads; EULA heading visible; no "You're all set" message |
| AC-IF-2 | Accept button is scroll-gated | Assert accept button is disabled; assert "Scroll to the bottom" hint text visible | "Looks good, let's continue" button is disabled; scroll hint shown |
| AC-IF-3 | Accept button enables after scrolling to bottom | Scroll EULA pane to bottom using scroll_to_bottom tool; assert accept button becomes enabled | "Looks good, let's continue" button is enabled |
| AC-IF-4 | EULA acceptance advances to Store Setup step | Click "Looks good, let's continue"; assert "Your Store" step visible and name input present | Step indicator shows Your Store active; form fields visible |
| AC-IF-5 | Admin account creation and store name seeding succeed with known values | Fill Store Name=$QA_STORE_NAME first, then Full Name=$QA_ADMIN_NAME, Email=$QA_ADMIN_EMAIL, Password=$QA_ADMIN_PASSWORD, Confirm=$QA_ADMIN_PASSWORD; submit; handle redirect chain; sign in if needed | Browser reaches /admin; $QA_STORE_NAME seeded in DB |
| AC-IF-6 | /setup is locked out after admin exists | Navigate to /setup; assert "You're all set" text; assert name input absent | "You're all set" shown; no form visible |

## Known Value Round-Trips

| AC | What | Verification | Pass |
|----|------|-------------|------|
| AC-KV-1 | Admin name visible in admin UI | Navigate to /admin; assert $QA_ADMIN_NAME in page text | $QA_ADMIN_NAME appears on screen |
| AC-KV-2 | Admin email and password authenticate | Clear session (cookies + localStorage); navigate to /auth/admin-signin; sign in with $QA_ADMIN_EMAIL + $QA_ADMIN_PASSWORD | Login succeeds; redirected to /admin |
| AC-KV-3 | Store name appears in storefront header and footer | Navigate to / (homepage); call read_page; assert $QA_STORE_NAME appears in both the header/nav area and the footer section of the page | $QA_STORE_NAME visible in header AND footer |
| AC-KV-4 | Store name appears in admin settings | Navigate to /admin/settings; assert $QA_STORE_NAME in page text (including input values) | $QA_STORE_NAME visible in store settings section |

## Initial App State

| AC | What | Verification | Pass |
|----|------|-------------|------|
| AC-IS-1 | Getting Started checklist visible on fresh install | Navigate to /admin; assert "Getting started" text present | Checklist visible on dashboard |
| AC-IS-2 | Products section shows empty state | Navigate to /admin/products; assert URL and "No products" text | Empty state message shown; no products listed |
| AC-IS-3 | Orders section shows empty state | Navigate to /admin/orders; assert URL and "No orders" text | Empty state message shown; no orders listed |
| AC-IS-4 | Settings page loads without error | Navigate to /admin/settings; assert URL reached (no redirect) | Page renders without error |
| AC-IS-5 | Storefront homepage loads without error | Navigate to /; assert URL reached (no redirect) | Page renders without error |
| AC-IS-6 | Admin navigation links are all reachable | Navigate directly to /admin/products, /admin/orders, /admin/settings, /admin/support/plans; assert URL for each | No 404 or 500 on Products, Orders, Settings, Plans |
| AC-IS-7 | Plans page renders without error on fresh install | Navigate to /admin/support/plans; assert page loads (plan cards or empty-state message visible; no `[object Object]` text) | Page renders; no raw object strings visible |
| AC-IS-8 | Search Settings page renders without error on fresh install | Navigate to /admin/settings/search; assert URL reached; assert "Search drawer chips" and "Curated products" section headings present | Page renders; both sections visible (defaults to 1st label / 1st category by `order` when no settings persisted yet) |
