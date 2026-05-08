# Hosting Extension — Trial Cancellation · Implementation

**Status:** Shipped — `submitCancellation` no-card variant live
**Architecture reference:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## What changed

`submitCancellation()` in `app/admin/support/plans/actions.ts` previously had a `console.log` stub for the `no-card` variant — the platform endpoint hadn't shipped yet. That stub is now replaced with a live fetch.

**Before:**

```ts
if (parsed.data.variant === "no-card") {
  console.info("trial:cancel:no-card", { reason, otherText });
  return { success: true };
}
```

**After:**

```ts
if (parsed.data.variant === "no-card") {
  const trialId = process.env.HOSTED_TRIAL_ID;
  const res = await fetch(
    `${PLATFORM_API_URL}/api/trial/hosted/${trialId}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: parsed.data.reason, otherText: parsed.data.otherText }),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { success: false, error: (data as { error?: string }).error ?? "cancel_failed" };
  }
  return { success: true };
}
```

The `card-added` variant is unchanged — it still opens a Stripe Portal session via `/api/billing/portal`.

---

## Endpoint contract

`POST ${PLATFORM_API_URL}/api/trial/hosted/${HOSTED_TRIAL_ID}/cancel`

**Request body:**

```json
{ "reason": "too-soon" | "missing-features" | "too-expensive" | "switching" | "other", "otherText"?: string }
```

**Responses:**

| Status | Body | Meaning |
|--------|------|---------|
| `200` | `{ "cancelled": true }` | Trial cancelled; deprovisioning queued (≤1hr cron) |
| `400` | `{ "error": "invalid_body" }` | Bad or missing reason |
| `404` | `{ "error": "not_found" }` | `HOSTED_TRIAL_ID` not found |
| `409` | `{ "error": "already_cancelled" }` | Trial already cancelled |
| `409` | `{ "error": "not_cancellable" }` | Trial is CONVERTED or DEPROVISIONED |
| `409` | `{ "error": "use_stripe_portal" }` | Card on file — must cancel via Stripe Portal |

---

## Env vars

Both vars are injected at provisioning time and already present in `PLATFORM_API_URL` and `HOSTED_TRIAL_ID`. No new env vars.

---

## Customer experience

1. Customer opens the cancel modal, selects a reason, submits
2. Platform sets `status = CANCELLED`, queues deprovisioning (≤1hr cron cycle)
3. Customer receives a cancellation confirmation email from the platform
4. Modal closes with the existing success toast
