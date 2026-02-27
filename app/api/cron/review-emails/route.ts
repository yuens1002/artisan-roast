import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReviewRequest } from "@/lib/email/send-review-request";
import { getCronSecret } from "@/lib/config/app-settings";

export const dynamic = "force-dynamic";

const DEFAULT_DELAY_DAYS = 5;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const dbSecret = await getCronSecret();
  const cronSecret = dbSecret || process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if reviews are enabled
    const reviewsSetting = await prisma.siteSettings.findUnique({
      where: { key: "commerce.reviewsEnabled" },
    });
    if (reviewsSetting?.value === "false") {
      return NextResponse.json({
        success: true,
        message: "Reviews disabled",
        processed: 0,
        sent: 0,
        skipped: 0,
      });
    }

    // Get email delay days setting
    const delaySetting = await prisma.siteSettings.findUnique({
      where: { key: "commerce.reviewEmailDelayDays" },
    });
    const delayDays = delaySetting?.value
      ? parseInt(delaySetting.value, 10)
      : DEFAULT_DELAY_DAYS;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - delayDays);

    // Find eligible orders
    const eligibleOrders = await prisma.order.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: { lt: cutoffDate },
        userId: { not: null },
        user: { email: { not: null } },
        // No existing review email log for this order
        NOT: {
          id: {
            in: (
              await prisma.reviewEmailLog.findMany({
                select: { orderId: true },
                distinct: ["orderId"],
              })
            ).map((log) => log.orderId),
          },
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            purchaseOption: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: { id: true, name: true, slug: true, type: true },
                    },
                    images: { select: { url: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
      },
      take: 50,
    });

    let sent = 0;
    let skipped = 0;

    for (const order of eligibleOrders) {
      if (!order.user?.email || !order.userId) {
        skipped++;
        continue;
      }

      // Collect unique products from order items that user hasn't reviewed
      const productMap = new Map<
        string,
        { name: string; slug: string; imageUrl: string | null }
      >();

      for (const item of order.items) {
        const product = item.purchaseOption.variant.product;
        if (productMap.has(product.id)) continue;

        // Check if user already reviewed this product
        const existingReview = await prisma.review.findUnique({
          where: {
            productId_userId: {
              productId: product.id,
              userId: order.userId,
            },
          },
          select: { id: true },
        });

        if (!existingReview) {
          const image = item.purchaseOption.variant.images[0];
          productMap.set(product.id, {
            name: product.name,
            slug: product.slug,
            imageUrl: image?.url ?? null,
          });
        }
      }

      const unreviewedProducts = Array.from(productMap.entries());

      if (unreviewedProducts.length === 0) {
        skipped++;
        // Log to prevent re-processing
        for (const item of order.items) {
          const productId = item.purchaseOption.variant.product.id;
          await prisma.reviewEmailLog.upsert({
            where: {
              orderId_userId_productId: {
                orderId: order.id,
                userId: order.userId,
                productId,
              },
            },
            create: {
              orderId: order.id,
              userId: order.userId,
              productId,
            },
            update: {},
          });
        }
        continue;
      }

      // Send email
      await sendReviewRequest({
        customerEmail: order.user.email,
        customerName: order.user.name ?? "Coffee Lover",
        products: unreviewedProducts.map(([, p]) => p),
      });

      // Log sent emails
      for (const [productId] of unreviewedProducts) {
        await prisma.reviewEmailLog.create({
          data: {
            orderId: order.id,
            userId: order.userId,
            productId,
          },
        });
      }

      sent++;
    }

    return NextResponse.json({
      success: true,
      processed: eligibleOrders.length,
      sent,
      skipped,
    });
  } catch (error) {
    console.error("Review email cron error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
