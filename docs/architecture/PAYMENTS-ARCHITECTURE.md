# Payments Architecture

> **Last Updated:** 2026-02-02
> **Status:** Production
> **Version:** 0.81.0+

## Overview

The payments system uses a **processor-agnostic architecture** that normalizes payment processor events (Stripe, PayPal, Square, etc.) into common interfaces. This allows ~80% of business logic to be reused across different payment processors.

## Design Principles

1. **Processor Agnostic** - Business logic operates on normalized types, not processor-specific data
2. **Adapter Pattern** - Each processor has an adapter that converts to/from normalized types
3. **Event Bus** - Webhook events are dispatched through a central registry
4. **Service Separation** - Orders, email, and subscription logic are isolated from payment processing

## Directory Structure

```text

lib/
├── payments/
│   ├── types.ts                    # Normalized interfaces (processor-agnostic)
│   ├── index.ts                    # Re-exports
│   └── stripe/                     # Stripe-specific implementation
│       ├── adapter.ts              # Stripe → Normalized type converters
│       ├── parse.ts                # Metadata parsing utilities
│       ├── stripe-helpers.ts       # Stripe API helpers
│       ├── verify.ts               # Webhook signature verification
│       ├── types.ts                # Stripe-specific type extensions
│       └── index.ts                # Re-exports
│
├── orders/
│   ├── types.ts                    # Order creation interfaces
│   ├── create-order.ts             # Order creation logic
│   ├── address-utils.ts            # Address normalization & storage
│   ├── inventory.ts                # Stock management
│   └── index.ts                    # Re-exports
│
├── email/
│   ├── types.ts                    # Email interfaces
│   ├── email-data-builder.ts       # Build email template data
│   ├── send-order-confirmation.ts  # Customer order emails
│   ├── send-merchant-notification.ts # Merchant notification emails
│   └── index.ts                    # Re-exports
│
└── services/
    ├── stripe.ts                   # Stripe client singleton
    ├── resend.ts                   # Resend email client
    └── subscription.ts             # Subscription database operations

app/api/webhooks/stripe/
├── route.ts                        # Slim entry point (~45 lines)
└── handlers/
    ├── types.ts                    # Handler interfaces
    ├── index.ts                    # Event bus dispatcher
    ├── checkout-session-completed.ts
    ├── invoice-payment-succeeded.ts
    ├── customer-subscription-updated.ts
    ├── customer-subscription-deleted.ts
    ├── customer-updated.ts
    ├── payment-intent-succeeded.ts
    └── payment-intent-failed.ts

```

## Core Normalized Types

All payment processors normalize to these common interfaces defined in `lib/payments/types.ts`:

### PaymentProcessor

```typescript
type PaymentProcessor = "stripe" | "paypal" | "square";
```

### NormalizedPaymentInfo

```typescript
interface NormalizedPaymentInfo {
  processor: PaymentProcessor;
  transactionId: string | null;    // Payment intent ID, PayPal order ID, etc.
  chargeId: string | null;
  invoiceId: string | null;
  cardLast4: string | null;
  paymentMethod: "card" | "paypal" | "bank" | "applepay" | "googlepay" | "other";
}
```

### NormalizedCheckoutEvent

```typescript
interface NormalizedCheckoutEvent {
  processor: PaymentProcessor;
  sessionId: string;
  subscriptionId: string | null;
  customer: NormalizedCustomerInfo;
  items: NormalizedCartItem[];
  deliveryMethod: "DELIVERY" | "PICKUP";
  shippingAddress: NormalizedShippingAddress | null;
  shippingName: string | null;
  paymentInfo: NormalizedPaymentInfo;
  totalInCents: number;
}
```

### NormalizedSubscriptionData

```typescript
interface NormalizedSubscriptionData {
  processor: PaymentProcessor;
  processorSubscriptionId: string;
  processorCustomerId: string;
  status: NormalizedSubscriptionStatus;  // "ACTIVE" | "PAUSED" | "CANCELED" | "PAST_DUE"
  items: NormalizedSubscriptionItem[];
  totalPriceInCents: number;
  deliverySchedule: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  pausedUntil: Date | null;
  shippingAddress: NormalizedShippingAddress | null;
  shippingName: string | null;
  customerPhone: string | null;
}
```

## Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEBHOOK REQUEST                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  app/api/webhooks/stripe/route.ts                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  1. Verify signature (lib/payments/stripe/verify.ts)                  │  │
│  │  2. Dispatch to handler (handlers/index.ts)                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  handlers/{event-type}.ts                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  1. Receive Stripe event object                                       │  │
│  │  2. Call adapter to normalize (lib/payments/stripe/adapter.ts)        │  │
│  │  3. Pass normalized data to business logic services                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │ lib/orders/  │  │ lib/email/   │  │ lib/services/│
            │              │  │              │  │ subscription │
            │ - create     │  │ - confirm    │  │              │
            │ - inventory  │  │ - notify     │  │ - ensure     │
            │ - address    │  │              │  │ - update     │
            └──────────────┘  └──────────────┘  └──────────────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      ▼
                              ┌──────────────┐
                              │   Prisma DB  │
                              └──────────────┘
```

## Event Bus Pattern

The webhook handler uses an event bus pattern defined in `handlers/index.ts`:

```typescript
const eventHandlers: Record<SupportedEventType, WebhookHandler> = {
  "checkout.session.completed": handleCheckoutSessionCompleted,
  "invoice.payment_succeeded": handleInvoicePaymentSucceeded,
  "customer.subscription.updated": handleCustomerSubscriptionUpdated,
  "customer.subscription.deleted": handleCustomerSubscriptionDeleted,
  "customer.updated": handleCustomerUpdated,
  "payment_intent.succeeded": handlePaymentIntentSucceeded,
  "payment_intent.payment_failed": handlePaymentIntentFailed,
};

export async function dispatchEvent(
  type: string,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  if (!isSupportedEvent(type)) {
    return { success: true, message: "Event type not handled" };
  }
  return eventHandlers[type](context);
}
```

## Stripe Adapter Functions

Key functions in `lib/payments/stripe/adapter.ts`:

| Function | Purpose |
|----------|---------|
| `normalizeCheckoutSession()` | Converts Stripe checkout session → `NormalizedCheckoutEvent` |
| `normalizeSubscription()` | Converts Stripe subscription → `NormalizedSubscriptionData` |
| `normalizeInvoicePayment()` | Converts Stripe invoice → `NormalizedInvoicePaymentEvent` |
| `normalizeCustomerUpdate()` | Converts Stripe customer → `NormalizedCustomerUpdateEvent` |
| `mapStripeSubscriptionStatus()` | Maps Stripe status → `NormalizedSubscriptionStatus` |
| `storeShippingInStripeMetadata()` | Stores shipping in Stripe subscription metadata |
| `updateStripeSubscriptionShipping()` | Updates shipping in Stripe metadata |
| `getStripeCustomerEmail()` | Retrieves customer email from Stripe |

## Adding a New Payment Processor

To add support for a new processor (e.g., PayPal):

### 1. Create Processor Directory

```text
lib/payments/paypal/
├── adapter.ts      # PayPal → Normalized converters
├── verify.ts       # Webhook signature verification
├── parse.ts        # PayPal-specific parsing
└── index.ts
```

### 2. Implement Adapter Functions

```typescript
// lib/payments/paypal/adapter.ts
export async function normalizePayPalCheckout(
  order: PayPalOrder
): Promise<NormalizedCheckoutEvent> {
  return {
    processor: "paypal",
    sessionId: order.id,
    customer: {
      processorCustomerId: order.payer.payer_id,
      email: order.payer.email_address,
      // ...
    },
    // Map all PayPal fields to normalized format
  };
}
```

### 3. Create Webhook Route

```text
app/api/webhooks/paypal/
├── route.ts
└── handlers/
    ├── index.ts
    └── order-completed.ts
