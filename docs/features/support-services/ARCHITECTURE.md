# Support & Services — Architecture

**Last Updated:** 2026-03-16
**Status:** Phase 1-4 complete, Phase 5+ planned
**Branch:** `feat/support-plans-restructure` (base: `main`)

---

## Overview

Support & Services is a multi-page admin subsystem that connects self-hosted store instances to the Artisan Roast platform for subscription plans, metered support (tickets + 1:1 sessions), a la carte purchases, and legal document management.

The store renders everything dynamically from the platform's validate response — no hardcoded labels, prices, or URLs. This enables the platform team to update offerings without requiring a store-side release.

---

## System Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│  Store Admin UI                                                  │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌─────────┐ │
│  │Submit Ticket │  │   Plans     │  │Plan Detail│  │License  │ │
│  │  /support    │  │  /plans      │  │/plans/[s] │  │& Terms  │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  └────┬────┘ │
│         │                │                 │              │      │
│         └────────────────┴─────────────────┴──────────────┘      │
│                              │                                   │
│              ┌───────────────┴───────────────┐                   │
│              │        Server Actions         │                   │
│              │  submitTypedTicket()           │                   │
│              │  submitCommunityIssue()        │                   │
│              │  bookSupportSession()          │                   │
│              │  activateLicense()             │                   │
│              │  acceptTerms()                 │                   │
│              │  startCheckout()               │                   │
│              └───────────────┬───────────────┘                   │
│                              │                                   │
│              ┌───────────────┴───────────────┐                   │
│              │         Lib Modules           │                   │
│              │  lib/license.ts  (validate)   │                   │
│              │  lib/support.ts  (tickets)    │                   │
│              │  lib/plans.ts    (catalog)    │                   │
│              │  lib/legal.ts    (docs)       │                   │
│              └───────────────┬───────────────┘                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  Artisan Roast Platform  (manage.artisanroast.app)              │
│                                                                  │
│  POST /api/license/validate  — License + credits + legal state  │
│  GET  /api/plans             — Plan catalog (public)            │
│  POST /api/support/tickets   — Submit ticket, deduct credit     │
│  POST /api/support/sessions  — Book session, deduct credit      │
│  GET  /api/legal/{slug}      — Legal doc content (public)       │
│  POST /api/legal/accept      — Track acceptance (auth)          │
│  POST /api/checkout          — Stripe checkout session          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Pages

### Navigation

```text
Support & Services (LifeBuoy)
├── Submit Ticket      /admin/support
├── Plans              /admin/support/plans
│   └── [slug]         /admin/support/plans/[slug]   (grandchild, hidden from nav)
├── Add-Ons            /admin/support/add-ons
└── License & Terms    /admin/support/terms
```

Legacy route: `/admin/support/manage` → redirects to `/admin/support/terms?tab=license`

### Page Responsibilities

| Page | Server Data | Client State | Purpose |
|------|-------------|-------------|---------|
| Submit Ticket | `license`, `tickets` | Filter, pagination, form state | Ticket form + ticket list |
| Plans | `license`, `plans[]` | Checkout, refresh | Plan cards (active/inactive/none) + a la carte |
| Plan Detail | `license`, `plan` | — | Full plan specs (read-only, no CTAs), versioned by plan state |
| Add-Ons | `license` | — | A la carte package grid |
| License & Terms | `license`, `plans[]`, `legalDoc` | Tab, key input, telemetry | Key management, privacy, legal docs |

---

## Core Design Patterns

### 1. Config-Driven UI State

Each page computes a config object from `LicenseInfo` that drives all conditional rendering. No raw tier checks in JSX.

```typescript
// Submit Ticket page
function computeTicketPageConfig(license: LicenseInfo, hasKey: boolean): TicketPageConfig {
  // Returns: showCredits, ticketCredits, showTypeSelector, defaultType,
  //          priorityDisabled, ticketPacks, showUpsell, hasKey
}

// Plans page
function computePlanCardConfig(plan: Plan, license: LicenseInfo): PlanCardConfig {
  // Returns: status (active/inactive/none), badge, primaryCta,
  //          showCredits, credits, actions, snapshotAt, inactiveInfo
}
```

### 2. Platform-Driven Labels

All user-facing text for plans, actions, credit pools, and packages comes from the platform API response. The store never hardcodes labels, prices, or URLs.

