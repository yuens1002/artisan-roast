"use client";

import { useEffect, useRef } from "react";

const DEBOUNCE_MS = 500;

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "artisan_session_id";
  let sessionId = sessionStorage.getItem(KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(KEY, sessionId);
  }
  return sessionId;
}

/**
 * Logs the current query to UserActivity ~500ms after the last keystroke.
 * Avoids per-keystroke noise; captures the "settled" search the user actually
 * looked at. Fire-and-forget — failures are logged but never block the UI.
 *
 * Skips empty/whitespace queries.
 */
export function useSearchAnalytics(query: string, enabled: boolean) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const trimmed = query.trim();
    if (trimmed.length === 0) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const sessionId = getOrCreateSessionId();
      if (!sessionId) return;

      fetch("/api/track-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          activityType: "SEARCH",
          searchQuery: trimmed,
        }),
        keepalive: true,
      }).catch((err) => {
        console.warn("[useSearchAnalytics] log failed:", err);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, enabled]);
}
