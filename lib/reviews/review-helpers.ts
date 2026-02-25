import { prisma } from "@/lib/prisma";

/**
 * Check if a user has purchased a product (SHIPPED or PICKED_UP order).
 * Returns the orderId if verified, null otherwise.
 */
export async function getVerifiedPurchaseOrderId(
  userId: string,
  productId: string
): Promise<string | null> {
  const order = await prisma.order.findFirst({
    where: {
      userId,
      status: { in: ["SHIPPED", "PICKED_UP"] },
      items: {
        some: {
          purchaseOption: {
            variant: {
              productId,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return order?.id ?? null;
}

/**
 * Recompute and update the average rating and review count on a Product.
 */
export async function updateProductRatingSummary(
  productId: string
): Promise<void> {
  const aggregate = await prisma.review.aggregate({
    where: { productId, status: { in: ["PUBLISHED", "FLAGGED"] } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageRating: aggregate._avg.rating
        ? Math.round(aggregate._avg.rating * 10) / 10
        : null,
      reviewCount: aggregate._count.rating,
    },
  });
}

/**
 * Update the helpfulCount on a Review based on actual vote count.
 */
export async function updateReviewHelpfulCount(
  reviewId: string
): Promise<void> {
  const count = await prisma.reviewVote.count({
    where: { reviewId },
  });

  await prisma.review.update({
    where: { id: reviewId },
    data: { helpfulCount: count },
  });
}
