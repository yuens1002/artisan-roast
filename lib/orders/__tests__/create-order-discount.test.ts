/** @jest-environment node */

import type { CreateOrdersFromCheckoutParams } from "../types";
import type { NormalizedPaymentInfo } from "@/lib/payments/types";

// Capture order.create calls to inspect what gets stored
const orderCreateMock = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    purchaseOption: {
      findMany: jest.fn(),
    },
    productVariant: {
      update: jest.fn().mockResolvedValue({}),
    },
    order: {
      create: orderCreateMock,
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: { purchaseOption: { findMany: jest.Mock } };
};

// Shared fixtures
const paymentInfo: NormalizedPaymentInfo = {
  processor: "stripe",
  transactionId: "pi_123",
  chargeId: "ch_123",
  invoiceId: null,
  cardLast4: "4242",
  paymentMethod: "card",
};

function buildOneTimePurchaseOption(id: string, priceInCents: number) {
  return {
    id,
    priceInCents,
    type: "ONE_TIME",
    billingInterval: null,
    billingIntervalCount: null,
    variant: {
      id: `var_${id}`,
      name: "12oz",
      stockQuantity: 10,
      product: { id: `prod_${id}`, name: "Coffee", slug: "coffee", isDisabled: false },
    },
  };
}

function buildSubscriptionPurchaseOption(id: string, priceInCents: number) {
  return {
    id,
    priceInCents,
    type: "SUBSCRIPTION",
    billingInterval: "month",
    billingIntervalCount: 1,
    variant: {
      id: `var_${id}`,
      name: "12oz",
      stockQuantity: 10,
      product: { id: `prod_${id}`, name: "Sub Coffee", slug: "sub-coffee", isDisabled: false },
    },
  };
}

function buildBaseParams(
  overrides: Partial<CreateOrdersFromCheckoutParams> = {}
): CreateOrdersFromCheckoutParams {
  return {
    sessionId: "cs_test_123",
    customerId: "cus_123",
    customerEmail: "test@example.com",
    customerPhone: "+1234567890",
    userId: "user_1",
    items: [{ purchaseOptionId: "po_1", quantity: 1 }],
    deliveryMethod: "PICKUP",
    shippingAddress: null,
    shippingName: null,
    paymentInfo,
    sessionAmountTotal: 3500,
    discountAmountInCents: 0,
    taxAmountInCents: 0,
    shippingAmountInCents: 0,
    ...overrides,
  };
}

// Mock order.create to return a minimal order object
function setupOrderCreateMock() {
  let callCount = 0;
  orderCreateMock.mockImplementation(({ data }) => {
    callCount++;
    return {
      id: `order_${callCount}`,
      ...data,
      items: (data.items?.create || []).map(
        (item: { purchaseOptionId: string; quantity: number }, i: number) => ({
          id: `item_${i}`,
          ...item,
          purchaseOption: {
            type: "ONE_TIME",
            variant: {
              id: `var_${item.purchaseOptionId}`,
              name: "12oz",
              product: { name: "Coffee" },
            },
          },
        })
      ),
    };
  });
}

