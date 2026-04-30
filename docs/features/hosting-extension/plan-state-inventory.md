# Hosting Extension — Plan State Inventory

**Purpose:** Platform parity audit. Documents every rendered UI state for both hosted plan cards, the exact data fields each state consumes, CTA URL dependencies, and known gaps. Share with the platform team to verify that the hosting service payload covers all states.

**Branch:** `feat/hosted-store-s2`
**Date:** 2026-04-29

---

## Plan catalog shape

Both hosted plan cards are driven by a `Plan` entry in the plan catalog endpoint. `actionModal` is optional on any plan entry — if omitted, the action dialog will not be openable (the trigger CTA is hidden). **If present, all fields are required** (except `confirmIcon`, which is a display hint).

```ts
interface Plan {
  slug: string;
  name: string;
  description: string;        // card tagline
  price: number;              // cents
  currency: string;           // ISO 4217
  interval: "month" | "year";
  features: string[];
  highlight: boolean;
  visibility: "hosted";       // both hosted plans carry this discriminator
  details: {
    benefits?: string[];      // bullet list on the card
    sla?: { responseTime?: string; availability?: string };
    quotas?: Array<{ icon: string; slug: string; label: string; limit: number }>;
    scope?: string[];
    terms?: string[];
    excludes?: string[];
  };
  actionModal?: ConfirmActionConfig;  // optional; if present, all fields below are required
}

interface ConfirmActionConfig {
  heading: string;            // dialog title
  description: string;        // body copy
  reasons: Array<{ value: string; label: string }>;  // reason dropdown options
  keepLabel: string;          // dismiss button label
  confirmLabel: string;       // confirm / proceed button label
  confirmIcon?: string;       // optional: lucide icon name on confirm button, e.g. "external-link"
}
```

---

## Trial status shape

`GET /api/trial/hosted/[id]/status` response drives the Trial card. All four lifecycle variants must be implemented.

```ts
type TrialStatus =
  | { status: "ACTIVE";    cardAdded: boolean; daysRemaining: number; daysLimit: number; deprovisionAt?: string }
  | { status: "EXPIRED";   cardAdded: false;   daysRemaining: 0;      daysLimit: number; deprovisionAt: string }
  | { status: "CANCELLED"; cardAdded: true;    daysRemaining: number; daysLimit: number; deprovisionAt: string }
  | { status: "CONVERTED"; plan: { name: string; renewsAt: string; price: number; currency: string };
                            support: { pools: Array<{ slug: string; label: string; limit: number; used: number }> } };
```

---

## House Blend Trial card

Slug: `house-blend-trial` · Visibility: `hosted`

### State 1 — Active · no card (ACTIVE_NO_CARD)

**Trigger:** `status === "ACTIVE" && cardAdded === false`

| Element | Data source |
|---------|-------------|
| Card title | `plan.name` |
| Tagline | `plan.description` |
| Badge | hardcoded: `"Active Trial"` |
| Badge icon | hardcoded: `Clock` |
| Status bar label | hardcoded: `"Trial days"` |
| Status bar value | `daysRemaining / daysLimit` from `TrialStatus` |
| Benefits bullets | `plan.details.benefits[]` |
| Cancel text-link | visible; opens action modal |
| Action modal | `plan.actionModal` (full `ConfirmActionConfig` object) |
| Add Billing button | **URL from env: `PLATFORM_EXTEND_URL`** ⚠️ |

**Action modal for this state:**

```json
{
  "heading": "Cancel your trial?",
  "description": "Your trial will be cancelled and your store deprovisioned. Tell us why before you go — your feedback helps us improve.",
  "reasons": [ ... ],
  "keepLabel": "Keep trial",
  "confirmLabel": "Cancel trial"
}
```

No `confirmIcon` — destructive button, no external link.

---

### State 2 — Active · card added (ACTIVE_CARD_ADDED)

**Trigger:** `status === "ACTIVE" && cardAdded === true`

| Element | Data source |
|---------|-------------|
| Card title | `plan.name` |
| Tagline | `plan.description` |
| Badge | hardcoded: `"Extended Trial"` |
| Badge icon | hardcoded: `Clock` |
| Status bar value | `daysRemaining / daysLimit` (daysLimit is 30 in this state) |
| Benefits bullets | `plan.details.benefits[]` |
| Cancel text-link | **hidden** — cancellation goes through Manage Billing |
| Manage Billing button | **URL from env: `PLATFORM_EXTEND_URL`** (interim; should be billing portal URL) ⚠️ |

