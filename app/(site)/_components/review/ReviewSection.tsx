"use client";

import { Separator } from "@/components/ui/separator";
import { ReviewList } from "./ReviewList";

interface ReviewSectionProps {
  productId: string;
  reviewCount: number;
}

export function ReviewSection({ productId, reviewCount }: ReviewSectionProps) {
  return (
    <section className="mt-8">
      <Separator className="mb-8" />
      <h2
        id="reviews"
        className="text-2xl font-bold text-text-base mb-6 scroll-mt-20"
      >
        Brew Reports {reviewCount > 0 && `(${reviewCount})`}
      </h2>
      <ReviewList productId={productId} />
    </section>
  );
}
