/**
 * Stripe Adapter
 * Normalizes Stripe-specific events/data to common payment interfaces
 */

import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import type {
  NormalizedCheckoutEvent,
  NormalizedPaymentInfo,
  NormalizedShippingAddress,
  NormalizedCartItem,
  NormalizedSubscriptionData,
  NormalizedSubscriptionStatus,
  NormalizedSubscriptionItem,
  NormalizedInvoicePaymentEvent,
  NormalizedCustomerUpdateEvent,
} from "../types";
import { getStripe } from "@/lib/services/stripe";
import { formatBillingInterval } from "@/lib/utils";

async function requireStripe(): Promise<Stripe> {
  const stripe = await getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe;
}
import {
  parseCartMetadata,
  parseShippingFromSession,
  parseShippingFromSubscription,
} from "./parse";
import {
  getPaymentDetailsFromIntent,
  getPaymentDetailsFromSubscription,
  getPaymentDetailsFromInvoice,
} from "./stripe-helpers";
import type { InvoiceWithSubscriptionDetails } from "./types";

/**
 * Maps Stripe subscription status to normalized status
 */
export function mapStripeSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status,
  isPaused: boolean = false
): NormalizedSubscriptionStatus {
  if (stripeStatus === "canceled") return "CANCELED";
  if (stripeStatus === "paused" || isPaused) return "PAUSED";
  if (stripeStatus === "past_due") return "PAST_DUE";
  return "ACTIVE";
}

/**
 * Normalizes Stripe payment info to common format
 */
function normalizeStripePaymentInfo(info: {
  paymentIntentId: string | null;
  chargeId: string | null;
  invoiceId: string | null;
  cardLast4: string | null;
}): NormalizedPaymentInfo {
  return {
    processor: "stripe",
    transactionId: info.paymentIntentId,
    chargeId: info.chargeId,
    invoiceId: info.invoiceId,
    cardLast4: info.cardLast4,
    paymentMethod: info.cardLast4 ? "card" : "other",
  };
}

/**
 * Normalizes Stripe address to common format
 */
function normalizeStripeAddress(
  address: Stripe.Address | null | undefined,
  name?: string | null
): NormalizedShippingAddress | null {
  if (!address) return null;

  return {
    name: name || null,
    line1: address.line1 || null,
    line2: address.line2 || null,
    city: address.city || null,
    state: address.state || null,
    postalCode: address.postal_code || null,
    country: address.country || null,
  };
}

/**
 * Normalizes a Stripe checkout session to common format
 */
export async function normalizeCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<NormalizedCheckoutEvent> {
  const stripe = await requireStripe();
  // Parse cart items from metadata
  const cartItems = parseCartMetadata(session);
  const normalizedItems: NormalizedCartItem[] = cartItems.map((item) => ({
    purchaseOptionId: item.purchaseOptionId,
    quantity: item.quantity,
  }));

  // Extract shipping info
  const { address: shippingAddress, name: shippingName } =
    parseShippingFromSession(session);

  // Get payment details
  let paymentInfo;
  if (session.payment_intent) {
    paymentInfo = await getPaymentDetailsFromIntent(
      stripe,
      session.payment_intent as string
    );
  } else if (session.subscription) {
    paymentInfo = await getPaymentDetailsFromSubscription(
      stripe,
      session.subscription as string
    );
  } else {
    paymentInfo = {
      paymentIntentId: null,
      chargeId: null,
      invoiceId: null,
      cardLast4: null,
    };
  }

  return {
    processor: "stripe",
    sessionId: session.id,
    subscriptionId: (session.subscription as string) || null,
    customer: {
      processorCustomerId: session.customer as string,
      email: session.customer_details?.email || null,
      phone: session.customer_details?.phone || null,
      name: session.customer_details?.name || null,
    },
    items: normalizedItems,
    deliveryMethod: (session.metadata?.deliveryMethod || "DELIVERY") as
      | "DELIVERY"
      | "PICKUP",
    shippingAddress: shippingAddress
      ? {
          name: shippingAddress.name,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postal_code,
          country: shippingAddress.country,
        }
      : null,
    shippingName,
    paymentInfo: normalizeStripePaymentInfo(paymentInfo),
    totalInCents: session.amount_total || 0,
    discountAmountInCents: session.total_details?.amount_discount || 0,
    taxAmountInCents: session.total_details?.amount_tax || 0,
    shippingAmountInCents: session.total_details?.amount_shipping || 0,
  };
}

