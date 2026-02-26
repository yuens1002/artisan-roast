import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { OrderWithItems } from "@/lib/types";
import type {
  CreateOrdersFromCheckoutParams,
  CreateOrdersResult,
  CreateRenewalOrderParams,
} from "./types";
import { normalizeAddress } from "./address-utils";
import {
  fetchPurchaseOptions,
  validateStockAndProducts,
  calculateItemTotal,
  separateItemsByType,
  decrementInventory,
} from "./inventory";

/**
 * Creates orders from a completed checkout session
 * Separates one-time purchases and subscriptions into separate orders
 */
export async function createOrdersFromCheckout(
  params: CreateOrdersFromCheckoutParams
): Promise<CreateOrdersResult> {
  const {
    sessionId,
    subscriptionId,
    customerId,
    customerEmail,
    customerPhone,
    userId,
    items,
    deliveryMethod,
    shippingAddress,
    shippingName,
    paymentInfo,
    sessionAmountTotal,
    discountAmountInCents,
    taxAmountInCents,
    shippingAmountInCents: shippingFromStripe,
  } = params;

  // Fetch purchase options with full details
  const purchaseOptionIds = items.map((item) => item.purchaseOptionId);
  const purchaseOptions = await fetchPurchaseOptions(purchaseOptionIds);

  // Validate stock and product availability
  const validation = validateStockAndProducts(items, purchaseOptions);
  if (!validation.valid) {
    return {
      success: false,
      orders: [],
      error: validation.error,
    };
  }

  // Separate items by type
  const { oneTimeItems, subscriptionItems } = separateItemsByType(
    items,
    purchaseOptions
  );

  logger.debug(
    `📦 Creating orders: ${oneTimeItems.length} one-time items, ${subscriptionItems.length} subscription items`
  );

  // Calculate totals
  const oneTimeTotal = calculateItemTotal(oneTimeItems, purchaseOptions);
  const subscriptionTotal = calculateItemTotal(
    subscriptionItems,
    purchaseOptions
  );
  const totalItemCost = oneTimeTotal + subscriptionTotal;
  // Use Stripe-reported shipping when available; fall back to derived formula for old orders
  const shippingCostInCents = shippingFromStripe > 0
    ? shippingFromStripe
    : sessionAmountTotal + discountAmountInCents - totalItemCost - taxAmountInCents;

  // Normalize address
  const addressData = normalizeAddress(shippingAddress, shippingName);

  // Track created orders
  const createdOrders: OrderWithItems[] = [];

  // Create order for one-time items (if any)
  if (oneTimeItems.length > 0) {
    logger.debug("📦 Creating one-time order...");
    const oneTimeOrder = await createSingleOrder({
      sessionId,
      subscriptionId: null,
      customerId,
      customerEmail,
      customerPhone,
      userId,
      items: oneTimeItems,
      totalInCents: oneTimeTotal + shippingCostInCents, // One-time order includes shipping
      discountAmountInCents,
      taxAmountInCents,
      shippingAmountInCents: shippingCostInCents,
      deliveryMethod,
      addressData,
      paymentInfo,
    });
    createdOrders.push(oneTimeOrder);
    logger.debug("✅ One-time order created:", oneTimeOrder.id);
  }

  // Create order for subscription items (if any)
  if (subscriptionItems.length > 0) {
    logger.debug(
      `📦 Creating subscription order with ${subscriptionItems.length} items...`
    );

    // If there are no one-time items, subscription order includes shipping
    const shouldIncludeShipping = oneTimeItems.length === 0;
    const orderTotal = shouldIncludeShipping
      ? subscriptionTotal + shippingCostInCents
      : subscriptionTotal;

    // Apply discount to subscription order only when there's no one-time order
    const subDiscount = oneTimeItems.length === 0 ? discountAmountInCents : 0;

    const subOrder = await createSingleOrder({
      sessionId,
      subscriptionId: subscriptionId || null,
      customerId,
      customerEmail,
      customerPhone,
      userId,
      items: subscriptionItems,
      totalInCents: orderTotal,
      discountAmountInCents: subDiscount,
      taxAmountInCents: oneTimeItems.length === 0 ? taxAmountInCents : 0,
      shippingAmountInCents: shouldIncludeShipping ? shippingCostInCents : 0,
      deliveryMethod,
      addressData,
      paymentInfo,
    });
    createdOrders.push(subOrder);
    logger.debug("✅ Subscription order created:", subOrder.id);
  }

  logger.debug(`✅ Created ${createdOrders.length} order(s) total`);

  // Decrement inventory for all orders
  for (const order of createdOrders) {
    await decrementInventory(order.items);
  }

  return {
    success: true,
    orders: createdOrders,
  };
}

/**
 * Creates a single order in the database
 */
