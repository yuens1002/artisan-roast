# Hosting Extension — Architecture

**Last Updated:** 2026-04-29
**Status:** Trial UI body of work in progress (`feat/hosted-store-s2`); Domain Management body of work scoped, not started

---

## Overview

Hosting Extension is the set of admin UI surfaces and lib modules the store renders when configured against a managed hosting service. The store treats hosting as an **opt-in extension**: when the right env vars are present at build time, the store enters hosted mode and renders trial / paid plan cards, a cancel-with-reason flow, a custom domain management page, and a data-export affordance.

The store ships as a pure consumer of an upstream hosting API. This document specifies the integration contract — the env vars the store reads, the endpoints it calls, and the response shapes it expects. Anyone standing up a managed hosting service for this open-source store can implement against the contract documented here.

Mirrors the runtime-mode pattern of [`lib/demo.ts`](../../../lib/demo.ts) (`IS_DEMO`) — a build-time constant flips behavior, with all gated branches eliminated as dead code in the live build when the mode is off.

---

## System Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│  Store Admin UI                                                  │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Plans page      │  │ Cancel modal │  │ License & Terms  │   │
│  │ /admin/support/ │  │ (reason cap- │  │ Data Privacy tab │   │
│  │ plans           │  │  ture dialog)│  │ Download Your    │   │
│  │  · Trial card   │  │              │  │ Data card        │   │
│  │  · Hosted card  │  │              │  │                  │   │
│  └────────┬────────┘  └──────┬───────┘  └─────────┬────────┘   │
│           │                  │                     │            │
│  ┌────────┴──────────────────┴─────────────────────┴────────┐  │
│  │ Hosting Settings page (future body of work)              │  │
│  │ /admin/settings/hosting                                  │  │
│  │  · Plan & Billing  · Custom Domain  · Danger Zone       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│            ┌──────────┴──────────────┐                          │
│            │   Server Actions        │                          │
│            │   getTrialStatus()      │                          │
│            │   submitCancellation()  │                          │
│            │   exportStoreData()     │                          │
│            │   (domain CRUD — later) │                          │
│            └──────────┬──────────────┘                          │
│                       │                                         │
│            ┌──────────┴──────────────┐                          │
│            │     Lib Modules         │                          │
│            │   lib/hosted.ts         │                          │
│            │   lib/plans.ts          │                          │
│            └──────────┬──────────────┘                          │
└───────────────────────┼─────────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Configured Hosting Service  (PLATFORM_API_URL)                 │
│                                                                  │
│  GET  /api/trial/hosted/[id]/status     — lifecycle state       │
│  POST /api/trial/hosted/[id]/billing-portal — Stripe Portal URL │
│  POST /api/trial/hosted/[id]/cancel     — cancel + reason       │
│  GET  /api/trial/hosted/[id]/domain     — current domain        │
│  POST /api/trial/hosted/[id]/domain     — add domain            │
│  PUT  /api/trial/hosted/[id]/domain     — change domain         │
│  DEL  /api/trial/hosted/[id]/domain     — remove domain         │
│  GET  /api/trial/hosted/[id]/domain/verify — DNS + SSL state    │
└─────────────────────────────────────────────────────────────────┘
```

External Stripe Payment Link URLs (`PLATFORM_EXTEND_URL`, `PLATFORM_SUBSCRIBE_URL`) are opened directly in new tabs from the relevant CTAs — the store does not proxy through the hosting service for these.

---

## Hosted-mode detection

```ts
// lib/hosted.ts
export const IS_HOSTED = Boolean(process.env.HOSTED_TRIAL_ID);
```

Build-time constant evaluated from `HOSTED_TRIAL_ID`. When the env var is unset (the OSS / self-hosted default), all hosted-mode UI is dead-code-eliminated by the bundler — self-hosted users see no hosted-mode chrome at all.

---

## Lifecycle states

The store renders eight visibility states based on `IS_HOSTED` and the upstream `TrialStatus` response. **Self-hosted and hosted instances see disjoint plan-card sets — no card overlap.**

| Lifecycle state | Plans page | Hosting Settings | Download Your Data |
|---|---|---|---|
| Self-hosted (Community current) | Community *(active)* + Priority Support *(none)* | hidden | visible |
| Self-hosted (Priority Support active) | Community *(inactive)* + Priority Support *(active)* | hidden | visible |
| Trial · active · no-card | House Blend Trial *(active)* + House Blend *(none)* | hidden | visible |
| Trial · active · card-added | House Blend Trial *(extended)* + House Blend *(none)* | hidden | visible |
| Trial · expired (grace period) | House Blend Trial *(expired)* + House Blend *(none)* | hidden | visible |
| Trial · cancelled (access until deprovisionAt) | House Blend Trial *(cancelled)* + House Blend *(none)* | hidden | visible |
| Hosted · converted from trial | House Blend *(active)* — Trial card hidden | **visible** | visible |
| Hosted · direct-subscribe (no prior trial) | House Blend *(active)* — Trial card hidden | **visible** | visible |
| Deprovisioned | (terminal — store no longer accessible) | n/a | n/a |

**Trial card visibility rule:**

```ts
const showTrialCard =
  trialStatus?.status === "ACTIVE" ||
  trialStatus?.status === "EXPIRED" ||
  trialStatus?.status === "CANCELLED";
