import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { stripe } from "@/lib/services/stripe";
import { resend } from "@/lib/services/resend";
import { render } from "@react-email/components";
import RefundNotificationEmail from "@/emails/RefundNotificationEmail";

/**
 * POST /api/admin/orders/[orderId]/refund
 * Issue a full or partial refund for an order via Stripe
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAdmin();

    const { orderId } = await params;
    const body = await request.json();
    const { amountInCents, reason, items } = body as {
      amountInCents: number;
      reason: string;
      items?: Array<{ orderItemId: string; quantity: number }>;
    };

    // Validate inputs
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Refund reason is required" },
        { status: 400 }
      );
    }

    if (
      typeof amountInCents !== "number" ||
      !Number.isInteger(amountInCents) ||
      amountInCents <= 0
    ) {
      return NextResponse.json(
        { error: "Refund amount must be a positive integer (in cents)" },
        { status: 400 }
      );
    }

    // Fetch the order with items for email breakdown
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            purchaseOption: {
              include: { variant: { include: { product: { select: { name: true } } } } }
            }
          }
        }
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Reject cancelled/failed orders
    if (order.status === "CANCELLED" || order.status === "FAILED") {
      return NextResponse.json(
        { error: "Cannot refund a cancelled or failed order" },
        { status: 400 }
      );
    }

    // Validate refund amount against remaining refundable
    const remainingRefundable =
      order.totalInCents - order.refundedAmountInCents;
    if (amountInCents > remainingRefundable) {
      return NextResponse.json(
        {
          error: `Refund amount exceeds remaining refundable amount ($${(remainingRefundable / 100).toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Require Stripe payment intent
    if (!order.stripePaymentIntentId) {
      return NextResponse.json(
        { error: "No payment found to refund" },
        { status: 400 }
      );
    }

    // Issue Stripe refund
    await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: amountInCents,
    });

    // Update order refund fields
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        refundedAmountInCents: { increment: amountInCents },
        refundedAt: new Date(),
        refundReason: reason.trim(),
      },
    });

    // Update per-item refunded quantities if provided
    if (items && Array.isArray(items) && items.length > 0) {
      await Promise.all(
        items.map((item) =>
          prisma.orderItem.update({
            where: { id: item.orderItemId },
            data: { refundedQuantity: { increment: item.quantity } },
          })
        )
      );
    }

    // Send refund notification email (non-blocking)
    try {
      if (order.customerEmail) {
        const [storeNameSetting, supportEmailSetting] = await Promise.all([
          prisma.siteSettings.findUnique({ where: { key: "store_name" } }),
          prisma.siteSettings.findUnique({ where: { key: "support_email" } }),
        ]);
        const storeName = storeNameSetting?.value || "Artisan Roast";
        const supportEmail =
          supportEmailSetting?.value || process.env.RESEND_FROM_EMAIL;

        const isFullRefund =
          updatedOrder.refundedAmountInCents >= order.totalInCents;

        // Build itemized breakdown for email
        const emailItems = order.items.map((item) => ({
          name: item.purchaseOption.variant.product.name,
          variant: item.purchaseOption.variant.name,
          quantity: item.quantity,
          amountFormatted: `$${((item.purchaseOption.priceInCents * item.quantity) / 100).toFixed(2)}`,
        }));

        // Calculate proportional tax refund
        const subtotal = order.items.reduce(
          (sum, item) => sum + item.purchaseOption.priceInCents * item.quantity, 0
        );
        const taxRefund = subtotal > 0 && order.taxAmountInCents > 0
          ? Math.round((amountInCents / (subtotal + order.taxAmountInCents)) * order.taxAmountInCents)
          : 0;
        const taxRefundFormatted = taxRefund > 0 ? `$${(taxRefund / 100).toFixed(2)}` : undefined;

        const emailHtml = await render(
          RefundNotificationEmail({
            orderNumber: order.id.slice(-8),
            customerName:
              order.user?.name || order.recipientName || "Customer",
            refundAmountFormatted: `$${(amountInCents / 100).toFixed(2)}`,
            isFullRefund,
            refundReason: reason.trim(),
            orderId: order.id,
            storeName,
            supportEmail,
            items: emailItems,
            taxRefundFormatted,
          })
        );

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: order.customerEmail,
          subject: `Refund processed for your order #${order.id.slice(-8)}`,
          html: emailHtml,
        });

        console.log("📧 Refund notification email sent");
      }
    } catch (emailError) {
      console.error("Failed to send refund notification email:", emailError);
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error: unknown) {
    console.error("Refund error:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
