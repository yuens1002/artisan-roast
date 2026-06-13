<div align="center">

# Artisan Roast

## The open-source e-commerce platform built for specialty coffee

**Your beans deserve better than Shopify.**

[**Try the Live Demo**](https://demo.artisanroast.app/) | [Self-Host Guide](./INSTALLATION.md) | [Documentation](./docs/)

[![Build](https://github.com/yuens1002/artisan-roast/actions/workflows/build-safe-main.yml/badge.svg)](https://github.com/yuens1002/artisan-roast/actions/workflows/build-safe-main.yml)
[![Nightly QA](https://github.com/yuens1002/artisan-roast/actions/workflows/qa-nightly.yml/badge.svg)](https://github.com/yuens1002/artisan-roast/actions/workflows/qa-nightly.yml)

---

![Artisan Roast Demo](./docs/assets/hero.gif)

</div>

---

## Try the Demo

No signup required. Click **"Sign in as Admin"** or **"Sign in as Demo Customer"** on the [sign-in page](https://demo.artisanroast.app/auth/signin) to explore instantly.

| Account | What You'll See |
|---------|-----------------|
| **Admin** | Full dashboard: products, orders, analytics, Menu Builder, Pages CMS |
| **Demo Customer** | Order history, active subscription, AI-powered recommendations |

> This is a shared demo environment. Please be respectful with the data.

---

## Why Artisan Roast?

Most e-commerce platforms treat coffee like any other product. But your customers don't just want "a bag of coffee" - they want *their* coffee. Light and fruity? Dark and chocolatey? Something new to try?

**Artisan Roast understands coffee.**

- **Coffee in the schema** - Origin, altitude, tasting notes, roast level — first-class columns, not bolt-on custom fields
- **Subscriptions that just work** - Set it and forget it, with easy customer self-service
- **Menu Builder** - Organize your catalog the way *you* think about it (Origins → Ethiopian → Yirgacheffe)
- **Self-host for free** - MIT licensed, your data stays yours

---

## See It In Action

| For Your Customers | For You |
|---|---|
| Browse by origin, roast, or tasting notes | Beautiful admin dashboard |
| Search by origin, roast level, or tasting note | Drag-and-drop menu organization |
| One-click subscriptions | Order management & analytics |
| Stripe checkout (cards, Apple Pay, Google Pay) | Pages CMS with AI content generation |

→ **[Try the live demo at demo.artisanroast.app](https://demo.artisanroast.app/)** — no signup required. Sign in as Admin or Demo Customer to explore every feature.

---

## Self-Hosting

Setting up Artisan Roast requires a free database (Neon) and a deployment host (Vercel). No code changes needed — about 30 minutes to a running store.

**→ [Full self-host guide](./INSTALLATION.md)**

---

## Features

### For Customers

- **Smart Search** - Faceted search by name, origin, roast level, and tasting notes
- **Product Reviews** - Star ratings, brew method badges, and roaster brew guides
- **Flexible Subscriptions** - Weekly, bi-weekly, or monthly delivery
- **Subscription Portal** - Pause, skip, or cancel anytime (Stripe Billing Portal)

### For Store Owners

- **Menu Builder** - Visual drag-and-drop catalog organization
  - Multi-select with Shift+click range selection
  - Context menus for bulk operations (clone, delete, move)
  - Keyboard shortcuts (Delete, C, V, H)
  - 5 table views: Menu, Labels, Categories, and detail views
  - Mobile-friendly with 44px touch targets (WCAG 2.5.5)
- **Pages CMS** - AI-powered content management
  - 10-question wizard generates About pages in your brand voice
  - Rich text editing with hero images
  - Draft/publish workflow
- **Admin Dashboard** - Sales, trending products, top searches, activity trends
- **Order Management** - Track orders from purchase to delivery

### For Platform Builders

- **Provider-agnostic SDK** - Plans, trials, and à la carte add-ons follow a typed contract. Any developer can implement a managed hosting platform for Artisan Roast stores — the store is a pure consumer of the SDK, not locked to any provider.
- **Build-time isolation** - Hosted-mode UI is gated on a single env var and dead-code-eliminated from OSS builds. Self-hosted stores ship none of the hosting chrome.

### Technical

- **Next.js 16** with App Router and React 19
- **Type-safe** end-to-end (TypeScript strict + Prisma)
- **Stripe** payments and subscriptions
- **OAuth** login (Google, GitHub)
- **AI** powered by any OpenAI-compatible provider
- **1,400+ tests** with Jest and Testing Library

---

## The Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | NextAuth.js v5 |
| Payments | Stripe Checkout + Billing Portal |
| Email | Resend |
| AI | Any OpenAI-compatible provider |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | Zustand (cart) + SWR (data) |
| Testing | Jest + Testing Library |
| Deployment | Vercel |

---

## Build Quality

Every merge to `main` is verified by two automated pipelines:

| Check | What it guarantees |
|-------|--------------------|
| **Build** (every PR + merge) | TypeScript compiles, ESLint passes, 1,400+ unit tests pass, production build succeeds |
| **Nightly QA** (nightly cron) | A real fresh install — empty database, deployed to Vercel — passes all 16 acceptance criteria end-to-end |

On merge to `main`, the QA database is reset and the QA deployment is refreshed. The following morning, a Claude Agent SDK + Playwright script walks through the full setup flow, known-value round-trips, and initial app state checks — using the accessibility tree instead of CSS selectors. Any regression opens a GitHub issue automatically.

→ [How it works](./docs/features/app-qa/README.md) · [Acceptance criteria](./VERIFICATION.md)

---

## Roadmap

- [x] Core e-commerce (cart, checkout, orders)
- [x] Stripe subscriptions
- [x] Menu Builder (drag-and-drop catalog)
- [x] Pages CMS with AI generation
- [x] Product reviews and brew guides
- [x] Keyword search with faceted filtering
- [x] Plans page with hosting extension
- [ ] Inventory management
- [ ] Multi-store support

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Quick wins we'd love help with:**

- Documentation improvements
- Accessibility audits
- Translation/i18n
- Bug reports and fixes

---

## License

MIT License - Use it however you want. See [LICENSE](./LICENSE).

---

<div align="center">

**Built by a coffee nerd who codes.**

[Demo](https://demo.artisanroast.app/) · [GitHub](https://github.com/yuens1002/artisan-roast) · [Setup Guide](./INSTALLATION.md)

</div>