| Data | Source | Store Renders |
|------|--------|---------------|
| Plan names/prices | `GET /api/plans` | `plan.name`, `plan.price` |
| CTA buttons | `license.availableActions[]` | `action.label`, `action.icon` |
| Credit labels | `license.support.pools[]` | `pool.label`, `pool.icon` |
| Package names | `license.alaCarte[]` | `package.label`, `package.price` |

### 3. Dual Credit Pools

Two independent credit sources, managed platform-side:

| Pool | Source | Expiry | Consumed |
|------|--------|--------|----------|
| Plan credits | Monthly plan quota | Reset each billing cycle | First |
| Purchased credits | A la carte purchases | Never | After plan credits exhausted |

The platform computes `remaining = limit + purchased - used` and returns it. The store displays the breakdown when both pools have credits.

### 4. Graceful Degradation

Every platform call has a fallback:

| Call | Fallback | UI Result |
|------|----------|-----------|
| `validateLicense()` | `FREE_DEFAULT` (all zeros/null) | FREE tier experience |
| `fetchPlans()` | `[]` | "Plans could not be loaded" empty state |
| `fetchLegalDoc()` | `null` | Direct links to platform pages |
| `listTickets()` | `[]` | Empty ticket list |

### 5. Plan Detail Versioning

Plan Detail is a **read-only specs page** with no CTAs. The plan data shown depends on the user's relationship to the plan:

| State | Data Source | What's Shown |
|-------|-------------|--------------|
| **Active plan** | `license.plan` snapshot | Plan version at time of purchase — updates on subscription renewal |
| **Available plan** | `GET /api/plans` catalog | Current version of the plan from the platform |
| **Lapsed plan** | `GET /api/plans` catalog | Current version of the plan (user can compare before renewing) |

All CTAs (Manage Billing, Book Session, Subscribe, Renew) live on the **Plans** page, not the detail page.

### 6. Server-Side Legal Enforcement

Legal acceptance is enforced in two layers — no client-side gate:

| Layer | Trigger | Response |
|-------|---------|----------|
| **Stripe checkout** | First purchase | Stripe's built-in legal consent |
| **Platform 403** | Paid endpoint + outdated terms | `{ error: "terms_acceptance_required" }` |

The store handles 403 by showing an amber banner directing the user to the Terms tab. The `SupportError.code` field carries the machine-readable error code through server actions to the client.

---

## Data Flow

### LicenseInfo (Phase 3 — full shape)

```typescript
interface LicenseInfo {
  valid: boolean;
  tier: Tier;                    // "FREE" | "TRIAL" | "PRIORITY_SUPPORT" | "HOSTED"
  features: string[];
  plan: PlanContext | null;       // { slug, name, snapshotAt }
  lapsed: LapsedContext | null;   // { previousTier, renewUrl, deactivatedAt, ... }
  support: SupportQuotas;         // { pools: UsagePool[] }
  alaCarte: AlaCartePackage[];    // [{ id, label, price, checkoutUrl, pools: AlaCartePool[] }]
  legal: LegalState | null;       // { pendingAcceptance, acceptedVersions }
  availableActions: AvailableAction[]; // [{ slug, label, url, variant, icon }]
  // ...plus usage, gaConfig, warnings, trialEndsAt, compatibility
}
```

### Plan Catalog (GET /api/plans)

```typescript
interface Plan {
  slug: string;           // "free", "priority-support", "enterprise-support"
  name: string;
  description: string;
  price: number;          // cents (0 = free, 4900 = $49)
  currency: string;
  interval: "month" | "year";
  features: string[];
  details: PlanDetails;   // sla, benefits, quotas, scope, excludes, terms
  highlight: boolean;
  salePrice?: number;     // cents — promotional price (platform auto-nulls when expired)
  saleEndsAt?: string;    // ISO 8601 — sale expiration (platform auto-nulls when expired)
  saleLabel?: string;     // e.g. "Launch Special" — badge text
}
```

> Sale pricing fields (`salePrice`, `saleLabel`, `saleEndsAt`) are covered in the platform contract at `phase3-payload-labels-contract.md` section 6. Platform auto-expires: once past `saleEndsAt`, fields return `null`.

---

## File Map

### Pages & Components

