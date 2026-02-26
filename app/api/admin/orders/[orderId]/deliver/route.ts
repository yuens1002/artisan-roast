import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { resend } from "@/lib/services/resend";
import { render } from "@react-email/components";
import { getEmailBranding } from "@/lib/config/app-settings";
import DeliveryConfirmationEmail from "@/emails/DeliveryConfirmationEmail";
import { format } from "date-fns";

/**
 * PATCH /api/admin/orders/[orderId]/deliver
 * Manually mark a SHIPPED order as delivered (fallback when carrier API is unavailable)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAdmin();
    const { orderId } = await params;

    // Validate order exists and is SHIPPED
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (existing.status !== "SHIPPED" && existing.status !== "OUT_FOR_DELIVERY") {
      return NextResponse.json(
        { error: "Only SHIPPED or OUT_FOR_DELIVERY orders can be marked as delivered" },
        { status: 400 }
      );
    }

    const deliveredAt = new Date();

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "DELIVERED",
        deliveredAt,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    // Send delivery confirmation email
    try {
      if (order.customerEmail) {
        const { storeName, logoUrl } = await getEmailBranding();

        const emailHtml = await render(
          DeliveryConfirmationEmail({
            orderNumber: order.id.slice(-8),
            customerName:
              order.user?.name || order.recipientName || "Customer",
            orderId: order.id,
            deliveredAt: format(deliveredAt, "MMMM d, yyyy 'at' h:mm a"),
            storeName,
            logoUrl,
          })
        );

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: order.customerEmail,
          subject: `Your order #${order.id.slice(-8)} has been delivered!`,
          html: emailHtml,
        });
      }
    } catch (emailError) {
      console.error("Failed to send delivery email:", emailError);
    }

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    console.error("Mark as delivered error:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to mark order as delivered" },
      { status: 500 }
    );
  }
}
