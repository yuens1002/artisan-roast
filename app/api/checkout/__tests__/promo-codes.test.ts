/** @jest-environment node */

import { NextRequest } from "next/server";

const purchaseOptionFindManyMock = jest.fn();

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

jest.mock("@/lib/prisma", () => ({
  prisma: {
    purchaseOption: {
      findMany: purchaseOptionFindManyMock,
    },
    address: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

jest.mock("@/auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

const getAllowPromoCodesMock = jest.fn();

jest.mock("@/lib/config/app-settings", () => ({
  getAllowPromoCodes: () => getAllowPromoCodesMock(),
}));

const stripeSessionCreateMock = jest.requireMock("@/lib/services/stripe").__mock
  .createMock as jest.Mock;

jest.spyOn(console, "error").mockImplementation(() => undefined);

// A valid purchase option fixture that passes all checkout validation
const validPurchaseOption = {
  id: "po_1",
  priceInCents: 1500,
  salePriceInCents: null,
  type: "ONE_TIME",
  billingInterval: null,
  billingIntervalCount: null,
  variant: {
    id: "var_1",
    name: "12oz",
    stockQuantity: 10,
    images: [{ url: "https://example.com/img.png" }],
    product: {
      id: "prod_1",
      name: "Ethiopia Yirgacheffe",
      isDisabled: false,
      images: [{ url: "https://example.com/img.png" }],
    },
  },
};

describe("POST /api/checkout — promotion codes flag", () => {
  let POST: typeof import("../route").POST;

  beforeAll(async () => {
    const mod = await import("../route");
    POST = mod.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    purchaseOptionFindManyMock.mockResolvedValue([validPurchaseOption]);
    stripeSessionCreateMock.mockResolvedValue({
      id: "sess_123",
      url: "https://checkout.stripe.com/test",
    });
  });

  const buildRequest = () =>
    new NextRequest("http://localhost/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ purchaseOptionId: "po_1", quantity: 1 }],
        userId: "user_1",
        deliveryMethod: "PICKUP",
      }),
    });

  it("passes allow_promotion_codes: true when setting is enabled", async () => {
    getAllowPromoCodesMock.mockResolvedValue(true);

    await POST(buildRequest());

    expect(stripeSessionCreateMock).toHaveBeenCalledTimes(1);
    const createParams = stripeSessionCreateMock.mock.calls[0][0];
    expect(createParams.allow_promotion_codes).toBe(true);
  });

  it("does not include allow_promotion_codes when setting is disabled", async () => {
    getAllowPromoCodesMock.mockResolvedValue(false);

    await POST(buildRequest());

    expect(stripeSessionCreateMock).toHaveBeenCalledTimes(1);
    const createParams = stripeSessionCreateMock.mock.calls[0][0];
    expect(createParams).not.toHaveProperty("allow_promotion_codes");
  });
});
