"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/app/(site)/_components/product/StarRating";
import { BrewMethodBadge } from "@/app/(site)/_components/review/BrewMethodBadge";
import {
  RowActionMenu,
  type RowActionItem,
} from "@/app/admin/_components/data-table/RowActionMenu";
import { formatDistanceToNow } from "date-fns";
import type { AdminReview } from "../hooks/useReviewsTable";

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FLAGGED: "bg-amber-50 text-amber-700 border-amber-200",
  PENDING: "bg-blue-50 text-blue-700 border-blue-200",
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
      <CardContent className="px-4 py-2 space-y-2">
        {/* Header: status badge, date, stars, actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_BADGE_CLASSES[review.status] ?? ""}`}
            >
              {review.status.charAt(0) + review.status.slice(1).toLowerCase()}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(review.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <RowActionMenu items={actionItems} />
        </div>

        <StarRating rating={review.rating} size="sm" />

        {/* Product name */}
        <p className="font-medium text-sm">{review.product.name}</p>

        {/* Customer name + email */}
        <p className="text-xs text-muted-foreground">
          {customerDisplay}
          {review.user.email ? ` · ${review.user.email}` : ""}
        </p>

        {/* Title */}
        {review.title && (
          <p className="font-medium text-sm italic">
            &ldquo;{review.title}&rdquo;
          </p>
        )}

        {/* Brew method badge (storefront style) */}
        {review.brewMethod && (
          <div>
            <BrewMethodBadge method={review.brewMethod} />
          </div>
        )}

        {/* Tasting notes chips (storefront style) */}
        {review.tastingNotes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {review.tastingNotes.map((note) => (
              <span
                key={note}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border border-border text-muted-foreground"
              >
                {note}
              </span>
            ))}
          </div>
        )}

        {/* Review content */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {review.content}
        </p>

        {/* Flag reason */}
        {(review.status === "FLAGGED" || review.status === "PENDING") &&
          review.flagReason && (
            <p
              className={`text-xs font-medium ${review.status === "FLAGGED" ? "text-amber-600" : "text-blue-600"}`}
            >
              {review.status === "PENDING" ? "Pending:" : "Flagged:"}{" "}
              {review.flagReason}
            </p>
          )}

        {/* Admin response */}
        {review.adminResponse && (
          <p className="text-xs text-muted-foreground border-l-2 border-border pl-2">
            <span className="font-medium">Store Reply:</span>{" "}
            {review.adminResponse}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