async function createSingleOrder(params: {
  sessionId: string;
  subscriptionId: string | null;
  customerId: string;
  customerEmail: string | null;
  customerPhone: string | null;
  userId: string | null;
  items: Array<{ purchaseOptionId: string; quantity: number }>;
  totalInCents: number;
  discountAmountInCents: number;
  taxAmountInCents: number;
  shippingAmountInCents: number;
  deliveryMethod: "DELIVERY" | "PICKUP";
  addressData: ReturnType<typeof normalizeAddress>;
  paymentInfo: {
    transactionId: string | null;
    chargeId: string | null;
    invoiceId: string | null;
    cardLast4: string | null;
  };
}): Promise<OrderWithItems> {
  const order = await prisma.order.create({
    data: {
      stripeSessionId: params.sessionId,
      stripeSubscriptionId: params.subscriptionId,
      stripePaymentIntentId: params.paymentInfo.transactionId || null,
      stripeChargeId: params.paymentInfo.chargeId || null,
      stripeInvoiceId: params.paymentInfo.invoiceId || null,
      stripeCustomerId: params.customerId,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      totalInCents: params.totalInCents,
      discountAmountInCents: params.discountAmountInCents,
      taxAmountInCents: params.taxAmountInCents,
      shippingAmountInCents: params.shippingAmountInCents,
      status: "PENDING",
      deliveryMethod: params.deliveryMethod,
      paymentCardLast4: params.paymentInfo.cardLast4,
      userId: params.userId || undefined,
      ...params.addressData,
      items: {
        create: params.items.map((item) => ({
          quantity: item.quantity,
          priceInCents: 0, // Will be fetched from purchase option relation
          purchaseOptionId: item.purchaseOptionId,
        })),
      },
    },
    include: {
      items: {
        include: {
          purchaseOption: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return order as unknown as OrderWithItems;
}

/**
 * Creates a renewal order for a subscription
 */
export async function createRenewalOrder(
  params: CreateRenewalOrderParams
): Promise<OrderWithItems | null> {
  const {
    subscriptionId,
    customerId,
    userId,
    userEmail,
    userPhone,
    userName,
    productNames,
    quantities,
    totalPriceInCents,
    shippingCost,
    shippingAddress,
    deliveryMethod,
    paymentInfo,
  } = params;

  // Find matching purchase options for subscription items
  const orderItemsData: Array<{
    quantity: number;
    priceInCents: number;
    purchaseOptionId: string;
  }> = [];

  for (let i = 0; i < productNames.length; i++) {
    const productName = productNames[i];
    const quantity = quantities[i];

    // Extract product name (before the " - " variant separator)
    const productBaseName = productName.split(" - ")[0];

    const purchaseOption = await prisma.purchaseOption.findFirst({
      where: {
        type: "SUBSCRIPTION",
        variant: {
          product: {
            name: {
              contains: productBaseName,
            },
          },
        },
      },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!purchaseOption) {
      logger.error(
        "⚠️ Could not find matching purchase option for:",
        productName
      );
      continue;
    }

    orderItemsData.push({
      quantity,
      priceInCents: 0, // Will be populated by purchase option relation
      purchaseOptionId: purchaseOption.id,
    });

    logger.debug(`  ✅ Found purchase option for ${productName}`);
  }

  if (orderItemsData.length === 0) {
    logger.error(
      "⚠️ Could not find any matching purchase options for subscription items"
    );
    return null;
  }

  // Calculate total
  const totalInCents = totalPriceInCents + shippingCost;

  // Normalize address
  const addressData = normalizeAddress(shippingAddress, shippingAddress?.name || userName);

  // Create the order
  const order = await prisma.order.create({
    data: {
      stripeSubscriptionId: subscriptionId,
      stripePaymentIntentId: paymentInfo.transactionId,
      stripeChargeId: paymentInfo.chargeId,
      stripeInvoiceId: paymentInfo.invoiceId,
      stripeCustomerId: customerId,
      customerEmail: userEmail,
      customerPhone: userPhone,
      totalInCents,
      status: "PENDING",
      deliveryMethod,
      paymentCardLast4: paymentInfo.cardLast4,
      userId,
      ...addressData,
      items: {
        create: orderItemsData,
      },
    },
    include: {
      items: {
        include: {
          purchaseOption: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      },
    },
  });

  logger.debug("📦 Recurring order created:", order.id);

  // Decrement inventory
  await decrementInventory(order.items);

  return order as unknown as OrderWithItems;
}

/**
 * Links a subscription ID to an order
 */
export async function linkSubscriptionToOrder(
  subscriptionId: string,
  orderId: string
): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { stripeSubscriptionId: subscriptionId },
  });
  logger.debug(`🔗 Order ${orderId} linked to subscription ${subscriptionId}`);
}

/**
 * Updates order with payment IDs from invoice
 */
export async function updateOrderPaymentIds(params: {
  subscriptionId: string;
  customerId: string;
  paymentIntentId: string | null;
  chargeId: string | null;
  invoiceId: string;
}): Promise<number> {
  const { subscriptionId, customerId, paymentIntentId, chargeId, invoiceId } =
    params;

  const updateData: {
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    stripeInvoiceId?: string;
    stripeSubscriptionId?: string;
  } = { stripeInvoiceId: invoiceId };

  if (paymentIntentId) updateData.stripePaymentIntentId = paymentIntentId;
  if (chargeId) updateData.stripeChargeId = chargeId;

  logger.debug(`🔍 Looking for order with stripeSubscriptionId=${subscriptionId}`);

  // First try to find by subscription ID
  let result = await prisma.order.updateMany({
    where: {
      stripeSubscriptionId: subscriptionId,
      stripePaymentIntentId: null,
    },
    data: updateData,
  });

  // Fallback: if no orders found by subscription ID, try by customer ID
  if (result.count === 0) {
    logger.debug(
      `⚠️ No orders found by subscription ID, trying customer ID fallback...`
    );
    result = await prisma.order.updateMany({
      where: {
        stripeCustomerId: customerId,
        stripePaymentIntentId: null,
        stripeSubscriptionId: null,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Within last 5 minutes
        },
      },
      data: {
        ...updateData,
        stripeSubscriptionId: subscriptionId,
      },
    });
  }

  return result.count;
}