> **Gap:** Manage Billing button currently reuses `PLATFORM_EXTEND_URL`. The correct URL is a Stripe Billing Portal session URL — the platform team should supply this separately in the `TrialStatus` response or as a distinct env var/payload field.

---

### State 3 — Expired (EXPIRED)

**Trigger:** `status === "EXPIRED"`

| Element | Data source |
|---------|-------------|
| Card title | `plan.name` |
| Tagline | `plan.description` |
| Badge | hardcoded: `"Expired"` |
| Badge icon | hardcoded: `Clock` |
| Status bar value | `0 / daysLimit` |
| Deprovision notice | `deprovisionAt` (ISO 8601 → formatted date) |
| Benefits bullets | `plan.details.benefits[]` |
| CTAs | **none rendered** |

No CTAs in this state — the expired card is informational only.

---

### State 4 — Cancelled · in grace period (CANCELLED)

**Trigger:** `status === "CANCELLED"`

> **Not yet implemented in UI.** TypeScript type and mock fixture (`PENDING_CANCEL`) exist; no rendering path.
> **Platform status:** `CANCELLED` is not yet in the platform schema. The `customer.subscription.deleted` webhook handler that triggers it is scoped to the `feat/store-api` platform feature. Both ship together.

Proposed UI for platform team alignment:

| Element | Data source |
|---------|-------------|
| Badge | `"Cancellation Pending"` |
| Status bar | `daysRemaining / daysLimit` (countdown to deprovision) |
| Deprovision notice | `deprovisionAt` |
| Reactivate button | same billing portal URL as Manage Billing — redirects to Stripe to undo cancellation |

`cardAdded` is always `true` for `CANCELLED` (billing was on file when the cancellation was initiated).

---

### State 5 — Hidden (CONVERTED or direct-subscribe)

**Trigger:** `status === "CONVERTED"` or `getTrialStatus()` returns `null` → Trial card is not rendered in either case.

The House Blend card takes over as the active subscription card. There is intentionally no path back to the Trial card once a customer has subscribed or cancelled — the trial is a one-way gate.

---

## House Blend card

Slug: `house-blend` · Visibility: `hosted`

### State 1 — None (pre-conversion, during trial)

**Trigger:** `status === "ACTIVE" || "EXPIRED"` (House Blend card is in `none` state while Trial card is visible)

| Element | Data source |
|---------|-------------|
| Card title | `plan.name` |
| Tagline | `plan.description` |
| Price display | `plan.price` / `plan.interval` |
| Sale price | `plan.salePrice`, `plan.saleEndsAt`, `plan.saleLabel` (all optional) |
| Benefits bullets | `plan.details.benefits[]` |
| View Details link | navigates to `/admin/support/plans/house-blend` |
| Subscribe button | **URL from env: `PLATFORM_SUBSCRIBE_URL`** ⚠️ |

---

### State 2 — Active (CONVERTED / direct-subscribe)

**Trigger:** `license.plan.slug === "house-blend"` (platform supplies this in the license response)

| Element | Data source |
|---------|-------------|
| Card title | `plan.name` |
| Tagline | `plan.description` |
| Badge | `"Active"` |
| Badge icon | `CheckCircle2` |
| Renewal date | `license.plan.snapshotAt` → computed renewal date |
| Support pools | `license.support.pools[]` — UsageBar per pool |
| View Details link | navigates to `/admin/support/plans/house-blend` |
| Manage Billing button | URL from `license.availableActions` — platform embeds portal URL in license response |

The active state is fully driven by the license response (`LicenseInfo`), not the plan catalog entry. `availableActions` must include a `{ slug: "manage-billing", label: "Manage Billing", icon: "external-link", url: "<portal_url>" }` entry.

---

### State 3 — Inactive / lapsed

**Trigger:** `license.lapsed.planSlug === "house-blend"`

| Element | Data source |
|---------|-------------|
| Badge | `"Inactive"` |
| Deactivation date | `license.lapsed.deactivatedAt` |
| Previous features | `license.lapsed.previousFeatures[]` |
| Renew CTA | `license.lapsed.renewUrl` |

---

### Action modal (card-added / hosted-paid)

Used when cancellation is initiated from the House Blend active card or from the Trial card with `cardAdded=true`.

