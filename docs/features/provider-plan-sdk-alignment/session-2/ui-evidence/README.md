# Session 2 UI evidence

Durable PNG captures of every plan state rendered against the feat/pending-state
worktree dev server, produced by `scripts/screenshot-plan-scenarios.ts`. One
viewport screenshot per key in `ALL_KEYS`.

## How to regenerate

```bash
# from the worktree (or main checkout on the feat branch)
ADMIN_EMAIL=$QA_ADMIN_EMAIL \
ADMIN_PASSWORD=$QA_ADMIN_PASSWORD \
BASE_URL=http://localhost:<port> \
OUT_DIR=docs/features/provider-plan-sdk-alignment/session-2/ui-evidence \
npx tsx scripts/screenshot-plan-scenarios.ts
```

(`npm run dev` must be running on `<port>` first.)

## What each PNG shows

| File | PlanState | Notes |
|------|-----------|-------|
| `dev-free.png` | NONE × 2 | Community (Current Plan badge) + Priority Support (subscribe-able with sale price) |
| `dev-pro.png` | ACTIVE | Subscribed Priority Support with pool bars (tickets + sessions) |
| `dev-pro-inactive.png` | INACTIVE | Lapsed Priority Support with renew CTA |
| `dev-hosted-active-no-card.png` | TRIAL | House Blend trial, billing not added yet |
| `dev-hosted-active-card.png` | TRIAL | House Blend trial with billing added |
| `dev-hosted-expired.png` | EXPIRED | House Blend trial expired, statusInfo banner |
| `dev-hosted-converted.png` | ACTIVE | House Blend post-conversion |
| `dev-hosted-cancelled-card.png` | CANCELLED | House Blend cancelled, deprovision countdown |
| `dev-hosted-inactive.png` | INACTIVE | House Blend lapsed |
| `dev-hosted-pending.png` | **PENDING** | The polished PendingCard — name + description + statusInfo with spinner + Check Status action |
| `dev-hosted-cancelled.png` | (empty) | Resolver returns no cards (deprovision finalised) |
| `dev-hosted-provisioning.png` | (empty) | Platform fixture not yet seeded — see PR-SEED-PENDING |
| `dev-hosted-deprovisioned.png` | (empty) | Fully removed |

## Modal sub-state screenshots — deferred

The `PaymentConfirmModal` 3-state machine (`preparing` / `polling` / `error`)
isn't captured here because no dev scenario currently has a `paymentConfirm`
actionModal entry — the platform's dev seed will ship those in
`PR-SEED-PENDING`. Visual verification of the three modal sub-states is
covered at the DOM level by `payment-confirm-modal.test.tsx` (10 tests) via
the unique `data-testid="payment-confirm-modal-{state}"` markers per state.

Modal screenshots will land in the follow-up that captures the captured-payload
JSON files (`AC-CAP-PENDING`), once the platform dev seed ships.
