import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getResend } from "@/lib/services/resend";
import { render } from "@react-email/components";
import { getEmailBranding } from "@/lib/config/app-settings";
import PickupReadyEmail from "@/emails/PickupReadyEmail";

/**
 * PATCH /api/admin/orders/[orderId]/pickup
 * Mark order as picked up / ready for pickup
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAdmin();
    const { orderId } = await params;

    // Update order
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PICKED_UP",
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

    // Send pickup ready email
    try {
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
        PickupReadyEmail({
          orderNumber: order.id.slice(-8),
          customerName: order.user?.name || order.recipientName || "Customer",
          storeAddress: "123 Coffee Lane, Seattle, WA 98101",
          storeHours: "Mon-Fri: 7am-6pm, Sat-Sun: 8am-5pm",
          orderId: order.id,
          storeName,
          logoUrl,
        })
      );

      const resend = getResend();
      if (resend) await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: order.customerEmail,
        subject: `Your order #${order.id.slice(-8)} is ready for pickup!`,
        html: emailHtml,
      });

      console.log("📧 Pickup ready email sent");
    } catch (emailError) {
      console.error("Failed to send pickup email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: unknown) {
    console.error("Mark as picked up error:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to mark order as picked up" },
      { status: 500 }
    );
  }
}