```

The Trial card hides on `CONVERTED`, on direct-subscribe (no trial record — `getTrialStatus()` returns null), and on self-hosted (`IS_HOSTED` false). Filtering of plan-catalog entries is declarative: each entry carries a `visibility: "self-hosted" | "hosted"` discriminator, and `PlanPageClient` filters by `IS_HOSTED` before rendering.

---

## Pages

### Navigation

```text
Support & Services (LifeBuoy)
├── Submit Ticket          /admin/support
├── Plans                  /admin/support/plans     (renders Trial + Hosted cards in hosted mode)
│   └── [slug]             /admin/support/plans/[slug]
├── Add-Ons                /admin/support/add-ons
└── License & Terms        /admin/support/terms     (Data Privacy tab adds Download Your Data card)

Settings (post-conversion only)
└── Hosting                /admin/settings/hosting  (future body of work)
```

### Page responsibilities

| Page | Hosted-mode behavior | Data sources |
|---|---|---|
| Plans | Filters catalog by `visibility`; maps `TrialStatus` → PlanCard config for the two House Blend entries | `trialStatus` from `getTrialStatus()`; plan entries from `lib/plans.ts` |
| License & Terms (Data Privacy tab) | Adds Download Your Data card visible regardless of mode | none (UI-only addition) |
| Hosting Settings (future) | Visible only when `IS_HOSTED && trialStatus.status === "CONVERTED"` | `trialStatus` + domain endpoints |

---

## Core design patterns

### Visibility discriminator on plan entries

Each entry in `lib/plans.ts` `MOCK_PLANS` carries a `visibility: "self-hosted" | "hosted"` field. `PlanPageClient` filters the catalog by `IS_HOSTED` before rendering. No conditional JSX — declarative.

### Config-driven PlanCard rendering

PlanCard's three states (`active`, `inactive`, `none`) already drive Priority Support today. The two House Blend entries reuse them: trial card maps to `active` with a `Clock` icon variant; House Blend card swaps between `none` (during trial) and `active` (post-conversion, with `CheckCircle2` icon). No new card components.

### Trial-days status bar

Reuses [`UsageBar`](../../../app/admin/support/UsageBar.tsx) (already used in PlanCard's `active` branch for support pools) with a formatter override for direct-format display ("4 / 14 remaining"). The trial-days limit is variable based on billing status (14 default → 30 when card added) — driven by the `daysRemaining` and `daysLimit` fields in `TrialStatus`.

### Graceful degradation

Every upstream call has a fallback:

| Call | Fallback | UI Result |
|---|---|---|
| `getTrialStatus()` | returns `null` on 5xx / network error | Trial card is omitted entirely; House Blend card still renders |
| `submitCancellation()` | client error toast | Modal stays open; reason not persisted |
| Domain endpoints (future) | toast + inline error | Domain section shows error state; rest of page intact |

The plans page does NOT crash on a failed `getTrialStatus()` fetch — hosted-mode UI degrades to a partial view.

### Server-side dead-code elimination

Because `IS_HOSTED` is a build-time constant fed by `process.env.HOSTED_TRIAL_ID`, all hosted-mode branches are eliminated from the live bundle in OSS / self-hosted builds. The trial cards, cancel modal, and domain UI never ship to self-hosted instances at all.

---

## Integration contract

> This section documents what an upstream hosting service must expose for the store's hosted-mode UI to function. All fetches are server-side from React Server Components or Server Actions; `revalidate: 60` is the default cache TTL.

### Environment variables

| Variable | Required for | Purpose |
|---|---|---|
| `HOSTED_TRIAL_ID` | Activating hosted mode | Trial / instance ID; truthy presence is the `IS_HOSTED` flag |
| `PLATFORM_API_URL` | All upstream calls | Base URL of the configured hosting service (e.g. `https://manage.example.com`) |
| `PLATFORM_EXTEND_URL` | Trial card "Add Billing" CTA | Stripe Payment Link URL for adding billing during trial |
| `PLATFORM_SUBSCRIBE_URL` | House Blend card "Subscribe Now" CTA | Stripe Payment Link URL for direct subscription |
| `LICENSE_KEY` | Hosted card "Manage Billing" CTA | Bearer token for the existing `POST /api/billing/portal` license-authed wrapper |

