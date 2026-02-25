"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/app/(site)/_components/product/StarRating";
import {
  RowActionMenu,
  type RowActionItem,
} from "@/app/admin/_components/data-table/RowActionMenu";
import { formatDistanceToNow } from "date-fns";
import { ReviewDetailCard } from "./ReviewDetailCard";
import type { AdminReview } from "../hooks/useReviewsTable";

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FLAGGED: "bg-amber-50 text-amber-700 border-amber-200",
  REMOVED: "bg-red-50 text-red-700 border-red-200",
};

interface ReviewCardProps {
  review: AdminReview;
  actionItems: RowActionItem[];
}

export function ReviewCard({ review, actionItems }: ReviewCardProps) {
  const customerDisplay =
    review.user.name ?? review.user.email?.split("@")[0] ?? "Unknown";

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StarRating rating={review.rating} size="sm" />
            <span
              className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_BADGE_CLASSES[review.status] ?? ""}`}
            >
              {review.status.charAt(0) + review.status.slice(1).toLowerCase()}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(review.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <p className="font-medium text-sm">{review.product.name}</p>
        <p className="text-xs text-muted-foreground">
          {customerDisplay}
          {review.user.email ? ` \u00B7 ${review.user.email}` : ""}
        </p>
        <ReviewDetailCard review={review} compact />
        <div className="flex justify-end">
          <RowActionMenu items={actionItems} />
        </div>
      </CardContent>
    </Card>
  );
}
