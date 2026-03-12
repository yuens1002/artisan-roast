import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/services/stripe";
import Stripe from "stripe";
import { CartItem } from "@/lib/store/cart-store";
import { getErrorMessage } from "@/lib/error-utils";
import { getAllowPromoCodes } from "@/lib/config/app-settings";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Payments not configured" },
        { status: 503 }
      );
    }

    const { items, userId, deliveryMethod, selectedAddressId } =
      await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Get the origin from the request headers (needed for absolute URLs)
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // SECURITY: Validate prices against database server-side
    const { prisma } = await import("@/lib/prisma");

    const purchaseOptionIds = items.map(
      (item: CartItem) => item.purchaseOptionId
    );
    const dbPurchaseOptions = await prisma.purchaseOption.findMany({
      where: {
        id: { in: purchaseOptionIds },
      },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            stockQuantity: true,
            images: {
              orderBy: { order: "asc" as const },
              take: 1,
            },
            product: {
              select: {
                id: true,
                name: true,
                isDisabled: true,
              },
            },
          },
        },
      },
    });

    // Create a map for quick lookup
    const priceMap = new Map(dbPurchaseOptions.map((po) => [po.id, po]));

    // Validate all items exist and build line items with DB prices
    // Validate availability (disabled products and stock)
    for (const item of items as CartItem[]) {
      const dbOption = priceMap.get(item.purchaseOptionId);
      if (!dbOption) {
        return NextResponse.json(
          { error: `Invalid purchase option: ${item.purchaseOptionId}` },
          { status: 400 }
        );
      }

      if (dbOption.variant.product.isDisabled) {
        return NextResponse.json(
          {
            error: `${dbOption.variant.product.name} is unavailable right now. Please remove it from your cart.`,
            code: "PRODUCT_DISABLED",
          },
          { status: 400 }
        );
      }

      if (dbOption.variant.stockQuantity < item.quantity) {
        return NextResponse.json(
          {
            error: `${dbOption.variant.product.name} - ${dbOption.variant.name} does not have enough stock for your order.`,
            code: "INSUFFICIENT_STOCK",
          },
          { status: 400 }
        );
      }
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item: CartItem) => {
        const dbOption = priceMap.get(item.purchaseOptionId);
        if (!dbOption) {
          throw new Error(`Invalid purchase option: ${item.purchaseOptionId}`);
        }

        const actualPriceInCents = dbOption.salePriceInCents ?? dbOption.priceInCents;
        const productName = dbOption.variant.product.name;
        const variantName = dbOption.variant.name;
        const imageUrl = dbOption.variant.images[0]?.url;

        // Convert relative image URLs to absolute URLs for Stripe
        const absoluteImageUrl =
          imageUrl && imageUrl.startsWith("/")
            ? `${origin}${imageUrl}`
            : imageUrl;

        // Derive Stripe recurring config directly from PurchaseOption billingInterval fields
        let recurring:
          | Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring
          | undefined = undefined;
        let subscriptionDescription = "One-time purchase";

        if (dbOption.type === "SUBSCRIPTION") {
          const interval = (
            dbOption.billingInterval || "WEEK"
          ).toLowerCase() as "day" | "week" | "month" | "year";
          const intervalCount = dbOption.billingIntervalCount || 1;

          recurring = {
            interval,
            interval_count: intervalCount,
          };

          const intervalLabel =
            intervalCount === 1
              ? `Every ${interval}`
              : `Every ${intervalCount} ${interval}s`;
          subscriptionDescription = `Subscription: ${intervalLabel}`;

          console.log("🧮 Subscription line item recurring config", {
            productName,
            variantName,
            billingInterval: dbOption.billingInterval,
            billingIntervalCount: dbOption.billingIntervalCount,
            interval,
            interval_count: intervalCount,
          });
        }

        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${productName} - ${variantName}`,
              description: subscriptionDescription,
              images: absoluteImageUrl ? [absoluteImageUrl] : undefined,
            },
            unit_amount: actualPriceInCents,
            ...(recurring && { recurring }),
          },
          quantity: item.quantity,
        };
      }
    );

    // Fetch user's email and selected address if provided
    let shippingAddressCollection:
      | Stripe.Checkout.SessionCreateParams.ShippingAddressCollection
      | undefined =
      deliveryMethod === "DELIVERY" ? { allowed_countries: ["US"] } : undefined;
    let customerEmail: string | undefined;

    if (userId) {
      const { auth } = await import("@/auth");

      const session = await auth();
      if (session?.user?.email) {
        customerEmail = session.user.email;
      }

      // If user selected a specific address, fetch it to pre-fill Stripe
      if (selectedAddressId && deliveryMethod === "DELIVERY") {
        await prisma.address.findUnique({
          where: { id: selectedAddressId },
          include: { user: true },
        });
      }
    }

    // Determine checkout mode (subscription or one-time payment)
    const subscriptionItems = items.filter(
      (item: CartItem) => item.purchaseType === "SUBSCRIPTION"
    );
    const isSubscription = subscriptionItems.length > 0;

    // Validate that all subscriptions have the same billing interval
    if (isSubscription && subscriptionItems.length > 1) {
      const intervals = new Set();
      subscriptionItems.forEach((item: CartItem) => {
        const dbOption = priceMap.get(item.purchaseOptionId);
        if (dbOption) {
          const key = `${dbOption.billingInterval}-${dbOption.billingIntervalCount}`;
          intervals.add(key);
        }
      });

      if (intervals.size > 1) {
        return NextResponse.json(
          {
            error:
              "Cannot checkout with subscriptions of different billing intervals. Please purchase them separately.",
            code: "MIXED_BILLING_INTERVALS",
          },
          { status: 400 }
        );
      }
    }

    // Require authentication for any subscription checkout
    if (isSubscription && !userId) {
      return NextResponse.json(
        {
          error:
            "To purchase a subscription, please sign in or create an account.",
          code: "SUBSCRIPTION_REQUIRES_AUTH",
        },
        { status: 401 }
      );
    }

    // Duplicate subscription enforcement (one subscription per product variant per user)
    // Note: We use stripeProductId for uniqueness since it's tied to the product+variant combination
    if (isSubscription && userId) {
      const activeSubs = await prisma.subscription.findMany({
        where: {
          userId,
          status: { in: ["ACTIVE", "PAUSED", "PAST_DUE"] },
        },
      });

      // Create a set of existing stripe product IDs (which represent unique product+variant combos)

      const attemptedDuplicates: string[] = [];
      for (const item of subscriptionItems) {
        const dbOption = priceMap.get(item.purchaseOptionId);
        if (!dbOption) continue;

        const productName = dbOption.variant.product.name;
        const variantName = dbOption.variant.name;
        // Stripe product will be created with this combined name
        const stripeProductKey = `${productName} - ${variantName}`;

        // Check if we already have a subscription for this product+variant combo
        // Note: For new subscriptions, we won't have a stripeProductId yet, so we check by productNames match
        const existingForProductVariant = activeSubs.find((s) =>
          s.productNames.includes(stripeProductKey)
        );

        if (existingForProductVariant) {
          attemptedDuplicates.push(stripeProductKey);
        }
      }

      if (attemptedDuplicates.length > 0) {
        return NextResponse.json(
          {
            error: `You already have an active subscription for: ${attemptedDuplicates.join(", ")}. Each product variant can only have one active subscription.`,
            code: "SUBSCRIPTION_EXISTS",
            duplicates: attemptedDuplicates,
          },
          { status: 409 }
        );
      }
    }
    const checkoutMode = isSubscription ? "subscription" : "payment";

    // Only collect shipping address and offer shipping options for delivery (not pickup)
    let shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] =
      [];

    if (deliveryMethod === "DELIVERY") {
      shippingAddressCollection = { allowed_countries: ["US"] };

      // Add shipping rate options only for payment mode
      // Note: Stripe doesn't support shipping_options in subscription mode
      if (!isSubscription) {
        // Deduplicate shipping rates in case env vars have same value
        const uniqueRates = [
          ...new Set([
            process.env.STRIPE_STANDARD_SHIPPING_RATE,
            process.env.STRIPE_EXPRESS_SHIPPING_RATE,
            process.env.STRIPE_OVERNIGHT_SHIPPING_RATE,
          ].filter(Boolean)),
        ];
        shippingOptions = uniqueRates.map((rate) => ({
          shipping_rate: rate!,
        }));
      } else {
        // For subscription mode, add shipping as a one-time line item
        // This charges shipping upfront for the initial delivery
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Shipping (One-time)",
              description: "Shipping fee for initial delivery",
            },
            unit_amount: 1000, // $10 standard shipping (default)
          },
          quantity: 1,
        });
      }
    }

    // Check if promotion codes are enabled
    const allowPromoCodes = await getAllowPromoCodes();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: checkoutMode,
      ...(allowPromoCodes && { allow_promotion_codes: true }),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      phone_number_collection: {
        enabled: true,
      },
      ...(shippingAddressCollection && {
        shipping_address_collection: shippingAddressCollection,
      }),
      ...(shippingOptions.length > 0 && { shipping_options: shippingOptions }),
      ...(customerEmail && { customer_email: customerEmail }),
      // Store cart data and delivery preferences in metadata for webhook processing
      // Note: Stripe metadata values limited to 500 chars, so we store minimal data
      metadata: {
        cartItems: JSON.stringify(
          items.map((item: CartItem) => ({
            po: item.purchaseOptionId,
            qty: item.quantity,
          }))
        ),
        deliveryMethod: deliveryMethod || "DELIVERY",
        selectedAddressId: selectedAddressId || "",
        ...(userId && { userId }),
        // Deprecated; kept only for backward compatibility. New source of truth
        // is billingInterval + billingIntervalCount on PurchaseOption and Stripe price.
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to create checkout session") },
      { status: 500 }
    );
  }
}