When `HOSTED_TRIAL_ID` is unset, none of the other vars are read — hosted-mode UI is dead-code-eliminated.

### `GET /api/trial/hosted/[id]/status`

Called by `getTrialStatus()` server-side with `next: { revalidate: 60 }`. Drives the entire plans-page hosted-mode rendering.

```ts
type TrialStatus =
  | {
      status: "ACTIVE";
      cardAdded: boolean;          // false=14d limit, true=30d extended
      daysRemaining: number;       // 0..daysLimit
      daysLimit: number;           // 14 | 30
      deprovisionAt?: string;      // ISO 8601 — for "expires on" copy
    }
  | {
      status: "EXPIRED";
      cardAdded: false;
      daysRemaining: 0;
      daysLimit: number;
      deprovisionAt: string;       // ISO 8601 — when store gets torn down
    }
  | {
      status: "CONVERTED";
      plan: { name: string; renewsAt: string; price: number; currency: string };
      support: { pools: Array<{ slug: string; label: string; limit: number; used: number }> };
    }
  | {
      status: "CANCELLED";
      cardAdded: true;
      daysRemaining: number;       // days until deprovision
      daysLimit: number;
      deprovisionAt: string;       // ISO 8601 — when store gets torn down
    };
```

Errors (5xx, timeout, parse failure): return `null`. Fetch never throws.

### `POST /api/billing/portal`

Existing license-authed endpoint. Called from:

- House Blend (post-conversion) "Manage Billing" CTA
- Cancel modal "Continue to Stripe" button (card-added trial variant)

Request: `Authorization: Bearer ${LICENSE_KEY}`. Response: `{ url: string }`. Store opens `url` in new tab.

### `POST /api/trial/hosted/[id]/cancel`

Called by the Cancel modal's no-card variant. Body:

```ts
type CancelRequest = {
  reason: string;        // dropdown selection slug
  otherText?: string;    // present iff reason === "other"; max 500 chars
};
```

Response: `{ success: true }` on accept. Failure surfaces a toast and keeps the modal open.

> Until this endpoint is available upstream, the UI mocks the call client-side — reason captured, no remote write. The wiring is identical; only the fetch destination changes when the endpoint ships.

### Domain endpoints (future — Domain Management body of work)

Called from the Hosting Settings page (`/admin/settings/hosting`), gated on `status === "CONVERTED"`. Specified in [`domain-management-plan.md`](./domain-management-plan.md).

---

## Data export

Independent of hosted mode — the Download Your Data card on `/admin/support/terms` Data Privacy tab is visible to all builds, including self-hosted. Streams a ZIP from `GET /api/admin/export` (admin-auth, `archiver` library).

ZIP contents:

- `data/*.json` — one file per Prisma model
- `media/*` — assets pulled from Vercel Blob
- `manifest.json` — export metadata (timestamp, store ID, schema version)

Headers: `Content-Type: application/zip`, `Content-Disposition: attachment; filename="export-{date}.zip"`.

Auth: `auth()` server-side check; non-admin requests return 403.

---

## File map

### Hosted-mode entry points

```text
lib/
├── hosted.ts                          IS_HOSTED constant + getTrialStatus() + submitCancellation()
├── plans.ts                           MOCK_PLANS catalog with visibility discriminator
└── __tests__/hosted.test.ts           IS_HOSTED + getTrialStatus + submitCancellation tests

app/admin/support/
├── plans/
│   ├── PlanPageClient.tsx             filters by IS_HOSTED; maps TrialStatus → PlanCard config
│   └── _components/
│       └── ConfirmActionDialog.tsx     reason dropdown + Other-textarea + submit
└── terms/
    ├── page.tsx                       Data Privacy tab adds Download Your Data card
    └── _components/
        └── DownloadDataCard.tsx       button → GET /api/admin/export

app/api/admin/export/route.ts          admin-authed ZIP stream

app/admin/settings/hosting/            (future — Domain Management body of work)
```

