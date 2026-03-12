/** @jest-environment node */

import { NextRequest } from "next/server";
import { POST } from "../route";

// Mock app-settings before anything imports @/lib/prisma transitively
jest.mock("@/lib/config/app-settings", () => ({
  getAllowPromoCodes: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/services/stripe", () => {
  const createMock = jest.fn();
  return {
    __esModule: true,
    getStripe: () => ({
      checkout: {
        sessions: {
          create: createMock,
        },
      },
    }),
    __mock: { createMock },
  };
});

const purchaseOptionFindManyMock = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    purchaseOption: {
      findMany: purchaseOptionFindManyMock,
    },
  },
}));

const stripeSessionCreateMock = jest.requireMock("@/lib/services/stripe").__mock
  .createMock as jest.Mock;

// Silence console noise in tests
jest.spyOn(console, "error").mockImplementation(() => undefined);

describe("POST /api/checkout", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    stripeSessionCreateMock.mockResolvedValue({
      id: "sess_123",
      url: "https://stripe.test",
    });
  });

  const buildRequest = (
    items: Array<{ purchaseOptionId: string; quantity: number }>
  ) =>
    new NextRequest("http://localhost/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        userId: "user_1",
        deliveryMethod: "DELIVERY",
      }),
    });

  it("rejects disabled products before creating checkout", async () => {
    purchaseOptionFindManyMock.mockResolvedValue([
      {
        id: "po_disabled",
        priceInCents: 1200,
        type: "ONE_TIME",
        billingInterval: null,
        billingIntervalCount: null,
        variant: {
          id: "var_1",
          name: "12oz",
          stockQuantity: 5,
          product: {
            id: "prod_disabled",
            name: "Disabled Coffee",
            isDisabled: true,
            images: [{ url: "https://example.com/img.png" }],
          },
        },
      },
    ]);

    const req = buildRequest([
      { purchaseOptionId: "po_disabled", quantity: 1 },
    ]);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("PRODUCT_DISABLED");
    expect(stripeSessionCreateMock).not.toHaveBeenCalled();
  });

  it("rejects when stock is insufficient", async () => {
    purchaseOptionFindManyMock.mockResolvedValue([
      {
        id: "po_low_stock",
        priceInCents: 1500,
        type: "ONE_TIME",
        billingInterval: null,
        billingIntervalCount: null,
        variant: {
          id: "var_2",
          name: "12oz",
          stockQuantity: 1,
          product: {
            id: "prod_ok",
            name: "Morning Blend",
            isDisabled: false,
            images: [{ url: "https://example.com/img.png" }],
          },
        },
      },
    ]);

    const req = buildRequest([
      { purchaseOptionId: "po_low_stock", quantity: 3 },
    ]);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("INSUFFICIENT_STOCK");
    expect(stripeSessionCreateMock).not.toHaveBeenCalled();
  });
});