```text
app/admin/support/
├── page.tsx                        Server — fetches tickets, passes to client
├── actions.ts                      Server actions (11 functions, all Zod-validated)
├── SupportPageClient.tsx           Client — ticket form + radio cards + computeTicketPageConfig()
├── SupportTicketsSection.tsx       Client — filter tabs, pagination, opens TicketDetailSheet
├── UsageBar.tsx                    Client — reusable credit progress bar
├── _hooks/
│   └── usePaidAction.ts           Hook — wraps paid server actions, catches 403
├── _components/
│   ├── TermsNotice.tsx            Amber notice directing to Terms tab
│   └── TicketDetailSheet.tsx      Sheet — message thread + reply form (slide-in from ticket list)
├── manage/
│   └── page.tsx                    Server — redirect to /terms?tab=license
├── plans/
│   ├── page.tsx                    Server — fetches plans
│   ├── actions.ts                  Server action — startCheckout()
│   ├── PlanPageClient.tsx          Client — plan cards + computePlanCardConfig()
│   └── [slug]/
│       ├── page.tsx                Server — fetches plan + license
│       └── PlanDetailClient.tsx    Client — full plan specs (read-only, no CTAs)
├── add-ons/
│   ├── page.tsx                    Server — reads license.alaCarte
│   └── AddOnsPageClient.tsx        Client — package grid
└── terms/
    ├── page.tsx                    Server — fetches legal docs
    └── TermsPageClient.tsx         Client — 3-tab UI (License, Privacy, Terms + acceptance)
```

### Lib Modules

| File | Purpose | Auth | Cache |
|------|---------|------|-------|
| `lib/license.ts` | Validate license, feature gating | License key | 24h in-memory |
| `lib/license-types.ts` | TypeScript types (LicenseInfo, CreditPool, etc.) | — | — |
| `lib/support.ts` | Platform support API client | License key | None |
| `lib/support-types.ts` | TypeScript types (SupportTicket, etc.) | — | — |
| `lib/plans.ts` | Fetch plan catalog | None (public) | 24h in-memory |
| `lib/plan-types.ts` | TypeScript types (Plan, PlanDetails) | — | — |
| `lib/legal.ts` | Fetch/accept legal docs | Public / License key | 24h in-memory |
| `lib/legal-utils.ts` | Client-safe helpers (getLegalUrl) | — | — |

### Config

| File | Support-Related Entries |
|------|----------------------|
| `lib/config/admin-nav.ts` | "Support & Services" group with 4 children |
| `lib/navigation/route-registry.ts` | Route entries for all support pages |

---

## Error Handling

### SupportError

```typescript
class SupportError extends Error {
  constructor(message: string, public status: number, public code?: string) {}
}
```

Platform HTTP status → SupportError → server action result → client UI:

| Status | Code | Client Behavior |
|--------|------|-----------------|
| 401 | — | "Invalid or missing license key" |
| 402 | `credits_exhausted` | Show a la carte CTAs from error response |
| 403 | `terms_acceptance_required` | Amber banner → link to Terms tab |
| 403 | — | "Priority support is not included in your plan" |
| 429 | — | "Too many requests" |

---

## Plan Card States

| State | Trigger | Badge | CTA | Border |
|-------|---------|-------|-----|--------|
| Active (free) | `plan.slug === "free"` | Active (secondary) | — | `border-primary` |
| Active (paid) | `license.plan.slug === plan.slug` | Active (secondary) | Manage Billing, Schedule Call | `border-primary` |
| Inactive | `license.lapsed.planSlug === plan.slug` | Inactive (destructive) | Renew (`lapsed.renewUrl`) | default |
| None | No match | — | Subscribe | default |

---

## Platform Contracts

All contracts live in `docs/internal/`:

| Document | Covers | Status |
|----------|--------|--------|
| `phase3-contract-update.md` | Store-side: validate response, credit consumption, legal docs, FREE a la carte flow | Finalized |
| `phase3-contract-addendum.md` | Both teams: plan versioning, lapsed state, metered support, credit pools, a la carte | Finalized |
| `phase3-payload-labels-contract.md` | Both teams: `availableActions[].icon`, `support.pools[]` array, FREE plan in catalog, sale pricing fields | Finalized |

### Contract Gaps

| Gap | Affected | Status |
|-----|----------|--------|
| ~~Sale pricing fields~~ | ~~Plan catalog~~ | **Resolved** — covered in `phase3-payload-labels-contract.md` section 6 |
| Ticket reply/messaging API (`GET /api/support/tickets/:id/messages`, `POST .../messages`) | Ticket detail | **Not started** — no contract exists yet |

