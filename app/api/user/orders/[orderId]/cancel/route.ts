import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { getErrorMessage } from "@/lib/error-utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    // Fetch the order with items to restore inventory
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

    // Verify the order belongs to the user
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if order can be cancelled (only PENDING orders)
    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending orders can be cancelled" },
        { status: 400 }
      );
    }

    // Process refund via Stripe if payment intent exists
    if (order.stripePaymentIntentId) {
      try {
        await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
          reason: "requested_by_customer",
        });
      } catch (stripeError: unknown) {
        console.error("Stripe refund error:", stripeError);
        return NextResponse.json(
          {
            error: `Failed to process refund: ${stripeError instanceof Error ? stripeError.message : "Unknown error"}`,
          },
          { status: 500 }
        );
      }
    }

    // Restore inventory for each item
    console.log("📈 Restoring inventory for canceled order:", orderId);
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
          `📈 Restored stock for ${item.purchaseOption.variant.product.name} - ${item.purchaseOption.variant.name}: +${item.quantity}`
        );
      } catch (inventoryError) {
        console.error("Failed to restore inventory:", inventoryError);
        // Continue processing even if inventory restore fails
      }
    }

    // Update order status to CANCELLED
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
      },
    });

    // If this is a subscription order, cancel the Stripe subscription
    if (order.stripeSubscriptionId) {
      try {
        console.log(
          `🔄 Canceling Stripe subscription ${order.stripeSubscriptionId}...`
        );

        await stripe.subscriptions.cancel(order.stripeSubscriptionId);

        console.log(
          `✅ Stripe subscription ${order.stripeSubscriptionId} canceled`
        );

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
        // Return partial success - order canceled but subscription may need manual intervention
        return NextResponse.json(
          {
            success: true,
            message:
              "Order canceled and refunded, but failed to cancel subscription. Please contact support.",
            error: getErrorMessage(stripeError, "Unknown error"),
            order: updatedOrder,
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({
      message: order.stripeSubscriptionId
        ? "Order and subscription cancelled successfully"
        : "Order cancelled successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
