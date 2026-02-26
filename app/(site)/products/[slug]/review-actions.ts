"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { filterProfanity } from "@/lib/reviews/profanity-filter";
import { detectSpam } from "@/lib/reviews/spam-detector";
import { calculateCompletenessScore } from "@/lib/reviews/completeness-score";
import {
  getVerifiedPurchaseOrderId,
  updateProductRatingSummary,
  updateReviewHelpfulCount,
} from "@/lib/reviews/review-helpers";
import {
  getReviewsEnabled,
  getNotifyOnNewReview,
} from "@/lib/config/app-settings";
import { sendNewReviewNotification } from "@/lib/email/send-new-review-notification";

const submitReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().min(10).max(5000),
  brewMethod: z.string().optional(),
  grindSize: z.string().max(100).optional(),
  waterTempF: z.number().int().min(100).max(220).optional(),
  ratio: z.string().max(50).optional(),
  tastingNotes: z.array(z.string()).max(10).optional(),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

type ActionResult = {
  success: boolean;
  error?: string;
  reviewId?: string;
};

export async function submitReview(
  input: SubmitReviewInput
): Promise<ActionResult> {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to submit a review" };
  }
  const userId = session.user.id;

  // Reviews enabled check
  const enabled = await getReviewsEnabled();
  if (!enabled) {
    return { success: false, error: "Reviews are currently disabled" };
  }

  // Validate input
  const parsed = submitReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid review data" };
  }
  const data = parsed.data;

  // Verified purchase check
  const orderId = await getVerifiedPurchaseOrderId(userId, data.productId);

  // Duplicate check
  const existing = await prisma.review.findUnique({
    where: {
      productId_userId: {
        productId: data.productId,
        userId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return {
      success: false,
      error: "You have already reviewed this product",
    };
  }

  // Profanity + spam check — queue as PENDING instead of rejecting
  const textToCheck = [data.title, data.content].filter(Boolean).join(" ");
  const profanityResult = filterProfanity(textToCheck);
  const spamResult = detectSpam(textToCheck);

  const flagReasons: string[] = [];
  if (!profanityResult.clean) {
    flagReasons.push(`Profanity detected: ${profanityResult.flaggedWords.join(", ")}`);
  }
  if (spamResult.isSpam) {
    flagReasons.push(...spamResult.reasons);
  }

  const isPending = flagReasons.length > 0;

  // Calculate completeness score
  const completenessScore = calculateCompletenessScore({
    content: data.content,
    title: data.title,
    rating: data.rating,
    brewMethod: data.brewMethod,
    tastingNotes: data.tastingNotes,
    grindSize: data.grindSize,
    waterTempF: data.waterTempF,
    ratio: data.ratio,
  });

  // Create review — PENDING if flagged, PUBLISHED otherwise
  const review = await prisma.review.create({
    data: {
      rating: data.rating,
      title: data.title ?? null,
      content: data.content,
      status: isPending ? "PENDING" : "PUBLISHED",
      flagReason: isPending ? flagReasons.join("; ") : null,
      brewMethod: data.brewMethod as never ?? null,
      grindSize: data.grindSize ?? null,
      waterTempF: data.waterTempF ?? null,
      ratio: data.ratio ?? null,
      tastingNotes: data.tastingNotes ?? [],
      completenessScore,
      productId: data.productId,
      userId,
      orderId,
    },
    select: { id: true, product: { select: { name: true, slug: true } } },
  });

  // Update product rating summary
  await updateProductRatingSummary(data.productId);

  // Revalidate product page
  revalidatePath(`/products/${review.product.slug}`);

  // Fire-and-forget admin notification email
  getNotifyOnNewReview().then((notify) => {
    if (notify) {
      sendNewReviewNotification({
        productName: review.product.name,
        reviewerName: session.user?.name ?? "Anonymous",
        rating: data.rating,
        isPending,
      }).catch((err) => console.error("Review notification email failed:", err));
    }
  });

  return { success: true, reviewId: review.id };
}

export async function voteHelpful(
  reviewId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to vote" };
  }
  const userId = session.user.id;

  // Get the review to check ownership
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { userId: true, productId: true, product: { select: { slug: true } } },
  });

  if (!review) {
    return { success: false, error: "Review not found" };
  }

  // Prevent self-vote
  if (review.userId === userId) {
    return { success: false, error: "You cannot vote on your own review" };
  }

  // Toggle vote (create or remove)
  const existingVote = await prisma.reviewVote.findUnique({
    where: {
      reviewId_userId: { reviewId, userId },
    },
  });

  if (existingVote) {
    await prisma.reviewVote.delete({
      where: { id: existingVote.id },
    });
  } else {
    await prisma.reviewVote.create({
      data: { reviewId, userId },
    });
  }

  // Update helpful count
  await updateReviewHelpfulCount(reviewId);

  revalidatePath(`/products/${review.product.slug}`);

  return { success: true };
}
