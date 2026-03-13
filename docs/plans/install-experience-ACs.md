# Install Experience — Acceptance Criteria

## Context

Shipped in v0.95.4–v0.95.6 across PRs #226, #228–#231. Implements the "5-Minute Install" plan: graceful degradation (lazy Stripe/Resend singletons), auto-seed, setup checklist, integration banners, VAPI disable, docs restructure, and install matrix CI.

## AC1: App boots with minimal env vars

**Given** only `DATABASE_URL` and `AUTH_SECRET` are set
**When** the app starts
**Then** it boots without crash, storefront renders, admin dashboard loads

**Verification:** Build succeeds with `npm run build:no-migrate` using only those 2 vars. Storefront returns HTTP 200.

## AC2: Health endpoint returns correct status

**Given** only `DATABASE_URL` and `AUTH_SECRET` are set
**When** `GET /api/health` is called
**Then** HTTP 200 with `status: "ok"`, `checks.database.status: "ok"`, `checks.stripe.status: "skipped"`, `checks.resend.status: "skipped"`

**Given** all keys are set (Stripe + Resend)
**When** `GET /api/health` is called
**Then** HTTP 200 with `status: "ok"`, all checks `"ok"`

## AC3: Checkout guard — storefront

**Given** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is NOT set
**When** a customer views the cart
**Then** checkout button is disabled and a message reads "Payments are not configured yet. The store owner needs to add Stripe keys."

## AC4: Checkout API returns 503

**Given** `STRIPE_SECRET_KEY` is NOT set
**When** `POST /api/checkout` is called
**Then** HTTP 503 with JSON `{ "error": "Payments not configured" }`

## AC5: Contact API returns 503

**Given** `RESEND_API_KEY` is NOT set
**When** `POST /api/contact` is called
**Then** HTTP 503 with JSON `{ "error": "Email not configured" }`

## AC6: Email silently skipped

**Given** `RESEND_API_KEY` is NOT set
**When** an admin ships/delivers/picks up an order
**Then** the status update succeeds (HTTP 200) without sending email (no crash)

## AC7: Password reset without Resend

**Given** `RESEND_API_KEY` is NOT set
**When** a user requests a password reset
**Then** the function returns `{ ok: true }` without crashing

## AC8: Setup checklist on dashboard

**Given** a fresh install (no products, no Stripe, no Resend, default store name)
**When** an admin visits the dashboard
**Then** a "Getting started (0/4)" checklist appears with:

- [ ] Add your products → link to /admin/products/new
- [ ] Configure payments (Stripe) → link to setup guide
- [ ] Configure email (Resend) → link to setup guide
- [ ] Customize your store branding → link to /admin/settings

**When** the admin dismisses the checklist
**Then** it stays hidden (localStorage persistence)

**When** all 4 checks are complete
**Then** the checklist auto-hides without needing dismiss

## AC9: Integration banners

**Given** `STRIPE_SECRET_KEY` is NOT set
**When** an admin visits /admin/orders
**Then** a yellow "Stripe not configured" banner appears

**Given** `STRIPE_SECRET_KEY` is NOT set
**When** an admin visits /admin/subscriptions
**Then** a yellow "Stripe not configured" banner appears

**Given** `STRIPE_SECRET_KEY` IS set
**When** an admin visits /admin/orders or /admin/subscriptions
**Then** no banner appears

## AC10: Auto-seed on Vercel

**Given** `VERCEL=1` is set and DB is empty and `SEED_ON_BUILD` is not set
**When** `scripts/build-resilient.js` runs
**Then** the DB is seeded with minimal data

**Given** `SEED_ON_BUILD=false`
**When** `scripts/build-resilient.js` runs
**Then** seeding is skipped

## AC11: seed-if-empty.js idempotency

**Given** the DB already has products
**When** `node scripts/seed-if-empty.js` runs
**Then** product count remains unchanged (no duplicates)

## AC12: VAPI fully disabled

**Given** any environment (demo mode or not, any user)
**When** a user visits the homepage
**Then** the VoiceBarista component never renders; ChatBarista renders instead

**Evidence:** `app/(site)/page.tsx` has `const showVoiceBarista = false`

## AC13: Install matrix CI

**Given** the workflow `.github/workflows/install-matrix.yml` triggers
**When** all 4 profiles run (minimal, stripe-only, resend-only, full)
**Then** all profiles pass: health assertions, checkout assertions, storefront renders, seed idempotency

## AC14: Build without Stripe keys

**Given** only `DATABASE_URL` and `AUTH_SECRET` are set
**When** `npm run build:no-migrate` runs
**Then** build completes successfully (no `new Stripe()` crash at module evaluation)

**Evidence:** No remaining `new Stripe(process.env.STRIPE_SECRET_KEY` outside `lib/services/stripe.ts`

## AC15: Deploy button URLs

**Given** the README.md Vercel deploy button
**When** a user clicks it
**Then** it opens the correct `artisan-roast` repo (not `ecomm-ai-app`)

## AC16: INSTALLATION.md accuracy

The doc has 3 install paths:

1. **Vercel One-Click** — 3 steps, links to correct repo
2. **Docker Compose** — 4 steps, includes `seed-if-empty.js`
3. **Local Development** — 5 steps, correct commands

Optional Integrations table lists Stripe, Resend, AI, OAuth, Blob, Webhooks.
Telemetry section documents opt-out methods.

## Verification approach

- **Automated (code review + grep):** AC1, AC2, AC4, AC5, AC12, AC14, AC15
- **Automated (unit tests):** AC7 (password-reset.test.ts)
- **Visual (screenshots):** AC3, AC8, AC9
- **Manual or CI run:** AC6, AC10, AC11, AC13, AC16
