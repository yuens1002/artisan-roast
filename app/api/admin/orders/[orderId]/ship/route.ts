import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getResend } from "@/lib/services/resend";
import { render } from "@react-email/components";
import { getEmailBranding } from "@/lib/config/app-settings";
import ShipmentConfirmationEmail from "@/emails/ShipmentConfirmationEmail";

/**
 * PATCH /api/admin/orders/[orderId]/ship
 * Mark order as shipped with tracking info
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAdmin();
    const { orderId } = await params;
    const body = await request.json();
    const { trackingNumber, carrier } = body;

    if (!trackingNumber || !carrier) {
      return NextResponse.json(
        { error: "Tracking number and carrier are required" },
        { status: 400 }
      );
    }

    // Check if this is an edit (order already shipped)
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    const isEdit =
      existing?.status === "SHIPPED" ||
      existing?.status === "OUT_FOR_DELIVERY" ||
      existing?.status === "DELIVERED";

    // Update order — preserve status and shippedAt when editing
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(!isEdit && { status: "SHIPPED", shippedAt: new Date() }),
        trackingNumber,
        carrier,
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

    // Send shipment confirmation email (skip for edits)
    if (!isEdit) try {
      if (!order.customerEmail) {
        console.warn("No customer email found for order", order.id);
        return NextResponse.json({
          success: true,
          order,
          warning: "Order updated but email not sent (no customer email)",
        });
      }

      const { storeName, logoUrl } = await getEmailBranding();

      const emailHtml = await render(
        ShipmentConfirmationEmail({
          orderNumber: order.id.slice(-8),
          customerName: order.user?.name || order.recipientName || "Customer",
          trackingNumber,
          carrier,
          estimatedDelivery: "3-5 business days",
          orderId: order.id,
          storeName,
          logoUrl,
        })
      );

      const resend = getResend();
      if (resend) await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: order.customerEmail,
        subject: `Your order #${order.id.slice(-8)} has shipped!`,
        html: emailHtml,
      });

      console.log("📧 Shipment confirmation email sent");
    } catch (emailError) {
      console.error("Failed to send shipment email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: unknown) {
    console.error("Mark as shipped error:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to mark order as shipped" },
      { status: 500 }
    );
  }
}
