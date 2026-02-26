"use client";

import { useState, useCallback, useEffect, useTransition, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import { ReviewCard, type ReviewData } from "./ReviewCard";
import { BREW_METHOD_LABELS, type BrewMethodKey } from "@/lib/types/roaster-brew-guide";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { voteHelpful } from "@/app/(site)/products/[slug]/review-actions";

type SortOption = "recent" | "helpful" | "detailed";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Most Recent" },
  { value: "helpful", label: "Most Helpful" },
  { value: "detailed", label: "Most Detailed" },
];

interface ReviewListProps {
  productId: string;
  onDistributionLoad?: (data: { ratingDistribution: Record<string, number>; total: number }) => void;
}

interface ReviewsApiResponse {
  reviews: ReviewData[];
  total: number;
  page: number;
  pageSize: number;
  brewMethodCounts: Record<string, number>;
  ratingDistribution: Record<string, number>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ReviewList({ productId, onDistributionLoad }: ReviewListProps) {
  const [sort, setSort] = useState<SortOption>("recent");
  const [brewMethodFilter, setBrewMethodFilter] = useState<string | null>(null);
  const [isVoting, startVotingTransition] = useTransition();

  const getKey = (pageIndex: number, previousPageData: ReviewsApiResponse | null) => {
    if (previousPageData && previousPageData.reviews.length === 0) return null;
    const params = new URLSearchParams({
      page: String(pageIndex + 1),
      sort,
    });
    if (brewMethodFilter) params.set("brewMethod", brewMethodFilter);
    return `/api/reviews/${productId}?${params.toString()}`;
  };

  const { data, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<ReviewsApiResponse>(getKey, fetcher, {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
    });

  const allReviews = data ? data.flatMap((page) => page.reviews) : [];
  const total = data?.[0]?.total ?? 0;
  const brewMethodCounts = data?.[0]?.brewMethodCounts ?? {};
  const hasMore = allReviews.length < total;
  const isLoadingMore = isValidating && size > 1;

  // Notify parent of rating distribution data (for sidebar)
  const distributionReported = useRef(false);
  useEffect(() => {
    if (data?.[0] && !distributionReported.current) {
      distributionReported.current = true;
      const dist = data[0].ratingDistribution ?? {};
      const t = data[0].total ?? 0;
      onDistributionLoad?.({ ratingDistribution: dist, total: t });
    }
  }, [data, onDistributionLoad]);

  const handleVote = useCallback(
    (reviewId: string) => {
      startVotingTransition(async () => {
        // Optimistic update
        mutate(
          (pages) =>
            pages?.map((page) => ({
              ...page,
              reviews: page.reviews.map((r) =>
                r.id === reviewId
                  ? {
                      ...r,
                      userVoted: !r.userVoted,
                      helpfulCount: r.userVoted
                        ? r.helpfulCount - 1
                        : r.helpfulCount + 1,
                    }
                  : r
              ),
            })),
          false
        );
        await voteHelpful(reviewId);
      });
    },
    [mutate]
  );

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    setSize(1);
  };

  const handleFilterChange = (method: string | null) => {
    setBrewMethodFilter(method);
    setSize(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (allReviews.length === 0 && !brewMethodFilter) {
    return (
      <p className="text-center text-text-muted py-8">
        Be the first to share a Brew Report
      </p>
    );
  }

  return (
    <div>
      {/* Sort + filter controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        {/* Sort buttons */}
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={sort === option.value ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleSortChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Brew method filter pills */}
        {Object.keys(brewMethodCounts).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => handleFilterChange(null)}
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground transition-opacity",
                !brewMethodFilter
                  ? "opacity-100"
                  : "opacity-60 hover:opacity-80"
              )}
            >
              All
            </button>
            {Object.entries(brewMethodCounts).map(([method, count]) => (
              <button
                key={method}
                onClick={() =>
                  handleFilterChange(brewMethodFilter === method ? null : method)
                }
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground transition-opacity",
                  brewMethodFilter === method
                    ? "opacity-100"
                    : "opacity-60 hover:opacity-80"
                )}
              >
                {BREW_METHOD_LABELS[method as BrewMethodKey] ?? method}
                <span className="sr-only"> ({count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reviews list */}
      <div>
        {allReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onVote={handleVote}
            isVoting={isVoting}
          />
        ))}
      </div>

      {/* Empty state when filter yields no results */}
      {allReviews.length === 0 && brewMethodFilter && (
        <p className="text-center text-text-muted py-8">
          No reviews for this brew method yet
        </p>
      )}

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSize(size + 1)}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
