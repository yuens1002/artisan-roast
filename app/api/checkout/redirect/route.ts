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
      return NextResponse.redirect(new URL("/?error=payments-not-configured", req.url), 303);
    }

    const formData = await req.formData();
    const itemsJson = formData.get("items") as string;
    const userId = formData.get("userId") as string;
    const deliveryMethod = (formData.get("deliveryMethod") as string) || "DELIVERY";

    const items: CartItem[] = JSON.parse(itemsJson || "[]");

    if (!items || items.length === 0) {
      return NextResponse.redirect(new URL("/?error=empty-cart", req.url), 303);
    }

    const origin = req.headers.get("origin") || new URL(req.url).origin;

    // SECURITY: Validate prices against database server-side
    const { prisma } = await import("@/lib/prisma");

    const purchaseOptionIds = items.map((item: CartItem) => item.purchaseOptionId);
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

    const priceMap = new Map(dbPurchaseOptions.map((po) => [po.id, po]));

    // Validate all items exist and check availability
    for (const item of items) {
      const dbOption = priceMap.get(item.purchaseOptionId);
      if (!dbOption) {
        return NextResponse.redirect(new URL("/?error=invalid-item", req.url), 303);
      }
      if (dbOption.variant.product.isDisabled) {
        return NextResponse.redirect(new URL("/?error=product-unavailable", req.url), 303);
      }
      if (dbOption.variant.stockQuantity < item.quantity) {
        return NextResponse.redirect(new URL("/?error=insufficient-stock", req.url), 303);
      }
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item: CartItem) => {
        const dbOption = priceMap.get(item.purchaseOptionId)!;
        const actualPriceInCents = dbOption.priceInCents;
        const productName = dbOption.variant.product.name;
        const variantName = dbOption.variant.name;
        const imageUrl = dbOption.variant.images[0]?.url;

        const absoluteImageUrl =
          imageUrl && imageUrl.startsWith("/")
            ? `${origin}${imageUrl}`
            : imageUrl;

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

    // Fetch customer email if user is logged in
    let customerEmail: string | undefined;
    if (userId) {
      const { auth } = await import("@/auth");
      const session = await auth();
      if (session?.user?.email) {
        customerEmail = session.user.email;
      }
    }

    // Determine checkout mode
    const isSubscription = items.some((item) => item.purchaseType === "SUBSCRIPTION");
    const checkoutMode = isSubscription ? "subscription" : "payment";

    // Shipping configuration
    const shippingAddressCollection:
      | Stripe.Checkout.SessionCreateParams.ShippingAddressCollection
      | undefined = deliveryMethod === "DELIVERY" ? { allowed_countries: ["US"] } : undefined;

    let shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [];

    if (deliveryMethod === "DELIVERY") {
      if (!isSubscription) {
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
        // For subscriptions, add shipping as a one-time line item
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Shipping (One-time)",
              description: "Shipping fee for initial delivery",
            },
            unit_amount: 1000,
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
      metadata: {
        cartItems: JSON.stringify(
          items.map((item: CartItem) => ({
            po: item.purchaseOptionId,
            qty: item.quantity,
          }))
        ),
        deliveryMethod: deliveryMethod,
        selectedAddressId: "",
        ...(userId && { userId }),
      },
    });

    // Redirect to Stripe Checkout (use 303 to change POST to GET)
    if (session.url) {
      return NextResponse.redirect(session.url, 303);
    }

    return NextResponse.redirect(new URL("/?error=no-checkout-url", req.url), 303);
  } catch (error: unknown) {
    console.error("Stripe checkout redirect error:", error);
    const errorMessage = getErrorMessage(error, "checkout-failed");
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(errorMessage)}`, req.url), 303);
  }
}
