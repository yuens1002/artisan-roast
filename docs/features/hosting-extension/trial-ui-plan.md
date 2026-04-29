# Hosting Extension — Trial UI · Plan

**Branch:** `feat/hosted-store-s2`
**Base:** `main`
**Worktree:** `c:\Users\yuens\dev\hosted-store-s2`
**ACs:** [`docs/plans/hosting-extension-trial-ui-ACs.md`](../../plans/hosting-extension-trial-ui-ACs.md)
**Architecture reference:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## Context

This body of work adds the trial-side admin UI for hosted-mode instances. When `HOSTED_TRIAL_ID` is set at build time, the store enters hosted mode and the plans page renders two new plan cards (House Blend Trial + House Blend) instead of the self-hosted Community + Priority Support cards. The Cancel modal captures a reason on every cancel flow. The License & Privacy → Data Privacy tab gains a Download Your Data card available to all builds.

Pre-launch: no live hosted customers yet. UI affordances pointing at upstream endpoints that haven't shipped (e.g., the no-card Cancel endpoint) are wired with a client-side mock — the wiring is identical, only the fetch destination changes once the endpoint is available. Per [`ARCHITECTURE.md`](./ARCHITECTURE.md), the store never crashes on upstream failure.

**Out of scope (future bodies of work):**

- Hosting Settings page (`/admin/settings/hosting`) — see [`domain-management-plan.md`](./domain-management-plan.md)
- Custom domain configuration
- Migration from self-hosted to hosted

---

## Visibility model

