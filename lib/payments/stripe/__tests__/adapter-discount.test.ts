/** @jest-environment node */

import type Stripe from "stripe";

jest.mock("@/lib/services/stripe", () => ({
  getStripe: () => ({
    paymentIntents: {
      retrieve: jest.fn().mockResolvedValue({
        id: "pi_123",
        latest_charge: { id: "ch_123", payment_method_details: { card: { last4: "4242" } } },
      }),
    },
  }),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

/**
 * Builds a minimal Stripe Checkout Session fixture.
 * Only includes fields that normalizeCheckoutSession actually reads.
 */
function buildStripeSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  return {
    id: "cs_test_123",
    object: "checkout.session",
    amount_total: 3500,
    customer: "cus_123",
    customer_details: {
      email: "test@example.com",
      phone: "+1234567890",
      name: "Test User",
      address: null,
      tax_exempt: "none",
      tax_ids: [],
    },
    metadata: {
      cartItems: JSON.stringify([{ po: "po_1", qty: 1 }]),
      deliveryMethod: "PICKUP",
    },
    payment_intent: "pi_123",
    subscription: null,
    collected_information: null,
    total_details: null,
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

describe("normalizeCheckoutSession — discount extraction", () => {
  let normalizeCheckoutSession: typeof import("../adapter").normalizeCheckoutSession;

  beforeAll(async () => {
    const mod = await import("../adapter");
    normalizeCheckoutSession = mod.normalizeCheckoutSession;
  });

  it("extracts discountAmountInCents from total_details.amount_discount", async () => {
    const session = buildStripeSession({
      amount_total: 3000,
      total_details: {
        amount_discount: 500,
        amount_shipping: 0,
        amount_tax: 0,
      },
    });

    const result = await normalizeCheckoutSession(session);

    expect(result.discountAmountInCents).toBe(500);
    expect(result.totalInCents).toBe(3000);
  });

  it("returns discountAmountInCents: 0 when total_details is null", async () => {
    const session = buildStripeSession({
      total_details: null,
    });

    const result = await normalizeCheckoutSession(session);

    expect(result.discountAmountInCents).toBe(0);
  });

  it("returns discountAmountInCents: 0 when amount_discount is 0", async () => {
    const session = buildStripeSession({
      total_details: {
        amount_discount: 0,
        amount_shipping: 1000,
        amount_tax: 0,
      },
    });

    const result = await normalizeCheckoutSession(session);

    expect(result.discountAmountInCents).toBe(0);
  });
});
