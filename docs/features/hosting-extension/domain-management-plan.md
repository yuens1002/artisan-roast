# Hosting Extension — Domain Management · Plan

**Branch:** TBD — proposed `feat/hosting-settings-page`
**Base:** `main` (after Trial UI ships and the upstream service exposes domain CRUD + the trial-id-authed billing-portal wrapper)
**Status:** Scoped, not started
**Architecture reference:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## Context

Trial UI closes the trial visibility loop — customers see their trial state, can extend / subscribe via Stripe Payment Links. But once they convert (`status: "CONVERTED"`), the store admin gives them no way to manage their hosting: no custom-domain configuration, no in-store billing access, no cancel flow.

This body of work adds `/admin/settings/hosting` — visible **only when the instance is paid hosted** (`IS_HOSTED && trialStatus.status === "CONVERTED"`). It is the customer's home for managing the infrastructure their store runs on.

---

## Visibility gate

The page and its nav entry render only when:

```ts
const showHostingSettings = IS_HOSTED && trialStatus?.status === "CONVERTED";
```

Trial users (`status: "ACTIVE" | "EXPIRED"`) do **not** see the page or its nav entry. Self-hosted users do not see it. Only converted (paid) customers see it.

---

## Architecture decisions

| Decision | Choice | Rationale |
|---|---|---|
| Page location | `/admin/settings/hosting` | Sibling to other settings pages (`/admin/settings/{search,storefront,...}`). "Settings" is the right home — `/admin/support/plans` already covers subscription state |
| Page sections | Three: Plan & Billing, Custom Domain, Danger Zone | Clear separation: *what plan you have* / *where your store lives* / *how to leave* |
| Nav registration | `lib/navigation/route-registry.ts` + `lib/config/admin-nav.ts` — entry conditional on `showHostingSettings` (server-rendered) | Self-hosted and trial users don't see a "Hosting" nav child at all; no broken links |
| Custom domain UI primitives | shadcn `Input` + `Button` for add form; status badge + Recheck button for pending state | Existing primitives; nothing new to build |
| Domain status polling | `useEffect` poll every 30s while status is `pending`; stop on `active` or `error` | Avoids manual refresh during DNS propagation |
| Cancel flow | "Cancel hosting" → opens Stripe Customer Portal in new tab | Stripe Portal already supports cancellation. Avoids building duplicate cancel logic. v1 = redirect; in-store cancel is a future polish item |
| Failure mode for domain ops | Toast + inline error; no full-page error states | Domain ops are quick; toast is appropriate noise level |
| Loading states | Skeleton only on initial page load; subsequent ops use button spinner | Matches existing settings page conventions |

---

## Page sections

### 1. Plan & Billing

```text
┌─────────────────────────────────────────────────────┐
│ Plan & Billing                                      │
│                                                     │
│ Plan: Hosted · Active                               │
│ Billing cycle: Monthly · Next charge {date}         │
│ Card on file: Visa ending 4242                      │
│                                                     │
│ [Manage billing] (→ Stripe Portal, new tab)         │
└─────────────────────────────────────────────────────┘
```

- `Plan` and `Active` status come from `getTrialStatus()` (CONVERTED variant — `plan.name`, `plan.renewsAt`)
- "Manage billing" button calls `POST /api/billing/portal` (Bearer-authed with `LICENSE_KEY`), opens returned URL in new tab — same call shape used by the post-conversion House Blend card

### 2. Custom Domain

Multi-state component. Initial state is "no domain set":

```text
[No domain set]
┌─────────────────────────────────────────────────────┐
│ Custom Domain                                       │
│                                                     │
│ Your store is currently live at                     │
│ https://acme.artisanroast.app                       │
│                                                     │
│ Add a custom domain you own (e.g. store.acme.com).  │
│                                                     │
│ Domain: [_________________________] [Add Domain]    │
└─────────────────────────────────────────────────────┘

[Pending DNS]
┌─────────────────────────────────────────────────────┐
│ Custom Domain                                       │
│                                                     │
│ store.acme.com                  ⚠ DNS pending       │
│                                                     │
│ Add this CNAME record at your DNS provider:         │
│   Name:   store.acme.com                            │
│   Value:  cname.vercel-dns.com    [Copy]            │
│   TTL:    Auto (or 3600)                            │
│                                                     │
│ Once your DNS provider has updated (usually a few   │
│ minutes, but can take up to 48 hours), this will    │
│ activate automatically.                             │
│                                                     │
│ [Recheck status]    [Remove domain]                 │
└─────────────────────────────────────────────────────┘

[Active]
┌─────────────────────────────────────────────────────┐
│ Custom Domain                                       │
│                                                     │
│ store.acme.com                  ✓ Active            │
│ SSL: Active · Last verified {time ago}              │
│                                                     │
│ [Change domain]    [Remove domain]                  │
└─────────────────────────────────────────────────────┘

[Error]
┌─────────────────────────────────────────────────────┐
│ Custom Domain                                       │
│                                                     │
│ store.acme.com                  ✗ Verification failed│
│                                                     │
│ {errorMessage from verify endpoint}                 │
│                                                     │
│ [Retry verification]    [Remove domain]             │
└─────────────────────────────────────────────────────┘
```