```json
{
  "heading": "Cancel your subscription?",
  "description": "We'll redirect you to Stripe to complete cancellation. Tell us why first — your feedback helps us improve.",
  "reasons": [
    { "value": "too-expensive",   "label": "Too expensive" },
    { "value": "missing-features","label": "Missing features" },
    { "value": "switching",       "label": "Switching to another platform" },
    { "value": "no-longer-needed","label": "Don't need it anymore" },
    { "value": "other",           "label": "Other" }
  ],
  "keepLabel": "Keep subscription",
  "confirmLabel": "Continue to Stripe",
  "confirmIcon": "external-link"
}
```

`confirmIcon: "external-link"` drives the ↗ icon on the confirm button — signals to the user they're leaving to Stripe. The store resolves this via `resolveIconComponent("external-link")` → Lucide `ExternalLink`.

---

## CTA URL gaps — env vars that should move to payload

Currently three CTA URLs arrive via env vars. The plan is to move these to the platform payload so the store has no direct Stripe URL knowledge.

| CTA | Current source | Target source | Affects |
|-----|----------------|---------------|---------|
| Add Billing | `PLATFORM_EXTEND_URL` (env) | `TrialStatus.extendUrl` or `plan.actions.extendUrl` | Trial card State 1 |
| Manage Billing (trial) | `PLATFORM_EXTEND_URL` (env, interim) | `TrialStatus.billingPortalUrl` or `plan.actions.billingPortalUrl` | Trial card State 2 |
| Subscribe | `PLATFORM_SUBSCRIBE_URL` (env) | `plan.actions.subscribeUrl` or `plan.ctaUrl` | House Blend State 1 |

**Platform team action:** Decide whether these URLs arrive in `TrialStatus`, in the plan catalog entry, or in a separate dedicated field. The store will consume whichever shape is agreed — the env vars are a temporary shim.

---

## State matrix

| `TrialStatus.status` | `cardAdded` | Trial card rendered? | Trial card state | House Blend state |
|----------------------|-------------|----------------------|------------------|-------------------|
| `ACTIVE`             | `false`     | ✓                    | Active (14d)     | None              |
| `ACTIVE`             | `true`      | ✓                    | Extended (30d)   | None              |
| `EXPIRED`            | `false`     | ✓                    | Expired          | None              |
| `CANCELLED`          | `true`      | ✓ *(not yet impl.)*  | Grace period     | None              |
| `CONVERTED`          | —           | ✗                    | —                | Active            |
| `null` (error/none)  | —           | ✗                    | —                | None or Active    |

---

## Open questions for platform team

1. ✅ **CANCELLED state — Reactivate CTA** — Reactivate only; uses the same billing portal URL as Manage Billing (redirects to Stripe to undo the cancellation). No separate endpoint needed.

2. ✅ **CTA URL delivery** — All three URLs move to the `TrialStatus` response (they are per-trial, not per-plan):
   - `extendUrl` → `TrialStatus` for `status=ACTIVE, cardAdded=false`. Absent when card is already added.
   - `subscribeUrl` → `TrialStatus` for `status=ACTIVE` and `status=EXPIRED`. Present during entire trial + grace period.
   - `billingPortalUrl` → **not pre-embedded in any payload**. Stripe Portal sessions have a TTL; the status response is polled every 60s. Instead, the store calls `POST /api/billing/portal` (Bearer license key) dynamically when the Manage Billing button is clicked. The endpoint returns a fresh `{ url }`. Env vars (`PLATFORM_EXTEND_URL`, `PLATFORM_SUBSCRIBE_URL`) remain as build-time fallbacks until the status endpoint ships the URL fields.

3. ✅ **Trial card on CONVERTED / direct-subscribe** — Hidden in both cases. Once a customer has subscribed or cancelled, there is no path back to the trial. Both states show only the active House Blend card.

4. ✅ **Manage Billing on active House Blend** — Confirmed delivery via `license.availableActions`. The `manage-billing` entry will have:
   - `url`: the platform billing portal endpoint path (`/api/billing/portal`). The store POSTs to this endpoint (Bearer license key) on click; the response contains the Stripe Portal session URL for redirect.
   - `icon`: `"external-link"` (signals external redirect — store resolves via `resolveIconComponent`)
   - A pre-generated Stripe Portal URL is **not** embedded in the license response (sessions have a TTL).

5. ✅ **`actionModal` on plan entries** — `actionModal` is optional on any plan. If absent, the action dialog trigger CTA is hidden (no fallback copy rendered). If present, all fields are required — `confirmIcon` is the only optional field (display hint only). Platform should populate `actionModal` on both `house-blend-trial` and `house-blend`.
