"use client";

import { Separator } from "@/components/ui/separator";
import { ReviewList } from "./ReviewList";

interface ReviewSectionProps {
  productId: string;
  reviewCount: number;
  isCoffee?: boolean;
}

export function ReviewSection({ productId, reviewCount, isCoffee = true }: ReviewSectionProps) {
  const heading = isCoffee ? "Community Brew Reports" : "Reviews";

  return (
    <section className="mt-8">
      <Separator className="mb-8" />
      <h2
        id="reviews"
        className="text-2xl font-bold text-text-base mb-6 scroll-mt-20"
      >
        {heading} {reviewCount > 0 && `(${reviewCount})`}
      </h2>
      <div className="max-w-3xl">
        <ReviewList productId={productId} />
      </div>
    </section>
  );
}
