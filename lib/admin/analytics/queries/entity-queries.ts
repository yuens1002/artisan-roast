/**
 * Entity count queries for the dashboard overview.
 *
 * Products, users, newsletter, reviews — counts and summaries.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { DateRange } from "../time";

// ---------------------------------------------------------------------------
// Review summary
// ---------------------------------------------------------------------------

export interface ReviewsSummaryRaw {
  avgRating: number;
  pendingCount: number;
  total: number;
  topReviewed: { name: string; slug: string; count: number } | null;
}

export async function getReviewsSummary(
  range: DateRange
): Promise<ReviewsSummaryRaw> {
  const dateFilter = { gte: range.from, lt: range.to };

  const [ratingAgg, pendingCount, total, topReviewedGroup] = await Promise.all([
    prisma.review.aggregate({
      where: { createdAt: dateFilter },
      _avg: { rating: true },
    }),
    prisma.review.count({
      where: { status: "PENDING" },
    }),
    prisma.review.count({
      where: { createdAt: dateFilter },
    }),
    prisma.review.groupBy({
      by: ["productId"],
      where: { createdAt: dateFilter },
      _count: true,
      orderBy: { _count: { productId: "desc" } },
      take: 1,
    }),
  ]);

  let topReviewed: ReviewsSummaryRaw["topReviewed"] = null;
  if (topReviewedGroup.length > 0) {
    const product = await prisma.product.findUnique({
      where: { id: topReviewedGroup[0].productId },
      select: { name: true, slug: true },
    });
    if (product) {
      topReviewed = {
        name: product.name,
        slug: product.slug,
        count: topReviewedGroup[0]._count,
      };
    }
  }

  return {
    avgRating: ratingAgg._avg.rating ?? 0,
    pendingCount,
    total,
    topReviewed,
  };
}

// ---------------------------------------------------------------------------
// Entity counts
// ---------------------------------------------------------------------------

export interface EntityCounts {
  products: number;
  users: number;
  newUsers: number;
  newsletterActive: number;
}

export async function getEntityCounts(
  range: DateRange
): Promise<EntityCounts> {
  const dateFilter = { gte: range.from, lt: range.to };

  const [products, users, newUsers, newsletterActive] = await Promise.all([
    prisma.product.count(),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: dateFilter } }),
    prisma.newsletterSubscriber.count({ where: { isActive: true } }),
  ]);

  return { products, users, newUsers, newsletterActive };
}

// ---------------------------------------------------------------------------
// Customer split: new (1 order) vs repeat (2+ orders)
// ---------------------------------------------------------------------------

export interface CustomerSplitRaw {
  newCustomers: number;
  repeatCustomers: number;
}

export async function getCustomerSplit(
  where: Prisma.OrderWhereInput
): Promise<CustomerSplitRaw> {
  // Get order counts per user within the period
  const userOrders = await prisma.order.groupBy({
    by: ["userId"],
    where,
    _count: true,
  });

  let newCustomers = 0;
  let repeatCustomers = 0;

  for (const uo of userOrders) {
    if (uo._count >= 2) {
      repeatCustomers += 1;
    } else {
      newCustomers += 1;
    }
  }

  return { newCustomers, repeatCustomers };
}
