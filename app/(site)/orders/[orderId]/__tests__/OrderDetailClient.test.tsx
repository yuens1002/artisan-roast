import React from "react";
import { render, screen } from "@testing-library/react";
import OrderDetailClient from "../OrderDetailClient";
import type { OrderWithItems, OrderItemWithDetails } from "@/lib/types";

// Mock useSiteSettings
jest.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: () => ({
    settings: { storeName: "Test Store" },
  }),
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

function buildOrderItem(
  overrides: Partial<OrderItemWithDetails> = {}
): OrderItemWithDetails {
  return {
    id: "item_1",
    quantity: 1,
    priceInCents: 0,
    refundedQuantity: 0,
    orderId: "order_1",
    purchaseOptionId: "po_1",
    purchaseOption: {
      id: "po_1",
      type: "ONE_TIME",
      priceInCents: 1500,
      billingInterval: null,
      intervalCount: null,
      variant: {
        id: "var_1",
        name: "12oz",
        product: {
          id: "prod_1",
          name: "Ethiopia Yirgacheffe",
          slug: "ethiopia-yirgacheffe",
        },
      },
    },
    ...overrides,
  } as OrderItemWithDetails;
}

function buildOrder(
  overrides: Partial<OrderWithItems> = {}
): OrderWithItems {
  return {
    id: "cltest12345678",
    totalInCents: 2500,
    discountAmountInCents: 0,
    taxAmountInCents: 0,
    shippingAmountInCents: 0,
    promoCode: null,
    status: "PENDING",
    deliveryMethod: "PICKUP",
    stripeSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
    stripeCustomerId: "cus_test",
    stripeSubscriptionId: null,
    customerEmail: "test@example.com",
    customerPhone: "+1234567890",
    paymentCardLast4: "4242",
    recipientName: null,
    shippingStreet: null,
    shippingCity: null,
    shippingState: null,
    shippingPostalCode: null,
    shippingCountry: null,
    trackingNumber: null,
    carrier: null,
    shippedAt: null,
    deliveredAt: null,
    userId: "user_1",
    createdAt: new Date("2026-02-16T12:00:00Z"),
    updatedAt: new Date("2026-02-16T12:00:00Z"),
    refundedAmountInCents: 0,
    refundedAt: null,
    refundReason: null,
    items: [buildOrderItem()],
    ...overrides,
  };
}

describe("OrderDetailClient — discount display", () => {
  it("does not show discount row when discountAmountInCents is 0", () => {
    const order = buildOrder({
      totalInCents: 2500,
      discountAmountInCents: 0,
      promoCode: null,
      items: [buildOrderItem({ purchaseOption: { ...buildOrderItem().purchaseOption, priceInCents: 1500 } })],
    });

    render(<OrderDetailClient order={order} />);

    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.queryByText(/Discount/)).not.toBeInTheDocument();
    expect(screen.getByText("$25.00 USD")).toBeInTheDocument();
  });

  it("shows discount row with amount when discountAmountInCents > 0", () => {
    const order = buildOrder({
      totalInCents: 2000, // $25 subtotal + $0 shipping - $5 discount
      discountAmountInCents: 500,
      promoCode: null,
      items: [buildOrderItem({ purchaseOption: { ...buildOrderItem().purchaseOption, priceInCents: 2000 } })],
    });

    render(<OrderDetailClient order={order} />);

    expect(screen.getByText("Discount")).toBeInTheDocument();
    expect(screen.getByText("-$5.00")).toBeInTheDocument();
  });

  it("shows promo code next to discount label when promoCode is set", () => {
    const order = buildOrder({
      totalInCents: 2000,
      discountAmountInCents: 500,
      promoCode: "SUMMER15",
      items: [buildOrderItem({ purchaseOption: { ...buildOrderItem().purchaseOption, priceInCents: 2000 } })],
    });

    render(<OrderDetailClient order={order} />);

    expect(screen.getByText("Discount (SUMMER15)")).toBeInTheDocument();
    expect(screen.getByText("-$5.00")).toBeInTheDocument();
  });

  it("calculates shipping correctly when discount is applied", () => {
    // items=$15, shipping=$10, discount=$5 → total=$20
    const order = buildOrder({
      totalInCents: 2000,
      discountAmountInCents: 500,
      promoCode: "SAVE5",
      deliveryMethod: "DELIVERY",
      items: [buildOrderItem({ purchaseOption: { ...buildOrderItem().purchaseOption, priceInCents: 1500 } })],
    });

    render(<OrderDetailClient order={order} />);

    // Verify discount row and total are correct
    expect(screen.getByText("Discount (SAVE5)")).toBeInTheDocument();
    expect(screen.getByText("-$5.00")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument(); // shipping
    expect(screen.getByText("$20.00 USD")).toBeInTheDocument(); // total
  });
});

