import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

function FullStar({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  );
}

function HalfStar({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="half-star-grad">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        fill="url(#half-star-grad)"
        stroke="currentColor"
        strokeWidth="0.5"
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  );
}

function EmptyStar({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  );
}

export function StarRating({ rating, size = "md", className }: StarRatingProps) {
  const sizeClass = SIZE_MAP[size];
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(
        <FullStar key={i} className={cn(sizeClass, "text-amber-400")} />
      );
    } else if (rating >= i - 0.75 && rating < i) {
      stars.push(
        <HalfStar key={i} className={cn(sizeClass, "text-amber-400")} />
      );
    } else {
      stars.push(
        <EmptyStar key={i} className={cn(sizeClass, "text-amber-200 dark:text-amber-800")} />
      );
    }
  }

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {stars}
    </div>
  );
}