describe("createOrdersFromCheckout — discount handling", () => {
  let createOrdersFromCheckout: typeof import("../create-order").createOrdersFromCheckout;

  beforeAll(async () => {
    const mod = await import("../create-order");
    createOrdersFromCheckout = mod.createOrdersFromCheckout;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setupOrderCreateMock();
  });

  it("correctly isolates shipping when no discount is applied", async () => {
    // items=$15, shipping=$10, total=$25, discount=$0
    prisma.purchaseOption.findMany.mockResolvedValue([
      buildOneTimePurchaseOption("po_1", 1500),
    ]);

    const result = await createOrdersFromCheckout(
      buildBaseParams({
        sessionAmountTotal: 2500,
        discountAmountInCents: 0,
      })
    );

    expect(result.success).toBe(true);
    expect(orderCreateMock).toHaveBeenCalledTimes(1);

    const orderData = orderCreateMock.mock.calls[0][0].data;
    // totalInCents = items(1500) + shipping(1000) = 2500
    expect(orderData.totalInCents).toBe(2500);
    expect(orderData.discountAmountInCents).toBe(0);
  });

  it("correctly isolates shipping when a discount is applied", async () => {
    // items=$30, shipping=$5, discount=$5
    // Stripe sessionAmountTotal = 30 + 5 - 5 = $30
    prisma.purchaseOption.findMany.mockResolvedValue([
      buildOneTimePurchaseOption("po_1", 3000),
    ]);

    const result = await createOrdersFromCheckout(
      buildBaseParams({
        sessionAmountTotal: 3000, // $30 + $5 shipping - $5 discount
        discountAmountInCents: 500,
      })
    );

    expect(result.success).toBe(true);
    const orderData = orderCreateMock.mock.calls[0][0].data;

    // shipping = sessionTotal(3000) + discount(500) - items(3000) = 500
    // totalInCents = items(3000) + shipping(500) = 3500
    expect(orderData.totalInCents).toBe(3500);
    expect(orderData.discountAmountInCents).toBe(500);
  });

  it("handles 100% item discount without negative shipping", async () => {
    // items=$20, shipping=$5, discount=$20 (100% off items)
    // Stripe sessionAmountTotal = 20 + 5 - 20 = $5
    prisma.purchaseOption.findMany.mockResolvedValue([
      buildOneTimePurchaseOption("po_1", 2000),
    ]);

    const result = await createOrdersFromCheckout(
      buildBaseParams({
        sessionAmountTotal: 500, // only shipping remains
        discountAmountInCents: 2000,
      })
    );

    expect(result.success).toBe(true);
    const orderData = orderCreateMock.mock.calls[0][0].data;

    // shipping = 500 + 2000 - 2000 = 500 (correctly positive)
    expect(orderData.totalInCents).toBe(2500); // items + shipping
    expect(orderData.discountAmountInCents).toBe(2000);
  });

  it("applies discount to subscription order when no one-time items exist", async () => {
    prisma.purchaseOption.findMany.mockResolvedValue([
      buildSubscriptionPurchaseOption("po_sub", 2500),
    ]);

    const result = await createOrdersFromCheckout(
      buildBaseParams({
        items: [{ purchaseOptionId: "po_sub", quantity: 1 }],
        sessionAmountTotal: 2000, // $25 - $5 discount
        discountAmountInCents: 500,
      })
    );

    expect(result.success).toBe(true);
    expect(orderCreateMock).toHaveBeenCalledTimes(1);

    const orderData = orderCreateMock.mock.calls[0][0].data;
    expect(orderData.discountAmountInCents).toBe(500);
  });

  it("applies discount only to one-time order when both types exist", async () => {
    prisma.purchaseOption.findMany.mockResolvedValue([
      buildOneTimePurchaseOption("po_ot", 1500),
      buildSubscriptionPurchaseOption("po_sub", 2000),
    ]);

    const result = await createOrdersFromCheckout(
      buildBaseParams({
        items: [
          { purchaseOptionId: "po_ot", quantity: 1 },
          { purchaseOptionId: "po_sub", quantity: 1 },
        ],
        sessionAmountTotal: 3000, // 1500 + 2000 - 500 discount
        discountAmountInCents: 500,
      })
    );

    expect(result.success).toBe(true);
    expect(orderCreateMock).toHaveBeenCalledTimes(2);

    // First call = one-time order (gets the discount)
    const oneTimeData = orderCreateMock.mock.calls[0][0].data;
    expect(oneTimeData.discountAmountInCents).toBe(500);

    // Second call = subscription order (no discount)
    const subData = orderCreateMock.mock.calls[1][0].data;
    expect(subData.discountAmountInCents).toBe(0);
  });
});