Polling cadence (Pending state only): every 30s; pause when tab is backgrounded; resume on focus.

### 3. Danger Zone

```text
┌─────────────────────────────────────────────────────┐
│ Danger Zone                                         │
│                                                     │
│ Cancel your hosting subscription                    │
│ Your store will remain accessible until the end of  │
│ your billing period. Download your data first if    │
│ you want a copy.                                    │
│                                                     │
│ [Cancel via Stripe Portal] (→ Stripe, new tab)      │
└─────────────────────────────────────────────────────┘
```

- "Cancel via Stripe Portal" calls the same `POST /api/billing/portal` endpoint as Plan & Billing
- Helper text reminds the customer about data export (the Download Your Data card on the License & Privacy page, shipped in the Trial UI body of work)

---

## Integration contract additions

> Beyond the contract documented in [`ARCHITECTURE.md`](./ARCHITECTURE.md), this body of work introduces the domain endpoints. Specified here for reference; the upstream service must expose them before this branch starts.

```text
GET    /api/trial/hosted/[id]/domain         — current domain
POST   /api/trial/hosted/[id]/domain         — add domain
PUT    /api/trial/hosted/[id]/domain         — change domain
DELETE /api/trial/hosted/[id]/domain         — remove domain
GET    /api/trial/hosted/[id]/domain/verify  — DNS + SSL state
```

Expected response shapes (TS):

```ts
type DomainStatus = {
  domain: string | null;          // null = no domain set
  state: "pending" | "active" | "error";
  cname?: { name: string; value: string; ttl: number };  // present on pending
  ssl?: { state: "active" | "pending" | "error"; lastVerified?: string };
  errorMessage?: string;          // present on error state
};
```

The Bearer auth is the trial-id-authed wrapper (not `LICENSE_KEY`) — auth detail is the upstream service's concern.

---

## Files changed

### New

- `app/admin/settings/hosting/page.tsx`
- `app/admin/settings/hosting/_components/PlanBillingSection.tsx`
- `app/admin/settings/hosting/_components/CustomDomainSection.tsx`
- `app/admin/settings/hosting/_components/DomainAddForm.tsx`
- `app/admin/settings/hosting/_components/DomainStatusCard.tsx`
- `app/admin/settings/hosting/_components/DangerZoneSection.tsx`
- `app/admin/settings/hosting/hooks/useDomainStatus.ts` — polling hook

### Modified

- `lib/hosted.ts` — extend with `getDomainStatus()`, `getBillingPortalUrl()`, domain CRUD client helpers
- `lib/navigation/route-registry.ts` — add `admin.settings.hosting` route
- `lib/config/admin-nav.ts` — add Hosting nav child (gated on `showHostingSettings`)

---

## Commit Schedule (preliminary)

| # | Message | Risk |
|---|---|---|
| 1 | `feat(hosted): extend lib/hosted.ts with domain + billing client helpers` | Low |
| 2 | `feat(hosted): hosting settings page scaffold + Plan & Billing section` | Low |
| 3 | `feat(hosted): custom domain section — view, add, remove flows` | Medium |
| 4 | `feat(hosted): custom domain section — pending state with polling` | Medium |
| 5 | `feat(hosted): hosting settings — Danger Zone (Stripe Portal link)` | Low |
| 6 | `feat(hosted): nav registration with conditional visibility` | Low |
| 7 | `chore: update verification status` | — |

---

## Open questions for review

1. **Stripe Portal return URL** — where does the customer land after closing the Portal? Back to `/admin/settings/hosting`? Configured upstream.
2. **Domain change while pending** — current proposal blocks it (force DELETE first). Alternative: allow PUT to cancel pending and start new. Operationally simpler if blocked; UX-friendlier if allowed. Confirm.
3. **In-store cancel UI** — recommended deferral; v1 = redirect to Stripe Portal. Confirm.
4. **Status polling cadence** — 30s while pending. Could be 15s for more responsive UX, 60s for less platform load.
5. **First-time hint** — when a customer first lands on Hosting Settings post-conversion, should there be a one-time helper banner ("You're now on a paid plan — configure your custom domain here")? Polish item, deferrable.

---

## ACs

Plan only at this stage — ACs are written when this body of work moves to active implementation. ACs file will land at `docs/plans/hosting-extension-domain-management-ACs.md` matching the prefix convention.

---

## Out of scope (deferred)

- In-store cancel hosting form (use Stripe Portal in v1)
- Multiple custom domains
- Domain analytics
- SSL certificate expiry alerts
- Migration from self-hosted to hosted (separate feature)
- Vanity subdomain on `*.artisanroast.app`