describe("OrderDetailClient — tax and shipping", () => {
  it("shows tax row when taxAmountInCents > 0", () => {
    const order = buildOrder({
      totalInCents: 2689,
      taxAmountInCents: 189,
      shippingAmountInCents: 1000,
      items: [buildOrderItem({ purchaseOption: { ...buildOrderItem().purchaseOption, priceInCents: 1500 } })],
    });

    render(<OrderDetailClient order={order} />);

    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText("$1.89")).toBeInTheDocument();
  });

  it("does not show tax row when taxAmountInCents is 0", () => {
    const order = buildOrder({
      totalInCents: 2500,
      taxAmountInCents: 0,
      items: [buildOrderItem({ purchaseOption: { ...buildOrderItem().purchaseOption, priceInCents: 1500 } })],
    });

    render(<OrderDetailClient order={order} />);

    expect(screen.queryByText("Tax")).not.toBeInTheDocument();
  });

  it("uses stored shippingAmountInCents when > 0", () => {
    const order = buildOrder({
      totalInCents: 2500,
      shippingAmountInCents: 800,
      items: [buildOrderItem({ purchaseOption: { ...buildOrderItem().purchaseOption, priceInCents: 1500 } })],
    });

    render(<OrderDetailClient order={order} />);

    expect(screen.getByText("$8.00")).toBeInTheDocument();
  });
});

describe("OrderDetailClient — OUT_FOR_DELIVERY status", () => {
  it("renders Out for Delivery badge with orange styling", () => {
    const order = buildOrder({
      status: "OUT_FOR_DELIVERY",
      deliveryMethod: "DELIVERY",
      shippingStreet: "123 Main St",
      shippingCity: "Portland",
      shippingState: "OR",
      shippingPostalCode: "97201",
      shippingCountry: "US",
      carrier: "USPS",
      trackingNumber: "9400111899223456789012",
      shippedAt: new Date("2026-02-17T10:00:00Z"),
    });

    render(<OrderDetailClient order={order} />);

    const badges = screen.getAllByText("Out for Delivery");
    const statusBadge = badges.find((el) => el.className.includes("rounded-full"));
    expect(statusBadge).toBeDefined();
    expect(statusBadge!.className).toContain("bg-orange");
  });

  it("shows embedded timeline for OUT_FOR_DELIVERY orders", () => {
    const order = buildOrder({
      status: "OUT_FOR_DELIVERY",
      deliveryMethod: "DELIVERY",
      shippingStreet: "123 Main St",
      shippingCity: "Portland",
      shippingState: "OR",
      shippingPostalCode: "97201",
      shippingCountry: "US",
      carrier: "USPS",
      trackingNumber: "9400111899223456789012",
      shippedAt: new Date("2026-02-17T10:00:00Z"),
    });

    render(<OrderDetailClient order={order} />);

    expect(screen.getByText("Tracking Information")).toBeInTheDocument();
    expect(screen.getByText("Order Placed")).toBeInTheDocument();
    expect(screen.getByText("Shipped via USPS")).toBeInTheDocument();
    expect(screen.getByText(/Tracking: 9400111899223456789012/)).toBeInTheDocument();
    expect(screen.getByText("Track Package →")).toBeInTheDocument();
  });
});

describe("OrderDetailClient — per-item refund display", () => {
  it("shows corrected qty and line total when item has refundedQuantity > 0", () => {
    const order = buildOrder({
      totalInCents: 4500,
      items: [
        buildOrderItem({
          id: "item_1",
          quantity: 3,
          refundedQuantity: 1,
          purchaseOption: {
            ...buildOrderItem().purchaseOption,
            priceInCents: 1500,
          },
        }),
      ],
    });

    render(<OrderDetailClient order={order} />);

    // Strikethrough original qty "3", red "-1" indicator
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("-1")).toBeInTheDocument();

    // Corrected line total $30.00
    expect(screen.getByText("$30.00")).toBeInTheDocument();

    // Strikethrough original total appears (may be in multiple places like item + subtotal)
    const allOriginal = screen.getAllByText("$45.00");
    expect(allOriginal.length).toBeGreaterThanOrEqual(1);
  });

  it("shows normal qty when refundedQuantity is 0", () => {
    const order = buildOrder({
      totalInCents: 1500,
      items: [
        buildOrderItem({
          quantity: 1,
          refundedQuantity: 0,
          purchaseOption: {
            ...buildOrderItem().purchaseOption,
            priceInCents: 1500,
          },
        }),
      ],
    });

    render(<OrderDetailClient order={order} />);

    // Normal qty display, no red refund indicator
    expect(screen.queryByText(/-\d+/)).toBeNull();
  });
});
