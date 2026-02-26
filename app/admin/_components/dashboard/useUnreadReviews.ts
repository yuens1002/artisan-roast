"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useUnreadReviews() {
  const { data, mutate } = useSWR<{ count: number }>(
    "/api/admin/reviews/unread",
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 60_000,
    }
  );

  return {
    unreadCount: data?.count ?? 0,
    mutate,
  };
}
