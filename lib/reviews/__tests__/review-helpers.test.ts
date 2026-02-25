import {
  getVerifiedPurchaseOrderId,
  updateProductRatingSummary,
  updateReviewHelpfulCount,
} from "../review-helpers";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findFirst: jest.fn() },
    review: { aggregate: jest.fn(), update: jest.fn() },
    reviewVote: { count: jest.fn() },
    product: { update: jest.fn() },
  },
}));

// Cast to access mock methods
const mockPrisma = prisma as unknown as {
  order: { findFirst: jest.Mock };
  review: { aggregate: jest.Mock; update: jest.Mock };
  reviewVote: { count: jest.Mock };
  product: { update: jest.Mock };
};

describe("review-helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getVerifiedPurchaseOrderId", () => {
    it("returns orderId for shipped order", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: "order-1" });

      const result = await getVerifiedPurchaseOrderId("user-1", "product-1");

      expect(result).toBe("order-1");
      expect(mockPrisma.order.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          status: { in: ["SHIPPED", "PICKED_UP"] },
          items: {
            some: {
              purchaseOption: {
                variant: {
                  productId: "product-1",
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
    });

    it("returns null when no order found", async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const result = await getVerifiedPurchaseOrderId("user-1", "product-1");

      expect(result).toBeNull();
    });
  });

  describe("updateProductRatingSummary", () => {
    it("computes average and count of published reviews", async () => {
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { rating: 10 },
      });
      mockPrisma.product.update.mockResolvedValue({});

      await updateProductRatingSummary("product-1");

      expect(mockPrisma.review.aggregate).toHaveBeenCalledWith({
        where: { productId: "product-1", status: { in: ["PUBLISHED", "FLAGGED"] } },
        _avg: { rating: true },
        _count: { rating: true },
      });
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: "product-1" },
        data: {
          averageRating: 4.5,
          reviewCount: 10,
        },
      });
    });

    it("sets averageRating to null when no reviews", async () => {
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: { rating: 0 },
      });
      mockPrisma.product.update.mockResolvedValue({});

      await updateProductRatingSummary("product-1");

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: "product-1" },
        data: {
          averageRating: null,
          reviewCount: 0,
        },
      });
    });
  });

  describe("updateReviewHelpfulCount", () => {
    it("counts votes and updates review", async () => {
      mockPrisma.reviewVote.count.mockResolvedValue(5);
      mockPrisma.review.update.mockResolvedValue({});

      await updateReviewHelpfulCount("review-1");

      expect(mockPrisma.reviewVote.count).toHaveBeenCalledWith({
        where: { reviewId: "review-1" },
      });
      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: "review-1" },
        data: { helpfulCount: 5 },
      });
    });
  });
});
