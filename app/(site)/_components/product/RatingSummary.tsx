import { cn } from "@/lib/utils";
import { StarRating } from "./StarRating";

interface RatingSummaryProps {
  averageRating: number | null;
  reviewCount: number;
  compact?: boolean;
  href?: string;
  className?: string;
}

export function RatingSummary({
  averageRating,
  reviewCount,
  compact = false,
  href,
  className,
}: RatingSummaryProps) {
  if (reviewCount === 0 || averageRating === null) return null;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1 text-sm text-text-muted", className)}>
        <StarRating rating={averageRating} size="sm" />
        <span>
          {averageRating.toFixed(1)} ({reviewCount})
        </span>
      </div>
    );
  }

  const label = `(${reviewCount} Brew ${reviewCount === 1 ? "Report" : "Reports"})`;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <StarRating rating={averageRating} size="sm" />
      {href ? (
        <a
          href={href}
          className="text-sm text-text-muted hover:text-primary transition-colors"
        >
          {label}
        </a>
      ) : (
        <span className="text-sm text-text-muted">{label}</span>
      )}
    </div>
  );
}