---

## What's Built vs What's Planned

### Done (on branch)

| Area | What | Commits |
|------|------|---------|
| Types | `LicenseInfo` Phase 3 fields, `UsagePool`, `SupportQuotas.pools[]`, `TicketMessage` | Multiple |
| Nav | "Support & Services" with 4 children, Manage redirect | Done |
| Submit Ticket | Config-driven form, radio card type selector, credit display, helper text, 403 handling, filters, pagination | Done |
| Plans | Plan cards (active/inactive/none), a la carte section, icon map, sale pricing | Done |
| Plan Detail | Full specs (read-only, no CTAs), SLA grid, plan versioning by state, breadcrumbs | Done |
| Add-Ons | Package grid from `license.alaCarte[]` | Done |
| License & Terms | 3-tab UI (key, privacy, terms), telemetry toggle, legal doc rendering, terms acceptance | Done |
| Ticket Detail | Sheet slide-in with message thread, reply form, status display | Done |
| Reusable 403 | `usePaidAction` hook + `TermsNotice` component for all paid CTAs | Done |
| Desktop Layout | `max-w-5xl` containment on all 5 support page clients | Done |
| Mock API | Mock data for tickets, sessions, legal docs in lib modules (no page-level mocks) | Done |
| Lib | `support.ts` (SupportError.code, 402/403 parsing, mock paths), `legal.ts` (mock docs), `plans.ts` | Done |
| Tests | Integration tests for community issue, checkout | Done |

### Planned (not yet started)

| Phase | Scope | Mock Data? | Dependencies |
|-------|-------|-----------|-------------|
| Real API Wiring | Swap mocks for live platform endpoints | No | Platform deploy |

---

## Mock Data Strategy

All platform-dependent features have mock data activated by `MOCK_LICENSE_TIER` env var:

| Module | Mock Trigger | Mock Data |
|--------|-------------|-----------|
| `lib/license.ts` | `MOCK_LICENSE_TIER` env var | Full `LicenseInfo` with tier-appropriate credits, pools, actions, legal state |
| `lib/plans.ts` | `MOCK_LICENSE_TIER` env var | 3 plans (Community, Priority $49, Enterprise $299) with full details |
| `lib/support.ts` | `MOCK_LICENSE_TIER` env var | 5 mock tickets, message threads (3 tickets), submit/reply/book responses |
| `lib/legal.ts` | `MOCK_LICENSE_TIER` env var | Support terms + privacy policy (HTML content) |

Supported mock tiers: `FREE`, `TRIAL`, `PRIORITY_SUPPORT`, `priority-support`, `enterprise-support`

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `PLATFORM_URL` | No | Platform API base (default: `https://manage.artisanroast.app`) |
| `LICENSE_KEY` | No | License key (fallback; primary source is DB `siteSettings`) |
| `MOCK_LICENSE_TIER` | Dev only | Activates mock license + plans for development |
| `NEXT_PUBLIC_APP_URL` | No | Callback URL for Stripe checkout (default: Vercel URL or localhost) |

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| `pools[]` array instead of fixed `tickets`/`oneOnOne` keys | Platform can add new credit types (AI tokens) without store release |
| Platform-driven labels + icons | No hardcoded strings — platform controls all display text |
| Server-side legal enforcement (no client checkbox) | Stripe handles first-purchase consent; platform 403 handles updates |
| `salePrice`/`saleEndsAt` on Plan type | Dynamic promotional pricing from platform catalog |
| Config-driven components | `computeTicketPageConfig()` and `computePlanCardConfig()` — single source of truth for all conditional rendering |
| Dual credit pools with plan-first deduction | Maximizes value of purchased credits (they never expire) |
| FREE plan in catalog | Gives free users a comparison point on the Plans page |
| Manage page redirect | Consolidated into License & Terms tabs — no separate page needed |
| `usePaidAction` hook not wrapper component | More flexible — pages have different button variants and layouts |
| Sheet not route for ticket detail | Keeps user in context on the Submit Ticket page; full-screen on mobile via default Sheet behavior |
| Plan Detail is read-only (no CTAs) | Plan detail shows timestamped plan terms; all actions live on the Plans page |
| Mock data in lib modules not pages | Consolidates all mock data, keeps page components clean |
| Radio cards not dropdown for ticket type | Better visibility of options and credit info at a glance |
