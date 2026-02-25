import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getReviewsEnabled } from "@/lib/config/app-settings";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 10;

type SortOption = "recent" | "helpful" | "detailed";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    // Check if reviews are enabled
    const enabled = await getReviewsEnabled();
    if (!enabled) {
      return NextResponse.json({ reviews: [], total: 0, page: 1, pageSize: PAGE_SIZE });
    }

    // Parse query params
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const sort: SortOption = (["recent", "helpful", "detailed"] as const).includes(
      searchParams.get("sort") as SortOption
    )
      ? (searchParams.get("sort") as SortOption)
      : "recent";
    const brewMethod = searchParams.get("brewMethod") ?? undefined;

    // Build where clause — include FLAGGED (shown with warning) but not PENDING
    const where: Prisma.ReviewWhereInput = {
      productId,
      status: { in: ["PUBLISHED", "FLAGGED"] },
      ...(brewMethod ? { brewMethod: brewMethod as never } : {}),
    };

    // Build orderBy
    let orderBy: Prisma.ReviewOrderByWithRelationInput;
    switch (sort) {
      case "helpful":
        orderBy = { helpfulCount: "desc" };
        break;
      case "detailed":
        orderBy = { completenessScore: "desc" };
        break;
      case "recent":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    // Get current user for vote status
    const session = await auth();
    const userId = session?.user?.id;

    // Fetch reviews + total count + brew method counts + rating distribution
    const [reviews, total, brewMethodGroups, ratingGroups] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          rating: true,
          title: true,
          content: true,
          status: true,
          flagReason: true,
          adminResponse: true,
          brewMethod: true,
          grindSize: true,
          waterTempF: true,
          ratio: true,
          tastingNotes: true,
          completenessScore: true,
          helpfulCount: true,
          createdAt: true,
          orderId: true,
          order: {
            select: {
              items: {
                where: {
                  purchaseOption: {
                    variant: { productId },
                  },
                },
                take: 1,
                select: {
                  purchaseOption: {
                    select: {
                      variant: {
                        select: { name: true },
                      },
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          ...(userId
            ? {
                votes: {
                  where: { userId },
                  select: { id: true },
                },
              }
            : {}),
        },
      }),
      prisma.review.count({ where }),
      prisma.review.groupBy({
        by: ["brewMethod"],
        where: { productId, status: { in: ["PUBLISHED", "FLAGGED"] }, brewMethod: { not: null } },
        _count: true,
      }),
      prisma.review.groupBy({
        by: ["rating"],
        where: { productId, status: { in: ["PUBLISHED", "FLAGGED"] } },
        _count: true,
      }),
    ]);

    // Build brew method counts map
    const brewMethodCounts: Record<string, number> = {};
    for (const group of brewMethodGroups) {
      if (group.brewMethod) {
        brewMethodCounts[group.brewMethod] = group._count;
      }
    }

    // Build rating distribution: { 1: count, 2: count, ..., 5: count }
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const group of ratingGroups) {
      ratingDistribution[group.rating] = group._count;
    }

    // Map results — add userVoted boolean, isVerifiedPurchase, and variantName
    const mapped = reviews.map((review) => {
      const variantName = review.order?.items?.[0]?.purchaseOption?.variant?.name ?? null;
      return {
        id: review.id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        status: review.status,
        flagReason: review.flagReason,
        adminResponse: review.adminResponse,
        brewMethod: review.brewMethod,
        grindSize: review.grindSize,
        waterTempF: review.waterTempF,
        ratio: review.ratio,
        tastingNotes: review.tastingNotes,
        completenessScore: review.completenessScore,
        helpfulCount: review.helpfulCount,
        createdAt: review.createdAt,
        isVerifiedPurchase: review.orderId !== null,
        variantName,
        user: {
          name: review.user.name,
          image: review.user.image,
        },
        userVoted: userId
          ? (review as Record<string, unknown>).votes
            ? ((review as Record<string, unknown>).votes as unknown[]).length > 0
            : false
          : false,
      };
    });

    return NextResponse.json({
      reviews: mapped,
      total,
      page,
      pageSize: PAGE_SIZE,
      brewMethodCounts,
      ratingDistribution,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
