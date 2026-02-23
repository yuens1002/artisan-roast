import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { render } from "@react-email/components";
import { resend } from "@/lib/services/resend";
import { getCarrierClient } from "@/lib/services/carriers";
import DeliveryConfirmationEmail from "@/emails/DeliveryConfirmationEmail";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const CHUNK_SIZE = 10;

/**
 * GET /api/cron/check-deliveries
 * Daily cron job that checks SHIPPED orders for delivery status via carrier APIs.
 * When a package is detected as delivered, updates order to DELIVERED and sends email.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Load carrier API keys from SiteSettings
    const carrierSettings = await prisma.siteSettings.findMany({
      where: { key: { startsWith: "carrier_" } },
      select: { key: true, value: true },
    });

    const apiKeys: Record<string, string> = {};
    for (const setting of carrierSettings) {
      apiKeys[setting.key] = setting.value;
    }

    // Query SHIPPED and OUT_FOR_DELIVERY orders with tracking info
    const shippedOrders = await prisma.order.findMany({
      where: {
        status: { in: ["SHIPPED", "OUT_FOR_DELIVERY"] },
        trackingNumber: { not: null },
        carrier: { not: null },
      },
      include: {
        user: { select: { name: true } },
      },
    });

    if (shippedOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No shipped orders to check",
        checked: 0,
        delivered: 0,
      });
    }

    const storeNameSetting = await prisma.siteSettings.findUnique({
      where: { key: "store_name" },
    });
    const storeName = storeNameSetting?.value || "Artisan Roast";

    let checkedCount = 0;
    let deliveredCount = 0;
    const errors: string[] = [];

    // Process in chunks
    for (let i = 0; i < shippedOrders.length; i += CHUNK_SIZE) {
      const chunk = shippedOrders.slice(i, i + CHUNK_SIZE);

      await Promise.all(
        chunk.map(async (order) => {
          checkedCount++;

          const client = getCarrierClient(order.carrier!, apiKeys);
          if (!client) {
            errors.push(
              `No client for carrier ${order.carrier} (order ${order.id})`
            );
            return;
          }

          try {
            const result = await client.track(order.trackingNumber!);

            if (result.status === "delivered") {
              const deliveredAt = result.deliveredAt || new Date();

              await prisma.order.update({
                where: { id: order.id },
                data: {
                  status: "DELIVERED",
                  deliveredAt,
                },
              });

              deliveredCount++;

              // Send delivery confirmation email
              if (order.customerEmail) {
                try {
                  const emailHtml = await render(
                    DeliveryConfirmationEmail({
                      orderNumber: order.id.slice(-8),
                      customerName:
                        order.user?.name ||
                        order.recipientName ||
                        "Customer",
                      orderId: order.id,
                      deliveredAt: format(
                        deliveredAt,
                        "MMMM d, yyyy 'at' h:mm a"
                      ),
                      storeName,
                    })
                  );

                  await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL!,
                    to: order.customerEmail,
                    subject: `Your order #${order.id.slice(-8)} has been delivered!`,
                    html: emailHtml,
                  });
                } catch (emailErr) {
                  console.error(
                    `Failed to send delivery email for order ${order.id}:`,
                    emailErr
                  );
                }
              }
            } else if (
              result.status === "out_for_delivery" &&
              order.status === "SHIPPED"
            ) {
              await prisma.order.update({
                where: { id: order.id },
                data: { status: "OUT_FOR_DELIVERY" },
              });
            }
          } catch (trackErr) {
            errors.push(`Track error for order ${order.id}: ${trackErr}`);
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      checked: checkedCount,
      delivered: deliveredCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Check deliveries cron error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