### Reused primitives

| Primitive | Location | How used |
|---|---|---|
| `PlanCard` (inline component) | `app/admin/support/plans/PlanPageClient.tsx` | Renders both House Blend cards via existing `active` / `inactive` / `none` states |
| `UsageBar` | `app/admin/support/UsageBar.tsx` | Trial-days status bar + post-conversion priority-tickets bar |
| Plan detail page pattern | `app/admin/support/plans/[slug]/PlanDetailClient.tsx` | House Blend detail page populated from plan-catalog entry |
| `IS_DEMO` pattern | `lib/demo.ts` | Mirror for `IS_HOSTED` build-time constant + dead-code elimination |

---

## Error handling

| Failure | Surface | Behavior |
|---|---|---|
| `getTrialStatus()` returns `null` | Plans page | Trial card is omitted; House Blend card unaffected |
| `submitCancellation()` upstream error | Cancel modal | Toast; modal stays open; user can retry |
| `POST /api/billing/portal` failure | Manage Billing / Continue to Stripe | Toast: "Could not open billing portal" |
| Domain endpoints failure (future) | Custom Domain section | Inline error state with retry; rest of page intact |
| `GET /api/admin/export` non-admin | Download Your Data | 403 from server; UI never lets a non-admin trigger it |

The store never crashes on upstream failure. Self-hosted users encountering an unexpected `HOSTED_TRIAL_ID` env var still get a working store — `getTrialStatus()` just returns null.

---

## Plan card states (hosted mode)

| Card | State | Trigger | Badge | Icon | CTAs |
|---|---|---|---|---|---|
| House Blend Trial | active | `status === "ACTIVE" && !cardAdded` | "Active Trial" | Clock | Cancel · Add Billing |
| House Blend Trial | active (extended) | `status === "ACTIVE" && cardAdded` | "Extended Trial" | Clock | Cancel · Add Billing *(disabled + tooltip)* |
| House Blend Trial | active (expired) | `status === "EXPIRED"` | "Expired" | Clock | Cancel · Add Billing |
| House Blend Trial | active (cancelled) | `status === "CANCELLED"` | "Cancelled" | Clock | Manage Billing |
| House Blend | none | `status === "ACTIVE" \|\| "EXPIRED" \|\| "CANCELLED"` | — | — | Details · Subscribe Now |
| House Blend | active | `status === "CONVERTED"` | "Active" | CheckCircle2 | Details · Manage Billing |

Cancel is rendered as a text link (not a primary button) — minor affordance. Add Billing and Subscribe Now open Stripe Payment Link URLs in new tabs.

---

## Key decisions

| Decision | Rationale |
|---|---|
| Build-time `IS_HOSTED` constant via `HOSTED_TRIAL_ID` env presence | Mirrors `IS_DEMO`; enables dead-code elimination so OSS / self-hosted builds carry no hosted-mode bytes |
| Visibility discriminator on plan entries | Declarative filter in `PlanPageClient`; no conditional JSX; same shape as `support-services` |
| Two distinct cards (Trial + House Blend) during trial | Lets the customer cancel from one card OR opt in from the other at any point — both options always present |
| Trial card hides on CONVERTED + direct-subscribe | Single visibility rule (`status === ACTIVE \|\| EXPIRED \|\| CANCELLED`) covers both; visually identical post-conversion regardless of trial history |
| Reuse PlanCard / UsageBar primitives | Zero new card components; trial-days bar is just another `UsagePool` shape with a formatter override |
| Cancel modal reason capture in all variants | Reason is real product feedback; same UX shape across no-card / card-added / hosted-paid cancel flows |
| No-card cancel UI mocks the call until upstream endpoint ships | Pre-launch; broken-in-isolation paths are acceptable while the integration matures |
| Subscribe Now always visible (no dynamic CTA swap based on `cardAdded`) | Removes the "did the customer already pay?" branching from the UI; double-subscribe protection is the upstream service's responsibility (idempotent on `convert-now`) |
| Download Your Data is mode-agnostic | Self-hosted users want data export too; not a hosted-mode feature |
| Hosting Settings page gated on `CONVERTED` | Trial users have nothing to manage on a custom domain yet; keeps nav clean |
| `getTrialStatus()` returns `null` on error (never throws) | Plans page never crashes on upstream failure; UI degrades gracefully |
