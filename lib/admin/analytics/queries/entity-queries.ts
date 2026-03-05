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

export interface StarBreakdownItem {
  rating: number;
  count: number;
}

export interface ReviewStatusCounts {
  published: number;
  pending: number;
  flagged: number;
}

export interface LatestReviewRaw {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  createdAt: string;
  status: string;
  userName: string | null;
  productName: string;
  productSlug: string;
}

export interface ReviewsSummaryRaw {
  avgRating: number;
  pendingCount: number;
  total: number;
  topReviewed: { name: string; slug: string; count: number } | null;
  starBreakdown: StarBreakdownItem[];
  statusCounts: ReviewStatusCounts;
  latestReview: LatestReviewRaw | null;
}

export async function getReviewsSummary(
  range: DateRange
): Promise<ReviewsSummaryRaw> {
  const dateFilter = { gte: range.from, lt: range.to };

  const [
    ratingAgg,
    pendingCount,
    total,
    topReviewedGroup,
    starBreakdownRaw,
    publishedCount,
    flaggedCount,
    latestReviewRow,
  ] = await Promise.all([
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
    prisma.review.groupBy({
      by: ["rating"],
      where: { createdAt: dateFilter },
      _count: true,
      orderBy: { rating: "desc" },
    }),
    prisma.review.count({
      where: { createdAt: dateFilter, status: "PUBLISHED" },
    }),
    prisma.review.count({
      where: { createdAt: dateFilter, status: "FLAGGED" },
    }),
    prisma.review.findFirst({
      where: { createdAt: dateFilter },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        title: true,
        content: true,
        createdAt: true,
        status: true,
        user: { select: { name: true } },
        product: { select: { name: true, slug: true } },
      },
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

  // Build star breakdown (ensure all 5 ratings present, desc order)
  const starMap = new Map(starBreakdownRaw.map((s) => [s.rating, s._count]));
  const starBreakdown: StarBreakdownItem[] = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: starMap.get(r) ?? 0,
  }));

  // Build latest review
  const latestReview: LatestReviewRaw | null = latestReviewRow
    ? {
        id: latestReviewRow.id,
        rating: latestReviewRow.rating,
        title: latestReviewRow.title,
        content: latestReviewRow.content,
        createdAt: latestReviewRow.createdAt.toISOString(),
        status: latestReviewRow.status,
        userName: latestReviewRow.user.name,
        productName: latestReviewRow.product.name,
        productSlug: latestReviewRow.product.slug,
      }
    : null;

  return {
    avgRating: ratingAgg._avg.rating ?? 0,
    pendingCount,
    total,
    topReviewed,
    starBreakdown,
    statusCounts: {
      published: publishedCount,
      pending: pendingCount,
      flagged: flaggedCount,
    },
    latestReview,
  };
}

// ---------------------------------------------------------------------------
// Entity counts
// ---------------------------------------------------------------------------

export interface EntityCounts {
  products: number;
  coffeeProducts: number;
  merchProducts: number;
  users: number;
  newUsers: number;
  newsletterActive: number;
  newsletterTotal: number;
}

export async function getEntityCounts(
  range: DateRange
): Promise<EntityCounts> {
  const dateFilter = { gte: range.from, lt: range.to };

  const [products, coffeeProducts, merchProducts, users, newUsers, newsletterActive, newsletterTotal] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { type: "COFFEE" } }),
    prisma.product.count({ where: { type: "MERCH" } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: dateFilter } }),
    prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    prisma.newsletterSubscriber.count(),
  ]);

  return { products, coffeeProducts, merchProducts, users, newUsers, newsletterActive, newsletterTotal };
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
