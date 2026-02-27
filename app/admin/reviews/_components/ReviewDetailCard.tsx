"use client";

import { cn } from "@/lib/utils";
import type { AdminReview } from "../hooks/useReviewsTable";

interface ReviewDetailCardProps {
  review: AdminReview;
  compact?: boolean;
  className?: string;
}

export function ReviewDetailCard({
  review,
  compact = false,
  className,
}: ReviewDetailCardProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 text-sm", className)}>
      {review.title && (
        <p className="font-medium italic">&ldquo;{review.title}&rdquo;</p>
      )}
      <p
        className={cn(
          "text-muted-foreground",
          compact ? "line-clamp-3" : "max-h-64 overflow-y-auto"
        )}
      >
        {review.content}
      </p>
      {(review.status === "FLAGGED" || review.status === "PENDING") &&
        review.flagReason && (
          <p
            className={cn(
              "text-xs font-medium",
              review.status === "FLAGGED"
                ? "text-amber-600"
                : "text-blue-600"
            )}
          >
            {review.status === "PENDING" ? "Pending:" : "Flagged:"}{" "}
            {review.flagReason}
          </p>
        )}
      {review.adminResponse && (
        <p className="text-xs text-muted-foreground border-l-2 border-border pl-2">
          <span className="font-medium">Store Reply:</span>{" "}
          {review.adminResponse}
        </p>
      )}
    </div>
  );
}
