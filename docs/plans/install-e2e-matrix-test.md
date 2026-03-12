# Plan: Install E2E Matrix Test

## Goal

Automated CI workflow that verifies the app boots and behaves correctly across all env-var combinations — from bare-minimum (2 vars) to fully configured. Catches regressions like "app crashes without Stripe" before they reach users.

## Matrix

| Profile | Env Vars | Expected Health | Checkout | Email |
|---------|----------|----------------|----------|-------|
| `minimal` | `DATABASE_URL`, `AUTH_SECRET` | `degraded` (200) | Disabled | Skipped |
| `stripe-only` | + `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `degraded` (200) | Enabled | Skipped |
| `resend-only` | + `RESEND_API_KEY` | `degraded` (200) | Disabled | Enabled |
| `full` | All keys | `ok` (200) | Enabled | Enabled |

> "Enabled" / "Disabled" = the UI state, not whether the service actually processes anything.
> Stripe/Resend test keys are fine — we're testing app behavior, not third-party APIs.

## Workflow Design

**File:** `.github/workflows/install-matrix.yml`
**Trigger:** Push to `main`, weekly schedule (Sunday 3 AM UTC)
**Runner:** `ubuntu-latest`

### Steps per matrix entry

1. **Postgres service container** — `postgres:16` with health check
2. **Node 22 + npm ci** (with dependency cache)
3. **Generate Prisma client** — `npx prisma generate`
4. **Migrate** — `npx prisma migrate deploy`
5. **Seed** — `node scripts/seed-if-empty.js`
6. **Build** — `npm run build:no-migrate`
7. **Start server** — `npm start &`, wait for ready
8. **Health check** — `curl /api/health`, assert status + HTTP code
9. **Checkout state** — `curl /api/checkout` (POST with empty body), assert 503 or 400 based on profile
10. **Storefront renders** — `curl /` and assert 200 + contains `<html`
11. **Teardown** — kill server

### Environment secrets

CI secrets already exist for `DATABASE_URL`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`. The matrix profiles selectively include/exclude them.

For the `minimal` profile, `DATABASE_URL` points to the Postgres service container (no external Neon needed).

## Assertions

| Check | `minimal` | `stripe-only` | `resend-only` | `full` |
|-------|-----------|---------------|---------------|--------|
| Health HTTP code | 200 | 200 | 200 | 200 |
| Health `.status` | `degraded` | `degraded` | `degraded` | `ok` |
| Health `.checks.database.status` | `ok` | `ok` | `ok` | `ok` |
| Health `.checks.stripe.status` | `skipped` | `ok` | `skipped` | `ok` |
| Health `.checks.resend.status` | `skipped` | `skipped` | `ok` | `ok` |
| `POST /api/checkout` | 503 | 400 (no body) | 503 | 400 (no body) |
| `GET /` | 200 | 200 | 200 | 200 |

## Seed Idempotency Check

Added to the `minimal` profile only:
1. After initial seed, record `Product.count()`
2. Run `node scripts/seed-if-empty.js` again
3. Assert count unchanged

## Implementation Notes

- Use `services:` block for Postgres (GitHub Actions native, no Docker Compose needed)
- Use `matrix.include` with named profiles for readability
- Keep the workflow lightweight — no Puppeteer/browser, just `curl` + `jq`
- The `full` profile uses dummy/test Stripe + Resend keys from CI secrets
- Timeout: 10 minutes per profile (build is the bottleneck)
- Fail-fast disabled — run all profiles even if one fails

## Future Extensions

- **Docker Compose smoke test** — separate job that runs `docker compose up --build` and tests
- **Vercel preview deploy test** — hit the preview URL after deployment
- **Doc link checker** — markdown link validator in CI
- **Puppeteer visual regression** — screenshot storefront + admin dashboard
