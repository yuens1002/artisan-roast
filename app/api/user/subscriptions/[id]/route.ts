import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getStripe } from "@/lib/services/stripe";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["cancel", "skip", "resume"]),
});

/**
 * Calculate next period end based on delivery schedule
 */
function calculateNextPeriodTimestamp(
  currentPeriodEnd: Date,
  deliverySchedule: string | null
): number {
  const periodEnd = new Date(currentPeriodEnd);

  if (!deliverySchedule) {
    periodEnd.setDate(periodEnd.getDate() + 14);
  } else if (deliverySchedule.toLowerCase().includes("week")) {
    const match = deliverySchedule.match(/(\d+)/);
    const weeks = match ? parseInt(match[1], 10) : 2;
    periodEnd.setDate(periodEnd.getDate() + weeks * 7);
  } else if (deliverySchedule.toLowerCase().includes("month")) {
    const match = deliverySchedule.match(/(\d+)/);
    const months = match ? parseInt(match[1], 10) : 1;
    periodEnd.setMonth(periodEnd.getMonth() + months);
  } else {
    periodEnd.setDate(periodEnd.getDate() + 14);
  }

  return Math.floor(periodEnd.getTime() / 1000);
}

/**
 * PATCH /api/user/subscriptions/[id]
 * User self-service subscription actions: skip, resume, cancel
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = actionSchema.parse(body);

    // Get subscription and verify ownership
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      select: {
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        currentPeriodEnd: true,
        deliverySchedule: true,
        status: true,
        userId: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Verify user owns this subscription
    if (subscription.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to modify this subscription" },
        { status: 403 }
      );
    }

    // Action-specific status checks
    if (action === "skip" && subscription.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Can only skip billing on active subscriptions" },
        { status: 400 }
      );
    }

    if (action === "resume" && subscription.status !== "PAUSED") {
      return NextResponse.json(
        { error: "Can only resume paused subscriptions" },
        { status: 400 }
      );
    }

    if (
      action === "cancel" &&
      subscription.status !== "ACTIVE" &&
      subscription.status !== "PAUSED"
    ) {
      return NextResponse.json(
        { error: "Can only cancel active or paused subscriptions" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Payments not configured" },
        { status: 503 }
      );
    }

    // Handle actions
    if (action === "cancel") {
      // Find and cancel all PENDING orders for this subscription
      const pendingOrders = await prisma.order.findMany({
        where: {
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          status: "PENDING",
        },
        include: {
          items: {
            include: {
              purchaseOption: {
                include: {
                  variant: true,
                },
              },
            },
          },
        },
      });

      console.log(
        `🔄 Canceling subscription - found ${pendingOrders.length} PENDING order(s)`
      );

      // Track refund results
      let refundedCount = 0;

      // Process each pending order: refund, cancel, restore inventory
      for (const order of pendingOrders) {
        try {
          // Process refund - 2 methods
          let refundProcessed = false;

          // Method 1: Use stored payment intent ID (primary - captured during checkout)
          if (order.stripePaymentIntentId) {
            try {
              await stripe.refunds.create({
                payment_intent: order.stripePaymentIntentId,
                reason: "requested_by_customer",
              });
              console.log(`💰 Refund processed for order ${order.id.slice(-8)} via payment intent`);
              refundProcessed = true;
              refundedCount++;
            } catch (refundError) {
              console.log(
                `⚠️ Payment intent refund failed for order ${order.id.slice(-8)}:`,
                refundError instanceof Error ? refundError.message : "Unknown error"
              );
            }
          }

          // Method 2: Fallback - look up charges by customer ID and match by amount
          if (!refundProcessed && subscription.stripeCustomerId) {
            try {
              console.log(`🔍 Looking up charges for customer ${subscription.stripeCustomerId.slice(-8)}...`);
              const charges = await stripe.charges.list({
                customer: subscription.stripeCustomerId,
                limit: 10,
              });

              // Find a charge matching the order amount that hasn't been refunded
              const matchingCharge = charges.data.find(
                (c) =>
                  c.amount === order.totalInCents &&
                  !c.refunded &&
                  c.status === "succeeded"
              );

              if (matchingCharge) {
                await stripe.refunds.create({
                  charge: matchingCharge.id,
                  reason: "requested_by_customer",
                });
                console.log(`💰 Refund processed for order ${order.id.slice(-8)} via customer charge lookup`);
                refundProcessed = true;
                refundedCount++;
              } else {
                console.log(`⚠️ No matching unrefunded charge found for order ${order.id.slice(-8)}`);
              }
            } catch (refundError) {
              console.log(
                `⚠️ Customer charge lookup failed for order ${order.id.slice(-8)}:`,
                refundError instanceof Error ? refundError.message : "Unknown error"
              );
            }
          }

          if (!refundProcessed) {
            console.log(`⚠️ No refund method available for order ${order.id.slice(-8)}`);
          }

          // Cancel the order
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });
          console.log(`✅ Order ${order.id.slice(-8)} canceled`);

          // Restore inventory
          for (const item of order.items) {
            await prisma.productVariant.update({
              where: { id: item.purchaseOption.variant.id },
              data: { stockQuantity: { increment: item.quantity } },
            });
            console.log(
              `📈 Restored ${item.quantity} stock for variant ${item.purchaseOption.variant.id.slice(-8)}`
            );
          }
        } catch (orderCancelError) {
          console.error(
            `❌ Failed to cancel order ${order.id.slice(-8)}:`,
            orderCancelError
          );
        }
      }

      // Cancel the subscription immediately in Stripe
      console.log("🔄 Canceling subscription in Stripe...");
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      // Update local database
      await prisma.subscription.update({
        where: { id },
        data: {
          status: "CANCELED",
          cancelAtPeriodEnd: false,
          canceledAt: new Date(),
        },
      });

      console.log("✅ Subscription canceled");

      return NextResponse.json({
        success: true,
        message: `Subscription canceled. ${pendingOrders.length} order(s) canceled, ${refundedCount} refunded.`,
        canceledOrders: pendingOrders.length,
        refundedOrders: refundedCount,
      });
    }

    if (action === "skip") {
      const resumesAt = calculateNextPeriodTimestamp(
        subscription.currentPeriodEnd,
        subscription.deliverySchedule
      );

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        pause_collection: {
          behavior: "void",
          resumes_at: resumesAt,
        },
      });

      await prisma.subscription.update({
        where: { id },
        data: {
          status: "PAUSED",
          pausedUntil: new Date(resumesAt * 1000),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Next billing period will be skipped",
        resumesAt: new Date(resumesAt * 1000).toISOString(),
      });
    }

    if (action === "resume") {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        pause_collection: "",
      });

      await prisma.subscription.update({
        where: { id },
        data: {
          status: "ACTIVE",
          pausedUntil: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Subscription has been resumed",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("User subscription action error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to perform subscription action" },
      { status: 500 }
    );
  }
}
