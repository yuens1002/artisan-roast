"use client";

import { cn } from "@/lib/utils";
import { StarRating } from "@/app/(site)/_components/product/StarRating";
import { BrewMethodBadge } from "./BrewMethodBadge";
import { ThumbsUp, CheckCircle, AlertTriangle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { censorText } from "@/lib/reviews/profanity-filter";

export interface ReviewData {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  status?: string;
  flagReason?: string | null;
  adminResponse?: string | null;
  brewMethod: string | null;
  grindSize: string | null;
  waterTempF: number | null;
  ratio: string | null;
  tastingNotes: string[];
  completenessScore: number;
  helpfulCount: number;
  createdAt: string;
  isVerifiedPurchase: boolean;
  variantName: string | null;
  user: {
    name: string | null;
    image: string | null;
  };
  userVoted: boolean;
}

interface ReviewCardProps {
  review: ReviewData;
  onVote: (reviewId: string) => void;
  isVoting?: boolean;
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }
  return date.toLocaleDateString();
}

function getInitial(name: string | null): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function formatDisplayName(name: string | null): string {
  if (!name) return "Anonymous";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

export function ReviewCard({ review, onVote, isVoting }: ReviewCardProps) {
  const recipeItems: string[] = [];
  if (review.grindSize) recipeItems.push(`Grind: ${review.grindSize}`);
  if (review.waterTempF) recipeItems.push(`${review.waterTempF}°F`);
  if (review.ratio) recipeItems.push(review.ratio);

  return (
    <article className="py-5 first:pt-0 border-b last:border-b-0 border-border/50">
      {/* Top row: avatar, name, stars, date */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
          {getInitial(review.user.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-base">
              {formatDisplayName(review.user.name)}
            </span>
            <StarRating rating={review.rating} size="sm" />
            <span className="text-xs text-text-muted">
              {formatRelativeDate(review.createdAt)}
            </span>
          </div>
          {/* Second line: variant name + verified purchase */}
          {(review.variantName || review.isVerifiedPurchase) && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-text-muted">
              {review.variantName && <span>{review.variantName}</span>}
              {review.variantName && review.isVerifiedPurchase && (
                <span aria-hidden="true">·</span>
              )}
              {review.isVerifiedPurchase && (
                <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                  <CheckCircle className="h-3 w-3" />
                  Verified Purchase
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Flag reason banner */}
      {review.status === "FLAGGED" && review.flagReason && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 mb-2 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{review.flagReason}</span>
        </div>
      )}

      {/* Title */}
      {review.title && (
        <h4 className="font-semibold text-text-base mb-1">{censorText(review.title)}</h4>
      )}

      {/* Brew method badge */}
      {review.brewMethod && (
        <div className="mb-2">
          <BrewMethodBadge method={review.brewMethod} />
        </div>
      )}

      {/* Tasting notes chips */}
      {review.tastingNotes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {review.tastingNotes.map((note) => (
            <span
              key={note}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border border-border text-text-muted"
            >
              {note}
            </span>
          ))}
        </div>
      )}

      {/* Recipe metadata strip */}
      {recipeItems.length > 0 && (
        <p className="text-xs text-text-muted mb-2">
          {recipeItems.join(" · ")}
        </p>
      )}

      {/* Content */}
      <p className="text-sm text-text-base leading-relaxed mb-3">
        {censorText(review.content)}
      </p>

      {/* Admin response */}
      {review.adminResponse && (
        <div className="rounded-md bg-muted/50 border border-border/50 px-3 py-2.5 mb-3">
          <div className="flex items-center gap-1.5 mb-1 text-xs font-medium text-text-muted">
            <MessageSquare className="h-3 w-3" />
            Store Response
          </div>
          <p className="text-sm text-text-base leading-relaxed">
            {review.adminResponse}
          </p>
        </div>
      )}

      {/* Footer: helpful button */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 text-xs gap-1",
            review.userVoted
              ? "text-primary"
              : "text-text-muted hover:text-text-base"
          )}
          onClick={(e) => {
            e.preventDefault();
            onVote(review.id);
          }}
          disabled={isVoting}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Helpful
          {review.helpfulCount > 0 && (
            <span className="ml-0.5">({review.helpfulCount})</span>
          )}
        </Button>
      </div>
    </article>
  );
}