/**
 * Normalizes a Stripe subscription to common format
 */
export async function normalizeSubscription(
  subscription: Stripe.Subscription,
  shippingOverride?: NormalizedShippingAddress | null,
  shippingNameOverride?: string | null,
  customerPhoneOverride?: string | null
): Promise<NormalizedSubscriptionData> {
  const stripe = await requireStripe();
  // Extract items
  const items: NormalizedSubscriptionItem[] = [];
  let totalPriceInCents = 0;

  for (const item of subscription.items.data) {
    const price = item.price;
    const productId =
      typeof price.product === "string"
        ? price.product
        : (price.product as Stripe.Product).id;

    let productName = "Coffee Subscription";
    let productDescription: string | null = null;

    try {
      const product = await stripe.products.retrieve(productId);
      productName = product.name || productName;
      productDescription = (product.description as string) || null;
    } catch (err) {
      logger.warn("⚠️ Failed to retrieve Stripe product", err);
    }

    const quantity = item.quantity || 1;
    const priceInCents = price.unit_amount || 0;
    totalPriceInCents += priceInCents * quantity;

    items.push({
      productId,
      productName,
      productDescription,
      priceId: price.id,
      quantity,
      priceInCents,
    });
  }

  // Derive delivery schedule
  let deliverySchedule: string | null = null;
  if (subscription.metadata?.deliverySchedule) {
    deliverySchedule = subscription.metadata.deliverySchedule;
  } else {
    const firstPrice = subscription.items.data[0]?.price;
    if (firstPrice?.nickname) {
      const scheduleMatch = firstPrice.nickname.match(/Every\s+[^-()]+/i);
      if (scheduleMatch) deliverySchedule = scheduleMatch[0].trim();
    }
    if (!deliverySchedule && firstPrice?.recurring?.interval) {
      deliverySchedule = formatBillingInterval(
        firstPrice.recurring.interval,
        firstPrice.recurring.interval_count || 1
      );
    }
  }

  // Get billing period
  const subscriptionItem = subscription.items.data[0];
  const currentPeriodStart = new Date(
    subscriptionItem.current_period_start * 1000
  );
  const currentPeriodEnd = new Date(subscriptionItem.current_period_end * 1000);

  // Get shipping from metadata or override
  const shippingFromMetadata = parseShippingFromSubscription(subscription);
  const shippingAddress = shippingOverride ?? (shippingFromMetadata
    ? {
        name: shippingFromMetadata.name,
        line1: shippingFromMetadata.line1,
        line2: shippingFromMetadata.line2,
        city: shippingFromMetadata.city,
        state: shippingFromMetadata.state,
        postalCode: shippingFromMetadata.postal_code,
        country: shippingFromMetadata.country,
      }
    : null);

  const isPaused = !!subscription.pause_collection;
  const status = mapStripeSubscriptionStatus(subscription.status, isPaused);

  return {
    processor: "stripe",
    processorSubscriptionId: subscription.id,
    processorCustomerId: subscription.customer as string,
    status,
    items,
    totalPriceInCents,
    deliverySchedule,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd:
      subscription.cancel_at_period_end || !!subscription.cancel_at,
    canceledAt:
      subscription.status === "canceled" || subscription.canceled_at
        ? new Date(
            (subscription.canceled_at || Math.floor(Date.now() / 1000)) * 1000
          )
        : null,
    pausedUntil: subscription.pause_collection?.resumes_at
      ? new Date(subscription.pause_collection.resumes_at * 1000)
      : null,
    shippingAddress,
    shippingName: shippingNameOverride ?? shippingAddress?.name ?? null,
    customerPhone: customerPhoneOverride ?? null,
  };
}

