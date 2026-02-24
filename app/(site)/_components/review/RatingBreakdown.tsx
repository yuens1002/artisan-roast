"use client";

import { cn } from "@/lib/utils";
import { StarRating } from "@/app/(site)/_components/product/StarRating";

interface RatingBreakdownProps {
  averageRating: number;
  totalCount: number;
  distribution: Record<string, number>;
  centered?: boolean;
}

export function RatingBreakdown({
  averageRating,
  totalCount,
  distribution,
  centered,
}: RatingBreakdownProps) {
  return (
    <div className="space-y-3">
      {/* Average + stars */}
      <div className={cn(centered && "flex flex-col items-center")}>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-text-base">
            {averageRating.toFixed(1)}
          </span>
          <StarRating rating={averageRating} size="sm" />
        </div>
        <p className="text-sm text-text-muted mt-0.5">
          Based on {totalCount} {totalCount === 1 ? "review" : "reviews"}
        </p>
      </div>

      {/* Bar chart: 5 → 1 */}
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[String(star)] ?? 0;
          const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-7 text-right text-text-muted">{star} ★</span>
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                {pct > 0 && (
                  <div
                    className="h-full rounded-full bg-star"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <span className="w-9 text-right text-xs text-text-muted">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
