import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { updateProductRatingSummary } from "@/lib/reviews/review-helpers";

const patchSchema = z.object({
  action: z.enum(["flag", "approve", "reply"]),
  reason: z.string().optional(),
  response: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { authorized, error } = await requireAdminApi();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { reviewId } = await params;

  try {
    const body = await request.json();
    const { action, reason, response } = patchSchema.parse(body);

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, productId: true, status: true },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (action === "flag") {
      await prisma.review.update({
        where: { id: reviewId },
        data: { status: "FLAGGED", flagReason: reason || null },
      });
    } else if (action === "approve") {
      await prisma.review.update({
        where: { id: reviewId },
        data: { status: "PUBLISHED", flagReason: null },
      });
    } else if (action === "reply") {
      await prisma.review.update({
        where: { id: reviewId },
        data: { adminResponse: response || null },
      });
    }

    await updateProductRatingSummary(review.productId);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: err.issues },
        { status: 400 }
      );
    }
    console.error("Failed to update review:", err);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { authorized, error } = await requireAdminApi();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { reviewId } = await params;

  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, productId: true },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    await prisma.review.delete({ where: { id: reviewId } });
    await updateProductRatingSummary(review.productId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete review:", err);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}
