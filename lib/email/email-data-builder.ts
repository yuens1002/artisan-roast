import { prisma } from "@/lib/prisma";
import { formatBillingInterval } from "@/lib/utils";
import type {
  EmailOrderItem,
  EmailShippingAddress,
  OrderWithItems,
  OrderItemWithDetails,
} from "./types";

/**
 * Builds email items array from order items
 */
export function buildOrderEmailItems(
  items: OrderItemWithDetails[]
): EmailOrderItem[] {
  return items.map((item) => ({
    productName: item.purchaseOption.variant.product.name,
    variantName: item.purchaseOption.variant.name,
    quantity: item.quantity,
    priceInCents: item.purchaseOption.priceInCents,
    purchaseType: item.purchaseOption.type,
    deliverySchedule:
      item.purchaseOption.type === "SUBSCRIPTION" &&
      item.purchaseOption.billingInterval
        ? formatBillingInterval(
            item.purchaseOption.billingInterval,
            item.purchaseOption.billingIntervalCount || 1
          )
        : null,
  }));
}

/**
 * Builds combined email items from multiple orders
 */
export function buildCombinedEmailItems(
  orders: OrderWithItems[]
): EmailOrderItem[] {
  return orders.flatMap((order) => buildOrderEmailItems(order.items));
}

/**
 * Builds shipping address for email from order data
 */
export function buildShippingAddressForEmail(
  order: OrderWithItems
): EmailShippingAddress | undefined {
  if (order.deliveryMethod !== "DELIVERY" || !order.shippingStreet) {
    return undefined;
  }

  return {
    recipientName: order.recipientName || "Customer",
    street: order.shippingStreet,
    city: order.shippingCity || "",
    state: order.shippingState || "",
    postalCode: order.shippingPostalCode || "",
    country: order.shippingCountry || "",
  };
}

/**
 * Calculates combined totals from multiple orders
 */
export function calculateCombinedTotals(orders: OrderWithItems[]): {
  subtotalInCents: number;
  totalInCents: number;
  shippingInCents: number;
} {
  const subtotalInCents = orders.reduce(
    (sum, order) =>
      sum +
      order.items.reduce(
        (orderSum: number, item: OrderItemWithDetails) =>
          orderSum + item.quantity * item.purchaseOption.priceInCents,
        0
      ),
    0
  );

  const totalInCents = orders.reduce(
    (sum, order) => sum + order.totalInCents,
    0
  );

  const shippingInCents = totalInCents - subtotalInCents;

  return { subtotalInCents, totalInCents, shippingInCents };
}

/**
 * Fetches store name from site settings
 */
export async function getStoreName(): Promise<string> {
  const storeNameSetting = await prisma.siteSettings.findUnique({
    where: { key: "store_name" },
  });
  return storeNameSetting?.value || "";
}

/**
 * Formats order numbers for display
 */
export function formatOrderNumbers(orders: OrderWithItems[]): string {
  return orders.map((o) => `#${o.id.slice(-8)}`).join(", ");
}

/**
 * Formats single order number for display
 */
export function formatOrderNumber(orderId: string): string {
  return orderId.slice(-8);
}

/**
 * Formats date for email display
 */
export function formatOrderDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