/**
 * Extracts subscription ID from Stripe invoice
 */
export function extractSubscriptionId(
  invoice: InvoiceWithSubscriptionDetails
): string | undefined {
  if (typeof invoice.subscription === "string") {
    return invoice.subscription;
  }
  if (typeof invoice.subscription === "object" && invoice.subscription?.id) {
    return invoice.subscription.id;
  }
  if (invoice.parent?.subscription_details?.subscription) {
    return invoice.parent.subscription_details.subscription;
  }
  return undefined;
}

/**
 * Normalizes a Stripe invoice payment event
 */
export async function normalizeInvoicePayment(
  invoice: Stripe.Invoice
): Promise<NormalizedInvoicePaymentEvent> {
  const stripe = await requireStripe();
  const paymentInfo = await getPaymentDetailsFromInvoice(stripe, invoice.id);

  const subscriptionId = extractSubscriptionId(
    invoice as InvoiceWithSubscriptionDetails
  );

  return {
    processor: "stripe",
    invoiceId: invoice.id,
    subscriptionId: subscriptionId || null,
    customerId: invoice.customer as string,
    paymentInfo: normalizeStripePaymentInfo(paymentInfo),
    isRenewal: invoice.billing_reason === "subscription_cycle",
    billingReason: invoice.billing_reason || null,
    totalInCents: invoice.total || 0,
    subtotalInCents: invoice.subtotal || 0,
  };
}

/**
 * Normalizes a Stripe customer update event
 */
export function normalizeCustomerUpdate(
  customer: Stripe.Customer
): NormalizedCustomerUpdateEvent {
  return {
    processor: "stripe",
    customerId: customer.id,
    email: customer.email,
    phone: customer.phone || null,
    shippingAddress: normalizeStripeAddress(
      customer.shipping?.address,
      customer.shipping?.name
    ),
    shippingName: customer.shipping?.name || null,
  };
}

/**
 * Gets customer email from Stripe customer ID
 */
export async function getStripeCustomerEmail(
  customerId: string
): Promise<string | null> {
  const stripe = await requireStripe();
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return (customer as Stripe.Customer).email;
  } catch (error) {
    logger.error("Failed to retrieve Stripe customer:", error);
    return null;
  }
}

/**
 * Stores shipping address in Stripe subscription metadata
 */
export async function storeShippingInStripeMetadata(
  subscriptionId: string,
  shippingAddress: NormalizedShippingAddress,
  shippingName: string | null,
  deliveryMethod: string
): Promise<void> {
  const stripe = await requireStripe();
  try {
    await stripe.subscriptions.update(subscriptionId, {
      metadata: {
        shipping_address: JSON.stringify({
          name: shippingName,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 || "",
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postalCode,
          country: shippingAddress.country,
        }),
        deliveryMethod,
      },
    });
    logger.debug("📍 Stored shipping address in subscription metadata");
  } catch (metadataError) {
    logger.error("Failed to store shipping metadata:", metadataError);
  }
}

/**
 * Updates Stripe subscription metadata with shipping address
 */
export async function updateStripeSubscriptionShipping(
  subscriptionId: string,
  shippingAddress: NormalizedShippingAddress
): Promise<void> {
  const stripe = await requireStripe();
  try {
    await stripe.subscriptions.update(subscriptionId, {
      metadata: {
        shipping_address: JSON.stringify({
          name: shippingAddress.name,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 || "",
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postalCode,
          country: shippingAddress.country,
        }),
      },
    });
    logger.debug(`✅ Updated Stripe metadata for subscription`);
  } catch (metadataError) {
    logger.error(`⚠️ Failed to update Stripe metadata:`, metadataError);
  }
}
