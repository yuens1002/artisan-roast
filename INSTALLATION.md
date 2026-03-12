# Installation (Self-Hosted)

This guide walks a technical shop owner or developer through installing Artisan Roast on a standard PostgreSQL instance (no Neon required).

## Prerequisites

- Node.js 18+ and npm
- Git
- PostgreSQL 15 or 16 (network-accessible), with a database and user created
- Stripe account (test mode is fine) and Stripe CLI for local webhooks (optional)
- OAuth apps for Google/GitHub (or skip if using email/password only)

## 1) Clone and install

```bash

git clone https://github.com/yuens1002/artisan-roast.git artisan-roast
cd artisan-roast
npm install
cp .env.example .env.local
```

## 2) Configure environment

Edit `.env.local`:

- `DATABASE_URL` — Postgres connection string (use pooled/pgBouncer if available)
- `DIRECT_URL` — Direct Postgres URL for migrations (optional but recommended)
- `AUTH_SECRET` — `openssl rand -base64 32`
- Stripe: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (from `stripe listen` during dev)
- OAuth (optional): `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET`
- Email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- AI: Configure via **Settings > AI** in the admin panel (or set `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` in env)
- Image storage: `BLOB_READ_WRITE_TOKEN` (Vercel Blob — see [Image Storage](#image-storage) below)

## 3) Run one-command setup

Creates schema, seeds data, and provisions the first admin. Safe to rerun.

```bash

npm run setup -- --email=owner@shop.com --password=changeme \
  --product-mode=minimal --seed-users=false --seed-synthetic=false
```

Flags:

- `--product-mode=full|minimal` (default minimal seeds 1 coffee + 1 merch)
- `--seed-users=true|false` (default false; you’ll create the owner admin above)
- `--seed-synthetic=true|false` (default false; skip demo analytics/orders)
- `--name=Owner Name` (optional)

## 4) Start the app

```bash

npm run dev
# In another terminal (optional for payments):
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Visit `http://localhost:3000` and sign in with the admin you created.

## 5) Production notes

- Migrations: run `npx prisma migrate deploy` on deploy.
- Backups: `npm run db:backup` writes JSON under `dev-tools/backups/`.
- Adapter auto-detect: Neon vs Postgres is automatic; `DATABASE_ADAPTER=postgres|neon|standard` can force behavior.
- Docker/compose smoke: see `docs/docker-smoke-test.md` for expected build logs, health check (`/api/health`), and persistence checks after `docker compose up --build -d`.

### Image Storage

Admin-uploaded images (product photos, page heroes, category icons) are stored in **Vercel Blob** by default. This keeps uploads persistent across deployments and served via a CDN.

**Setup (Vercel Blob):**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) and select your project
2. Click the **Storage** tab in the top navigation
3. Click **Create Database** → select **Blob**
4. Give it a name (e.g., `artisan-roast-images`) and select **Public** access
5. Click **Create** — Vercel auto-links the store to your project and injects `BLOB_READ_WRITE_TOKEN` into production/preview deployments
6. For **local development only**: go to the Blob store → **Manage** → **Tokens**, copy the token, and add it to your `.env.local`:

   ```env
   BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
   ```

> **Note:** Production deployments on Vercel get the token automatically — no manual env var setup needed. The `.env.local` token is only for `npm run dev`.

**Using a different provider (S3, Cloudinary, etc.):**

All upload logic is centralized in a single file: `lib/blob.ts`. It exports three functions:

- `uploadToBlob()` — uploads a file and returns a public URL
- `deleteFromBlob()` — deletes a file by URL
- `isBlobUrl()` — checks if a URL belongs to the storage provider

To swap providers, replace the implementation in `lib/blob.ts` with your preferred SDK (e.g., `@aws-sdk/client-s3`, `cloudinary`). The rest of the app only depends on these three functions. You will also need to add your storage hostname to the `remotePatterns` array in `next.config.ts` so the Next.js `<Image>` component can optimize the URLs.

### Switching between Neon and local Postgres

- Neon (default): keep `.env.local` `DATABASE_URL` pointing to Neon. Clear any shell override with `unset DATABASE_URL` and (optionally) set `DATABASE_ADAPTER=neon`. Start `npm run dev`.
- Local Postgres (Docker, single DB `artisan_roast`): export the URL below and force the pg adapter. Start `npm run dev` in that shell (or set `PORT=3001` if you prefer 3001).
- To flip back to Neon, open a fresh shell (or `unset DATABASE_URL` / `unset DATABASE_ADAPTER`) so `.env.local` wins.

> Docker Compose uses `.env.docker` and ignores your shell exports. Update `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, and `NEXTAUTH_URL=http://localhost:3000` there, then `docker compose restart app`. Seed the compose DB via `docker compose exec app sh -c "SEED_PRODUCT_MODE=full SEED_INCLUDE_USERS=true SEED_INCLUDE_SYNTHETIC=true npm run seed"`.

#### Copy-paste commands (local Docker DB: `artisan_roast`)

Create and seed (first time or reset):

```typescript

export DATABASE_ADAPTER=postgres
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/artisan_roast?schema=public"
npm run setup -- --email=owner@example.com --password='Changeme123!' --name='Shop Owner' --product-mode=full --seed-users=true --seed-synthetic=true
```

Run dev against the same DB (example on port 3001):

```typescript

export DATABASE_ADAPTER=postgres
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/artisan_roast?schema=public"
PORT=3000 npm run dev
```

```bash

$env:DATABASE_ADAPTER = "postgres"; $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/artisan_roast?schema=public"; $env:PORT = "3000"; npm run dev
```

Switch back to Neon (uses `.env.local`):

```bash

unset DATABASE_URL
unset DATABASE_ADAPTER
npm run dev
```

## Telemetry

Artisan Roast collects **anonymous usage data** to help the maintainers understand how the platform is used. No personal information, customer data, revenue, or product details are ever collected.

### What is collected

- A random instance UUID (not linked to you or your store)
- App version and edition
- Aggregate counts: number of products, users, and orders
- Server environment: Node.js version and OS platform

### When events are sent

| Event | Trigger | Description |
|-------|---------|-------------|
| `install` | First database seed | Confirms a new instance was set up |
| `heartbeat` | Daily cron (`/api/cron/heartbeat`) | Reports aggregate usage stats |

### How to opt out

Three options (checked in priority order):

1. **Environment variable** (highest priority):

   ```env
   TELEMETRY_DISABLED=true
   ```

2. **Database setting**: Set `telemetry_enabled` to `"false"` in the `siteSettings` table.

3. **Admin UI**: Go to **Admin > Support > Data Privacy** and toggle "Share Anonymous Usage Data" off.

### Override the telemetry endpoint

Self-hosters running a fork can point telemetry at their own server:

```env
TELEMETRY_ENDPOINT="https://your-server.com/api/telemetry/events"
```

If unset, events are sent to the default platform endpoint.

## Google Analytics (Optional)

Google Analytics 4 is supported but **disabled by default**. To enable it, add your GA4 Measurement ID to `.env.local`:

```env
NEXT_PUBLIC_GA4_ID="G-XXXXXXXXXX"
```

This tracks **your storefront visitors** using your own GA4 property — it is completely separate from the platform telemetry above. No admin UI toggle exists for this; it is controlled entirely via the environment variable.

## Troubleshooting

- `DATABASE_URL is required`: confirm `.env.local` is loaded and the URL is reachable.
- SSL errors: append `?sslmode=require` for managed Postgres providers.
- Prisma errors after schema change: `npx prisma generate` then rerun setup.
- Stripe webhooks: ensure Stripe CLI is running; refresh `STRIPE_WEBHOOK_SECRET` when restarting `stripe listen`.