Plan cards render declaratively from `lib/plans.ts`, filtered by `IS_HOSTED` (and the trial-status response for the Trial card). **Self-hosted and hosted instances see disjoint plan-card sets** — see the lifecycle states table in [`ARCHITECTURE.md`](./ARCHITECTURE.md#lifecycle-states).

Each `MOCK_PLAN` entry gets a `visibility: "self-hosted" | "hosted"` discriminator. `PlanPageClient` filters by `IS_HOSTED` before rendering.

Trial card visibility rule:

```ts
const showTrialCard = trialStatus?.status === "ACTIVE" || trialStatus?.status === "EXPIRED";
```

Hides on `CONVERTED`, on direct-subscribe (no trial record — `getTrialStatus()` returns null), and on self-hosted.

---

## UI state inventory (verification target)

Every state below gets screenshot-verified at desktop + mobile breakpoints. Screenshots saved to `.screenshots/hosting-extension-trial-ui/`.

| # | Lifecycle state | Plan card | Card state | Distinguishing UI |
|---|---|---|---|---|
| 1a | Self-hosted (Community current) | Community | `active` | "Current Plan" badge, free pricing, View Terms link |
| 1b | Self-hosted (Priority Support active) | Community | `inactive` | Lapsed-style appearance, no current actions |
| 2a | Self-hosted (Priority Support not subscribed) | Priority Support | `none` | Pricing + benefits + [Subscribe] |
| 2b | Self-hosted (Priority Support active) | Priority Support | `active` | "Active" badge, renewal date, support pools UsageBar, [Manage] |
| 3 | Trial · active · no-card | House Blend Trial | `active` | Clock icon, "Active Trial" badge, trial-days bar (out of 14), tagline, 4 benefit bullets, "Cancel" text-link + [Add Billing] |
| 4 | Trial · active · no-card | House Blend | `none` | "House Blend" name, tagline + benefits, [Details] + [Subscribe Now] |
| 5 | Trial · active · card-added | House Blend Trial | `active` (variant) | "Extended Trial" badge, trial-days bar (out of 30), [Add Billing] **disabled + tooltip** |
| 6 | Trial · active · card-added | House Blend | `none` | Same as state 4 — Subscribe Now always visible |
| 7 | Trial · expired (grace) | House Blend Trial | `active` (variant) | "Expired" badge, trial-days bar at 0, deprovisioning-date copy, [Add Billing] enabled, "Cancel" |
| 8 | Trial · expired (grace) | House Blend | `none` | Same as state 4 |
| 9 | Hosted Paid · converted from trial | House Blend Trial | hidden | Card NOT in DOM (visibility rule) |
| 10 | Hosted Paid · converted from trial | House Blend | `active` | CheckCircle2 icon, "Active" badge, renewal date, Priority Tickets UsageBar, [Manage billing] |
| 10b | Hosted Paid · direct-subscribe | House Blend | `active` | Same as state 10 — visually identical regardless of conversion path |
| 10c | Hosted Paid · direct-subscribe | House Blend Trial | hidden | Card NOT in DOM (no trial record) |
| 11 | Cancel modal — Trial · no-card | (modal) | open | "Cancel your trial?" + reason dropdown + Other-textarea + [Keep trial] / [Cancel trial] |
| 12 | Cancel modal — Trial · card-added | (modal) | open | "Cancel your subscription?" + reason capture + [Keep subscription] / [Continue to Stripe →] |
| 13 | Cancel modal — Hosted Paid (Manage Billing flow) | (modal) | open | Same reason-capture UX; Stripe Portal opens after reason saved |
| 14 | Download Your Data card | (Data Privacy tab) | always | Visible regardless of hosted mode; "Download ZIP" button |
| 15 | Status fetch fails | House Blend Trial | error fallback | Skeleton/fallback message; plans page does NOT crash |

---

## House Blend Trial card — UI spec

- **Card primitive:** existing PlanCard `active` state (border-primary)
- **Icon:** lucide `Clock` — differentiates the time-bounded trial card from the converted Hosted card (which keeps `CheckCircle2`)
- **Badge** by sub-state: `Active Trial` (no-card) · `Extended Trial` (card-added) · `Expired`
- **Tagline:** *"Risk-free for 14 days — full hosting, no card, no commitment."*
- **Trial-days status bar:** [`UsageBar`](../../../app/admin/support/UsageBar.tsx) with a formatter override for direct-format display (`"4 / 14 remaining"` or `"4 days remaining"`). Underlying `<Progress>` primitive unchanged so visuals match existing PlanCard active-state aesthetics. Limit (14 default → 30 when card added) is sourced from the `daysLimit` field of `TrialStatus`.
- **Benefits list** (4 bullets):
  - "No billing needed — or add billing to extend your trial up to 30 days"
  - "You own your trial data — download a ZIP anytime during the trial"
  - "100% feature parity from day 1 — subscribe anytime to assign a custom domain"
  - "Cancel anytime during your trial — no contract, no commitment"
- **Actions** (Trial card has no detail page; the House Blend card next to it owns the [Details] affordance):
  - **Left bottom (text link):** `Cancel` — opens Cancel modal. Text-link / ghost-button style, not primary
  - **Right bottom (primary button):** `Add Billing` — opens `PLATFORM_EXTEND_URL` in new tab. **Disabled when `cardAdded === true`** with tooltip "Billing already on file"

---

## House Blend card — UI spec (during trial — `none` state)

- **Card primitive:** existing PlanCard `none` state (default border, price shown)
- **Plan name:** `"House Blend"` (display label; matches marketing brand)
- **Tagline + benefits list:** synced from the marketing pricing-section. **Benefits list explicitly includes `"5 priority support tickets, 48-hr SLA"`** — this is a real benefit customers should see in admin context, even if the marketing copy elsewhere doesn't lead with it.
- **Actions:**
  - **Left bottom (button):** `Details` — opens `/admin/support/plans/house-blend` (existing PlanDetailClient pattern)
  - **Right bottom (primary button):** `Subscribe Now` — opens `PLATFORM_SUBSCRIBE_URL` in new tab. Always present regardless of `cardAdded` state. Action-oriented CTA matches the convention used across all admin plan cards (Priority Support, etc.)

---

## House Blend card — UI spec (after conversion / direct-subscribe — `active` state)

- **Card primitive:** existing PlanCard `active` state (border-primary, `CheckCircle2` icon)
- **Badge:** `Active`
- **Plan name + price + renewal date:** rendered from the `TrialStatus.plan` shape (CONVERTED variant)
- **Priority-tickets status bar:** `UsageBar` populated from `TrialStatus.support.pools` (treated as any other UsagePool the existing PlanCard renders today)
- **Actions:**
  - **Left bottom (button):** `Details` — same plan detail page as during trial
  - **Right bottom (primary button):** `Manage billing` — calls `POST /api/billing/portal` (Bearer-authed with `LICENSE_KEY`), opens returned `url` in new tab

---

## Cancel modal — UI spec

Reason capture is a real product feature. All cancel flows share the same UX shape; only the downstream effect varies.

- **Reason dropdown** with curated options. Final list locked during implementation, candidate set:
  - "Too expensive"
  - "Missing features"
  - "Switching to another platform"
  - "Don't need it anymore"
  - "Other"
- **"Other" reveals a textarea** for free-form input (max 500 chars)
- Reason submitted on confirm; modal closes after upstream write succeeds (or with toast if it fails)

**Variants:**

- **Trial · no-card:** UI mock for v1 — reason captured client-side; real upstream endpoint not yet shipped. Wiring identical to the other variants once endpoint lands.
- **Trial · card-added:** Reason captured, then "Continue to Stripe →" button calls `POST /api/billing/portal` and opens the returned URL in a new tab.
- **Hosted Paid (Manage Billing → cancel intent):** Same reason-capture UX before redirect to Stripe Portal. Triggered when the admin chooses to cancel from the Hosted card's flow.

---

## Download Your Data — UI spec

Visible to all users (not gated on `IS_HOSTED`) on `/admin/support/terms` Data Privacy tab. Streams a ZIP from `GET /api/admin/export`:

- Admin auth (`auth()` server-side check; non-admin → 403)
- `archiver` library streams ZIP to client
- Contents: `data/*.json` (one per Prisma model) + `media/*` (Vercel Blob) + `manifest.json`
- Headers: `Content-Type: application/zip`, `Content-Disposition: attachment; filename="export-{date}.zip"`

---

## Files changed

### New (5)

- `lib/hosted.ts` — exports `IS_HOSTED`, `getTrialStatus()`, `submitCancellation()`, `TrialStatus` type
- `lib/__tests__/hosted.test.ts`
- `app/admin/support/plans/_components/CancelTrialDialog.tsx`
- `app/admin/support/terms/_components/DownloadDataCard.tsx`
- `app/api/admin/export/route.ts`

### Modified (5)

- `lib/plans.ts` — add `house-blend-trial` and `house-blend` entries to `MOCK_PLANS`; add `visibility` discriminator to all entries
- `app/admin/support/plans/PlanPageClient.tsx` — filter plans list by `IS_HOSTED`; map `TrialStatus` → PlanCard config for the two House Blend entries; wire trial-days status bar; render Cancel + Add Billing on Trial card; render Subscribe Now / Manage Billing on House Blend card
- `app/admin/support/terms/page.tsx` — add Download Your Data card
- `.env.example` — add `HOSTED_TRIAL_ID`, `PLATFORM_API_URL`, `PLATFORM_EXTEND_URL`, `PLATFORM_SUBSCRIBE_URL`, `LICENSE_KEY`
- `package.json` — add `archiver`

---

## Commit Schedule

| # | Message | Risk |
|---|---|---|
| 1 | `feat(hosted): IS_HOSTED detection + trial status fetcher` | Low |
| 2 | `feat(hosted): House Blend Trial + House Blend plan entries in plans catalog` | Low |
| 3 | `feat(hosted): plans page filters by IS_HOSTED + maps trial status to PlanCard config` | Medium |
| 4 | `feat(hosted): cancel trial dialog with reason capture` | Low |
| 5 | `feat(hosted): Download Your Data ZIP export` | Medium |
| 6 | `chore: env.example + archiver dependency` | Low |

---

## Verification

Per [`docs/plans/hosting-extension-trial-ui-ACs.md`](../../plans/hosting-extension-trial-ui-ACs.md). Pre-flight:

1. Worktree dev server on port 4000 (`npm run dev -- -p 4000` from `c:\Users\yuens\dev\hosted-store-s2`)
2. Branch `feat/hosted-store-s2` registered in `.claude/verification-status.json` as `"planned"`
3. `.screenshots/` directory at repo root (gitignored)
4. **`.env.local` in the worktree contains the five hosted env vars** — `HOSTED_TRIAL_ID`, `PLATFORM_API_URL`, `PLATFORM_EXTEND_URL`, `PLATFORM_SUBSCRIBE_URL`, `LICENSE_KEY`. Verify present before running dev server.
5. Mock service on port 3001 returning fixture trial-status responses (or stub via `PLATFORM_API_URL`)

---

## Out of scope (deferred)

- `/admin/settings/hosting` page — see [`domain-management-plan.md`](./domain-management-plan.md)
- Custom domain configuration — same future body of work
- Real upstream cancel endpoint — UI mock ships in this body of work; wiring swaps in when endpoint lands
- Migration from self-hosted to hosted — separate feature
- Email notification specifics — upstream service's concern
- Server-side persistence of UI dismissals — pre-launch, no live customers
- Banner in admin shell — dropped (cards on plans page provide visibility)
- Post-cancellation reinstatement window — parked for research
