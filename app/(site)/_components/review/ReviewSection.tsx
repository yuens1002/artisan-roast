"use client";

import { useState, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { ReviewList } from "./ReviewList";
import { RatingBreakdown } from "./RatingBreakdown";

interface ReviewSectionProps {
  productId: string;
  reviewCount: number;
  averageRating: number;
  isCoffee?: boolean;
}

export function ReviewSection({
  productId,
  reviewCount,
  averageRating,
  isCoffee = true,
}: ReviewSectionProps) {
  const heading = isCoffee ? "Community Brew Reports" : "Reviews";

  const [distributionData, setDistributionData] = useState<{
    ratingDistribution: Record<number, number>;
    total: number;
  } | null>(null);

  const handleDistributionLoad = useCallback(
    (data: { ratingDistribution: Record<number, number>; total: number }) => {
      setDistributionData(data);
    },
    []
  );

  const sidebar = distributionData && (
    <RatingBreakdown
      averageRating={averageRating}
      totalCount={distributionData.total}
      distribution={distributionData.ratingDistribution}
    />
  );

  return (
    <section className="mt-8">
      <Separator className="mb-8" />
      <h2
        id="reviews"
        className="text-2xl font-bold text-text-base mb-6 scroll-mt-20"
      >
        {heading} {reviewCount > 0 && `(${reviewCount})`}
      </h2>

      <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-10">
        {/* Mobile: breakdown stacks above list */}
        {sidebar && <div className="mb-6 lg:hidden">{sidebar}</div>}

        {/* Review list (left column) */}
        <div className="min-w-0">
          <ReviewList
            productId={productId}
            onDistributionLoad={handleDistributionLoad}
          />
        </div>

        {/* Desktop: sticky sidebar (right column) */}
        {sidebar && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">{sidebar}</div>
          </aside>
        )}
      </div>
    </section>
  );
}
