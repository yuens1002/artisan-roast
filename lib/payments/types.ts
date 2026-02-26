/**
 * Common payment processor types
 * All processor-specific adapters normalize to these interfaces
 */

export type PaymentProcessor = "stripe" | "paypal" | "square";

/**
 * Normalized payment information from any processor
 */
export interface NormalizedPaymentInfo {
  processor: PaymentProcessor;
  transactionId: string | null;
  chargeId: string | null;
  invoiceId: string | null;
  cardLast4: string | null;
  paymentMethod: "card" | "paypal" | "bank" | "applepay" | "googlepay" | "other";
}

/**
 * Normalized shipping address
 */
export interface NormalizedShippingAddress {
  name: string | null;
  line1: string | null;
  line2?: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

/**
 * Cart item in normalized format
 */
export interface NormalizedCartItem {
  purchaseOptionId: string;
  quantity: number;
}

/**
 * Customer info in normalized format
 */
export interface NormalizedCustomerInfo {
  processorCustomerId: string;
  email: string | null;
  phone: string | null;
  name: string | null;
}

/**
 * Normalized checkout completed event
 */
export interface NormalizedCheckoutEvent {
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
  discountAmountInCents: number;
  taxAmountInCents: number;
  shippingAmountInCents: number;
}

/**
 * Normalized subscription status
 */
export type NormalizedSubscriptionStatus = "ACTIVE" | "PAUSED" | "CANCELED" | "PAST_DUE";

/**
 * Normalized subscription item
 */
export interface NormalizedSubscriptionItem {
  productId: string;
  productName: string;
  productDescription: string | null;
  priceId: string;
  quantity: number;
  priceInCents: number;
}

/**
 * Normalized subscription data
 */
export interface NormalizedSubscriptionData {
  processor: PaymentProcessor;
  processorSubscriptionId: string;
  processorCustomerId: string;
  status: NormalizedSubscriptionStatus;
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

/**
 * Normalized invoice payment event
 */
export interface NormalizedInvoicePaymentEvent {
  processor: PaymentProcessor;
  invoiceId: string;
  subscriptionId: string | null;
  customerId: string;
  paymentInfo: NormalizedPaymentInfo;
  isRenewal: boolean;
  billingReason: string | null;
  totalInCents: number;
  subtotalInCents: number;
}

/**
 * Normalized customer update event
 */
export interface NormalizedCustomerUpdateEvent {
  processor: PaymentProcessor;
  customerId: string;
  email: string | null;
  phone: string | null;
  shippingAddress: NormalizedShippingAddress | null;
  shippingName: string | null;
}

/**
 * Webhook verification result
 */
export type WebhookVerifyResult<T> =
  | { success: true; event: T }
  | { success: false; error: string; statusCode: number };

/**
 * Webhook verification params
 */
export interface WebhookVerifyParams {
  body: string;
  signature: string | null;
  secret: string | undefined;
}