```

### 4. Handlers Use Same Business Logic

```typescript
// app/api/webhooks/paypal/handlers/order-completed.ts
export async function handleOrderCompleted(context: PayPalWebhookContext) {
  const normalizedCheckout = await normalizePayPalCheckout(context.order);

  // Same business logic as Stripe!
  const result = await createOrdersFromCheckout({
    sessionId: normalizedCheckout.sessionId,
    customerId: normalizedCheckout.customer.processorCustomerId,
    paymentInfo: normalizedCheckout.paymentInfo,
    // ...
  });
}
```

## Webhook Events Handled

| Event | Handler | Purpose |
|-------|---------|---------|
| `checkout.session.completed` | `handleCheckoutSessionCompleted` | Create orders, send confirmations |
| `invoice.payment_succeeded` | `handleInvoicePaymentSucceeded` | Process subscription renewals |
| `customer.subscription.updated` | `handleCustomerSubscriptionUpdated` | Sync subscription changes |
| `customer.subscription.deleted` | `handleCustomerSubscriptionDeleted` | Handle cancellations |
| `customer.updated` | `handleCustomerUpdated` | Sync address/phone changes |
| `payment_intent.succeeded` | `handlePaymentIntentSucceeded` | Update order payment status |
| `payment_intent.payment_failed` | `handlePaymentIntentFailed` | Handle payment failures |

## Testing

### Local Development

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Enable debug logging (optional)
LOG_LEVEL=debug npm run dev
```

### Trigger Test Events

```bash
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.updated
```

### Unit Tests

Tests should be placed in `__tests__/` folders adjacent to modules:

- `lib/payments/stripe/__tests__/adapter.test.ts`
- `lib/orders/__tests__/create-order.test.ts`
- `lib/services/__tests__/subscription.test.ts`
- `app/api/webhooks/stripe/handlers/__tests__/`

## Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `lib/payments/types.ts` | ~147 | Core normalized interfaces |
| `lib/payments/stripe/adapter.ts` | ~400 | Stripe → Normalized converters |
| `lib/orders/create-order.ts` | ~300 | Order creation business logic |
| `lib/services/subscription.ts` | ~200 | Subscription database operations |
| `app/api/webhooks/stripe/route.ts` | ~45 | Slim webhook entry point |
| `handlers/index.ts` | ~48 | Event bus dispatcher |

## Migration Notes

The original webhook handler (`route.ts`) was ~1,972 lines. After refactoring:

- `route.ts`: 45 lines (97% reduction)
- Total across all modules: ~1,400 lines
- Each handler: 25-150 lines (focused, testable)

## Credential Storage (v0.103.x+)

Stripe credentials can be stored in two ways:

### Environment Variables (existing, always takes precedence)

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

These are resolved first in `getStripe()` and `getStripeWebhookSecret()`. When set, the DB credentials are ignored.

### Admin UI (DB-backed, encrypted)

Credentials entered via `/admin/settings/commerce` are stored in the `PaymentProcessorConfig` table. Both the secret key and webhook secret are encrypted at rest using AES-256-GCM. The encryption key must be set as an env var:

```bash
# Generate with: openssl rand -hex 32
PAYMENT_CREDENTIALS_ENCRYPTION_KEY=<64 hex chars>
```

**Resolution order** (both `getStripe()` and `getStripeWebhookSecret()`):

1. `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` env var — if set, use immediately (no DB read)
2. `PaymentProcessorConfig` DB row for `processor = "stripe"` — decrypted with `PAYMENT_CREDENTIALS_ENCRYPTION_KEY`
3. `null` — Stripe is not configured

**Encryption envelope format:**

```text
v1:{base64(iv)}:{base64(authTag)}:{base64(ciphertext)}
```

The `v1` prefix allows algorithm rotation. Decryption rejects unknown versions.

**After saving new credentials,** call `resetStripeClient()` (already done by `PUT /api/admin/settings/stripe`) to clear the singleton so the next request re-reads from the new source.

**Key files:**

- `lib/payments/credentials/encryption.ts` — AES-256-GCM encrypt/decrypt
- `lib/payments/credentials/index.ts` — DB access layer (`loadStripeCredentials`, `saveStripeCredentials`, `clearStripeCredentials`)
- `lib/services/stripe.ts` — `getStripe()`, `getStripeWebhookSecret()`, `resetStripeClient()`
- `app/api/admin/settings/stripe/route.ts` — Admin credential management API (GET/POST/PUT/DELETE)
- `app/admin/settings/commerce/_components/StripeCredentialsForm.tsx` — Admin UI form

## Future Considerations

1. **PayPal Integration** - Follow the "Adding a New Processor" guide above
2. **Square Integration** - Same pattern applies
3. **Installment Payments** - Stripe Klarna/Afterpay can be added to adapter
4. **Multi-Currency** - Normalized types already support `totalInCents`, extend with currency field if needed
5. **Encryption key rotation** - Currently manual: if `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` changes, existing DB rows fail to decrypt and admin re-enters keys via the same form. Auto-rotation tooling is deferred.
