"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseInfiniteScrollOptions {
  totalCount: number;
  batchSize: number;
}

interface UseInfiniteScrollReturn {
  /** Number of items to show (slice to this count) */
  visibleCount: number;
  /** Attach to a sentinel element at the bottom of the list */
  sentinelRef: React.RefObject<HTMLElement | null>;
  /** Whether more items remain beyond visibleCount */
  hasMore: boolean;
  /** Reset to first batch (call when filters/search change) */
  reset: () => void;
}

export function useInfiniteScroll({
  totalCount,
  batchSize,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLElement | null>(null);

  // Load next batch when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + batchSize, totalCount));
      }
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [batchSize, totalCount]);

  const reset = useCallback(() => {
    setVisibleCount(batchSize);
  }, [batchSize]);

  const hasMore = visibleCount < totalCount;

  return { visibleCount, sentinelRef, hasMore, reset };
}
