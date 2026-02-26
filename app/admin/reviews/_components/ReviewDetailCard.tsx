"use client";

import { cn } from "@/lib/utils";
import type { AdminReview } from "../hooks/useReviewsTable";

const BREW_METHOD_LABELS: Record<string, string> = {
  POUR_OVER_V60: "V60 Pour Over",
  CHEMEX: "Chemex",
  AEROPRESS: "AeroPress",
  FRENCH_PRESS: "French Press",
  ESPRESSO: "Espresso",
  MOKA_POT: "Moka Pot",
  COLD_BREW: "Cold Brew",
  DRIP_MACHINE: "Drip Machine",
  SIPHON: "Siphon",
  TURKISH: "Turkish",
  OTHER: "Other",
};

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
      {review.brewMethod && (
        <p className="text-muted-foreground">
          <span className="mr-1">&#9749;</span>
          {BREW_METHOD_LABELS[review.brewMethod] ?? review.brewMethod}
        </p>
      )}
      {review.tastingNotes.length > 0 && (
        <p className="text-muted-foreground">
          {review.tastingNotes.join(" \u00B7 ")}
        </p>
      )}
      {(review.grindSize || review.waterTempF || review.ratio) && (
        <p className="text-xs text-muted-foreground">
          {[
            review.grindSize,
            review.ratio,
            review.waterTempF ? `${review.waterTempF}\u00B0F` : null,
          ]
            .filter(Boolean)
            .join(" \u00B7 ")}
        </p>
      )}
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
