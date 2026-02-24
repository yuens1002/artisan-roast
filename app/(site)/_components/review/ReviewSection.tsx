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
    ratingDistribution: Record<string, number>;
    total: number;
  } | null>(null);

  const handleDistributionLoad = useCallback(
    (data: { ratingDistribution: Record<string, number>; total: number }) => {
      setDistributionData(data);
    },
    []
  );

  const breakdownProps = distributionData
    ? {
        averageRating,
        totalCount: distributionData.total,
        distribution: distributionData.ratingDistribution,
      }
    : null;

  return (
    <section className="mt-8">
      <Separator className="mb-8" />
      <h2
        id="reviews"
        className="text-2xl font-bold text-text-base mb-6 scroll-mt-20"
      >
        {heading} {reviewCount > 0 && `(${reviewCount})`}
      </h2>

      <div className="lg:grid lg:grid-cols-[minmax(0,_700px)_1fr] lg:gap-10">
        {/* Stacked breakdown on small/medium screens (left-aligned) */}
        {breakdownProps && (
          <div className="mb-6 max-w-xs lg:hidden">
            <RatingBreakdown {...breakdownProps} />
          </div>
        )}

        {/* Review list (left column, max-width constrained) */}
        <div className="min-w-0">
          <ReviewList
            productId={productId}
            onDistributionLoad={handleDistributionLoad}
          />
        </div>

        {/* lg+: sticky sidebar (centered in column) */}
        {breakdownProps && (
          <aside className="hidden lg:flex lg:justify-center">
            <div className="sticky top-24 w-full max-w-[240px]">
              <RatingBreakdown {...breakdownProps} centered />
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
