import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getStripe } from "@/lib/services/stripe";
import { getErrorMessage } from "@/lib/error-utils";

/**
 * POST /api/admin/orders/[orderId]/cancel
 * Cancel an order and optionally cancel the linked subscription
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAdmin();

    const { orderId } = await params;

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order is already canceled
    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Order is already canceled" },
        { status: 400 }
      );
    }

    // Check if order has already been fulfilled
    if (order.status === "SHIPPED" || order.status === "PICKED_UP" || order.status === "OUT_FOR_DELIVERY") {
      return NextResponse.json(
        { error: "Cannot cancel an order that has already been fulfilled" },
        { status: 400 }
      );
    }

    // Issue Stripe refund before marking order as refunded
    const stripe = await getStripe();
    let stripeRefundSucceeded = false;
    if (order.stripePaymentIntentId && stripe) {
      try {
        await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
        });
        console.log(`💰 Stripe refund issued for order ${orderId}`);
        stripeRefundSucceeded = true;
      } catch (stripeRefundError: unknown) {
        console.error("Failed to issue Stripe refund:", stripeRefundError);
      }
    }

    // Update order status to CANCELLED — only record refund if Stripe succeeded or no payment existed
    const hasStripePayment = !!order.stripePaymentIntentId;
    const recordRefund = !hasStripePayment || stripeRefundSucceeded;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        ...(recordRefund && {
          refundedAmountInCents: order.totalInCents,
          refundedAt: new Date(),
        }),
        refundReason: "Order cancelled",
      },
    });

    console.log(`✅ Order ${orderId} canceled`);

    if (hasStripePayment && !stripeRefundSucceeded) {
      return NextResponse.json(
        {
          success: true,
          message: "Order canceled but Stripe refund failed",
          requiresManualAction: true,
        },
        { status: 200 }
      );
    }

    // Restore inventory
    for (const item of order.items) {
      try {
        await prisma.productVariant.update({
          where: { id: item.purchaseOption.variant.id },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
          },
        });
        console.log(
          `📈 Restored stock for ${item.purchaseOption.variant.product.name} - ${item.purchaseOption.variant.name} (+${item.quantity})`
        );
      } catch (inventoryError) {
        console.error("Failed to restore inventory:", inventoryError);
        // Continue processing even if inventory update fails
      }
    }

    // If this is a subscription order, cancel the Stripe subscription
    if (order.stripeSubscriptionId && stripe) {
      try {
        console.log(
          `🔄 Canceling Stripe subscription ${order.stripeSubscriptionId}...`
        );
        
        await stripe.subscriptions.cancel(order.stripeSubscriptionId);
        
        console.log(`✅ Stripe subscription ${order.stripeSubscriptionId} canceled`);

        // Update subscription record in database
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: order.stripeSubscriptionId },
          data: {
            status: "CANCELED",
            canceledAt: new Date(),
          },
        });

        console.log("✅ Subscription record updated");
      } catch (stripeError: unknown) {
        console.error("Failed to cancel Stripe subscription:", stripeError);
        // Return error to admin so they know subscription wasn't canceled
        return NextResponse.json(
          {
            success: true,
            message: "Order canceled but failed to cancel subscription",
            error: getErrorMessage(stripeError, "Unknown error"),
            requiresManualAction: true,
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: order.stripeSubscriptionId
        ? "Order and subscription canceled successfully"
        : "Order canceled successfully",
    });
  } catch (error: unknown) {
    console.error("Order cancellation error:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
