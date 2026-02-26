import { submitReview, voteHelpful } from "../review-actions";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { filterProfanity } from "@/lib/reviews/profanity-filter";
import { detectSpam } from "@/lib/reviews/spam-detector";
import { calculateCompletenessScore } from "@/lib/reviews/completeness-score";
import {
  getVerifiedPurchaseOrderId,
  updateProductRatingSummary,
  updateReviewHelpfulCount,
} from "@/lib/reviews/review-helpers";
import { getReviewsEnabled } from "@/lib/config/app-settings";
import { revalidatePath } from "next/cache";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    reviewVote: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock("@/lib/reviews/profanity-filter", () => ({
  filterProfanity: jest.fn(),
}));
jest.mock("@/lib/reviews/spam-detector", () => ({
  detectSpam: jest.fn(),
}));
jest.mock("@/lib/reviews/completeness-score", () => ({
  calculateCompletenessScore: jest.fn(),
}));
jest.mock("@/lib/reviews/review-helpers", () => ({
  getVerifiedPurchaseOrderId: jest.fn(),
  updateProductRatingSummary: jest.fn(),
  updateReviewHelpfulCount: jest.fn(),
}));
jest.mock("@/lib/config/app-settings", () => ({
  getReviewsEnabled: jest.fn(),
  getNotifyOnNewReview: jest.fn().mockResolvedValue(false),
}));
jest.mock("@/lib/email/send-new-review-notification", () => ({
  sendNewReviewNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as unknown as {
  review: { findUnique: jest.Mock; create: jest.Mock };
  reviewVote: { findUnique: jest.Mock; create: jest.Mock; delete: jest.Mock };
};
const mockFilterProfanity = filterProfanity as jest.Mock;
const mockDetectSpam = detectSpam as jest.Mock;
const mockCompletenessScore = calculateCompletenessScore as jest.Mock;
const mockGetVerifiedPurchaseOrderId = getVerifiedPurchaseOrderId as jest.Mock;
const mockUpdateProductRatingSummary = updateProductRatingSummary as jest.Mock;
const mockUpdateReviewHelpfulCount = updateReviewHelpfulCount as jest.Mock;
const mockGetReviewsEnabled = getReviewsEnabled as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

const validInput = {
  productId: "product-1",
  rating: 4,
  title: "Great coffee",
  content: "This is a wonderful coffee with rich flavors and good body.",
};

describe("submitReview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetReviewsEnabled.mockResolvedValue(true);
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockFilterProfanity.mockReturnValue({ clean: true, flaggedWords: [] });
    mockDetectSpam.mockReturnValue({ isSpam: false, reasons: [] });
    mockCompletenessScore.mockReturnValue(0.5);
    mockGetVerifiedPurchaseOrderId.mockResolvedValue("order-1");
    mockPrisma.review.create.mockResolvedValue({
      id: "review-1",
      product: { slug: "great-coffee" },
    });
  });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await submitReview(validInput);
    expect(result).toEqual({
      success: false,
      error: "You must be signed in to submit a review",
    });
  });

  it("rejects when reviews are disabled", async () => {
    mockGetReviewsEnabled.mockResolvedValue(false);
    const result = await submitReview(validInput);
    expect(result).toEqual({
      success: false,
      error: "Reviews are currently disabled",
    });
  });

  it("rejects invalid input", async () => {
    const result = await submitReview({
      ...validInput,
      rating: 0, // invalid
    });
    expect(result).toEqual({
      success: false,
      error: "Invalid review data",
    });
  });

  it("rejects duplicate review", async () => {
    mockPrisma.review.findUnique.mockResolvedValue({ id: "existing-review" });
    const result = await submitReview(validInput);
    expect(result).toEqual({
      success: false,
      error: "You have already reviewed this product",
    });
  });

  it("queues review with profanity as PENDING", async () => {
    mockFilterProfanity.mockReturnValue({ clean: false, flaggedWords: ["damn"] });
    const result = await submitReview(validInput);

    expect(mockPrisma.review.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        flagReason: expect.stringContaining("Profanity detected: damn"),
      }),
      select: expect.anything(),
    });
    expect(result).toEqual({ success: true, reviewId: "review-1" });
  });

  it("queues review with spam as PENDING", async () => {
    mockDetectSpam.mockReturnValue({ isSpam: true, reasons: ["Excessive URLs"] });
    const result = await submitReview(validInput);

    expect(mockPrisma.review.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        flagReason: expect.stringContaining("Excessive URLs"),
      }),
      select: expect.anything(),
    });
    expect(result).toEqual({ success: true, reviewId: "review-1" });
  });

  it("creates review with completeness score and verified purchase", async () => {
    const result = await submitReview(validInput);

    expect(mockGetVerifiedPurchaseOrderId).toHaveBeenCalledWith("user-1", "product-1");
    expect(mockCompletenessScore).toHaveBeenCalled();
    expect(mockPrisma.review.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        rating: 4,
        title: "Great coffee",
        content: validInput.content,
        status: "PUBLISHED",
        flagReason: null,
        completenessScore: 0.5,
        productId: "product-1",
        userId: "user-1",
        orderId: "order-1",
      }),
      select: { id: true, product: { select: { name: true, slug: true } } },
    });
    expect(mockUpdateProductRatingSummary).toHaveBeenCalledWith("product-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/products/great-coffee");
    expect(result).toEqual({ success: true, reviewId: "review-1" });
  });

  it("handles unverified purchase (orderId is null)", async () => {
    mockGetVerifiedPurchaseOrderId.mockResolvedValue(null);
    await submitReview(validInput);
    expect(mockPrisma.review.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ orderId: null }),
      select: expect.anything(),
    });
  });
});

describe("voteHelpful", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-2" } });
    mockPrisma.review.findUnique.mockResolvedValue({
      userId: "user-1",
      productId: "product-1",
      product: { slug: "great-coffee" },
    });
  });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await voteHelpful("review-1");
    expect(result).toEqual({
      success: false,
      error: "You must be signed in to vote",
    });
  });

  it("returns error for non-existent review", async () => {
    mockPrisma.review.findUnique.mockResolvedValue(null);
    const result = await voteHelpful("non-existent");
    expect(result).toEqual({
      success: false,
      error: "Review not found",
    });
  });

  it("prevents self-vote", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } }); // same as review author
    const result = await voteHelpful("review-1");
    expect(result).toEqual({
      success: false,
      error: "You cannot vote on your own review",
    });
  });

  it("creates vote when none exists", async () => {
    mockPrisma.reviewVote.findUnique.mockResolvedValue(null);
    const result = await voteHelpful("review-1");

    expect(mockPrisma.reviewVote.create).toHaveBeenCalledWith({
      data: { reviewId: "review-1", userId: "user-2" },
    });
    expect(mockUpdateReviewHelpfulCount).toHaveBeenCalledWith("review-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/products/great-coffee");
    expect(result).toEqual({ success: true });
  });

  it("removes vote when one exists (toggle off)", async () => {
    mockPrisma.reviewVote.findUnique.mockResolvedValue({ id: "vote-1" });
    const result = await voteHelpful("review-1");

    expect(mockPrisma.reviewVote.delete).toHaveBeenCalledWith({
      where: { id: "vote-1" },
    });
    expect(mockPrisma.reviewVote.create).not.toHaveBeenCalled();
    expect(mockUpdateReviewHelpfulCount).toHaveBeenCalledWith("review-1");
    expect(result).toEqual({ success: true });
  });
});
