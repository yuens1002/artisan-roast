import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getResend } from "@/lib/services/resend";
import { render } from "@react-email/components";
import { getEmailBranding } from "@/lib/config/app-settings";
import FailedOrderNotification from "@/emails/FailedOrderNotification";

/**
 * PATCH /api/admin/orders/[orderId]/fail
 * Mark order as failed with a reason and notify the customer
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAdmin();
    const { orderId } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Failure reason is required" },
        { status: 400 }
      );
    }

    // Update order
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "FAILED",
        failureReason: reason.trim(),
        failedAt: new Date(),
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
        user: true,
      },
    });

    // Send failure notification email
    try {
      if (!order.customerEmail) {
        console.warn("No customer email found for order", order.id);
        return NextResponse.json({
          success: true,
          order,
          warning: "Order updated but email not sent (no customer email)",
        });
      }

      const [{ storeName, logoUrl }, supportEmailSetting] = await Promise.all([
        getEmailBranding(),
        prisma.siteSettings.findUnique({ where: { key: "support_email" } }),
      ]);
      const supportEmail =
        supportEmailSetting?.value || process.env.RESEND_FROM_EMAIL;

      const emailHtml = await render(
        FailedOrderNotification({
          orderNumber: order.id.slice(-8),
          customerName: order.user?.name || order.recipientName || "Customer",
          failureReason: reason.trim(),
          orderId: order.id,
          storeName,
          logoUrl,
          supportEmail,
        })
      );

      const resend = getResend();
      if (resend) await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: order.customerEmail,
        subject: `Issue with your order #${order.id.slice(-8)}`,
        html: emailHtml,
      });

      console.log("📧 Failed order notification email sent");
    } catch (emailError) {
      console.error("Failed to send failure notification email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: unknown) {
    console.error("Mark as failed error:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to mark order as failed" },
      { status: 500 }
    );
  }
}
