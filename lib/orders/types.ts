import type {
  NormalizedShippingAddress,
  NormalizedCartItem,
  NormalizedPaymentInfo,
} from "@/lib/payments/types";
import type { OrderWithItems } from "@/lib/types";

/**
 * Parameters for creating orders from checkout session
 * Uses normalized types for processor-agnostic order creation
 */
export interface CreateOrdersFromCheckoutParams {
  sessionId: string;
  subscriptionId?: string | null;
  customerId: string;
  customerEmail: string | null;
  customerPhone: string | null;
  userId: string | null;
  items: NormalizedCartItem[];
  deliveryMethod: "DELIVERY" | "PICKUP";
  shippingAddress: NormalizedShippingAddress | null;
  shippingName: string | null;
  paymentInfo: NormalizedPaymentInfo;
  sessionAmountTotal: number;
  discountAmountInCents: number;
  taxAmountInCents: number;
  shippingAmountInCents: number;
}

/**
 * Result of creating orders from checkout
 */
export interface CreateOrdersResult {
  success: boolean;
  orders: OrderWithItems[];
  error?: string;
}

/**
 * Parameters for creating a subscription renewal order
 */
export interface CreateRenewalOrderParams {
  subscriptionId: string;
  customerId: string;
  userId: string;
  userEmail: string | null;
  userPhone: string | null;
  userName: string | null;
  productNames: string[];
  quantities: number[];
  totalPriceInCents: number;
  shippingCost: number;
  shippingAddress: NormalizedShippingAddress | null;
  deliveryMethod: "DELIVERY" | "PICKUP";
  deliverySchedule: string | null;
  paymentInfo: NormalizedPaymentInfo;
}

/**
 * Purchase option with full variant and product details
 */
export interface PurchaseOptionWithDetails {
  id: string;
  type: "ONE_TIME" | "SUBSCRIPTION";
  priceInCents: number;
  billingInterval: string | null;
  billingIntervalCount: number | null;
  variant: {
    id: string;
    name: string;
    isDisabled: boolean;
    stockQuantity: number;
    product: {
      id: string;
      name: string;
      slug: string;
      isDisabled: boolean;
    };
  };
}

/**
 * Validation result for stock and product checks
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}
