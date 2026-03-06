"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { ChartCard, ChartCardLinkAction } from "../analytics/ChartCard";
import { Badge } from "@/components/ui/badge";
import type { DashboardResponse } from "@/lib/admin/analytics/contracts";

type ReviewsSummary = DashboardResponse["reviewsSummary"];

interface ReviewsSummarySectionProps {
  data: ReviewsSummary;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export function ReviewsSummarySection({ data }: ReviewsSummarySectionProps) {
  if (data.total === 0) {
    return (
      <ChartCard title="Reviews" titleIcon={Star} description="Ratings & recent feedback">
        <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
          No reviews yet
        </div>
      </ChartCard>
    );
  }

  const maxStarCount = Math.max(...data.starBreakdown.map((s) => s.count), 1);

  return (
    <ChartCard
      title="Reviews"
      titleIcon={Star}
      description="Ratings & recent feedback"
      action={<ChartCardLinkAction href="/admin/reviews" />}
    >
      <div className="space-y-4">
        {/* Average rating + total */}
        <div className="flex items-center gap-2">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < Math.round(data.avgRating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <span className="text-lg font-semibold">
            {data.avgRating.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">
            ({data.total} reviews)
          </span>
        </div>

        {/* Star breakdown bars */}
        <div className="space-y-1.5">
          {data.starBreakdown.map((star) => {
            const pct = data.total > 0 ? (star.count / data.total) * 100 : 0;
            const barWidth = (star.count / maxStarCount) * 100;
            return (
              <div key={star.rating} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground tabular-nums">
                  {star.rating}
                </span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground tabular-nums">
                  {star.count}
                </span>
                <span className="w-10 text-right text-muted-foreground text-xs">
                  ({pct.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {data.statusCounts.published > 0 && (
            <Link href="/admin/reviews?status=PUBLISHED">
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-secondary/80"
              >
                Published: {data.statusCounts.published}
              </Badge>
            </Link>
          )}
          {data.statusCounts.pending > 0 && (
            <Link href="/admin/reviews?status=PENDING">
              <Badge
                variant="outline"
                className="text-xs cursor-pointer border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
              >
                Pending: {data.statusCounts.pending}
              </Badge>
            </Link>
          )}
          {data.statusCounts.flagged > 0 && (
            <Link href="/admin/reviews?status=FLAGGED">
              <Badge
                variant="outline"
                className="text-xs cursor-pointer border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                Flagged: {data.statusCounts.flagged}
              </Badge>
            </Link>
          )}
        </div>

        {/* Latest review */}
        {data.latestReview && (
          <div className="pt-4 border-t border-border/50 space-y-1 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Latest
              </span>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < data.latestReview!.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            {data.latestReview.title && (
              <p className="text-sm font-medium line-clamp-1">
                &ldquo;{data.latestReview.title}&rdquo;
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {data.latestReview.userName ?? "Anonymous"} on{" "}
              <Link
                href={`/admin/products/${data.latestReview.productSlug}`}
                className="hover:underline"
              >
                {data.latestReview.productName}
              </Link>
              {" "}— {timeAgo(data.latestReview.createdAt)}
            </p>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
