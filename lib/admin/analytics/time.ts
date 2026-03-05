/**
 * Canonical time policy for admin analytics.
 *
 * All intervals are [fromInclusive, toExclusive).
 * All dates are UTC unless a store timezone is configured.
 */

import {
  subDays,
  subMonths,
  subYears,
  addDays,
  differenceInDays,
} from "date-fns";
import type { PeriodPreset, CompareMode, DateRangeDTO } from "./contracts";

// ---------------------------------------------------------------------------
// Period presets
// ---------------------------------------------------------------------------

export interface PeriodPresetConfig {
  key: PeriodPreset;
  label: string;
}

export const PERIOD_PRESETS: PeriodPresetConfig[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "6mo", label: "6 months" },
  { key: "1yr", label: "1 year" },
];

const VALID_PRESETS = new Set<string>(PERIOD_PRESETS.map((p) => p.key));

/** Parse and validate a period parameter; defaults to "30d". */
export function parsePeriodParam(param: string | null | undefined): PeriodPreset {
  if (param && VALID_PRESETS.has(param)) return param as PeriodPreset;
  return "30d";
}

/** Parse and validate a compare mode parameter; defaults to "previous". */
export function parseCompareParam(
  param: string | null | undefined
): CompareMode {
  if (param === "previous" || param === "lastYear" || param === "none")
    return param;
  return "previous";
}

// ---------------------------------------------------------------------------
// Date range computation
// ---------------------------------------------------------------------------

export interface DateRange {
  /** Inclusive start */
  from: Date;
  /** Exclusive end */
  to: Date;
}

/** Start of day in UTC (zeroes hours/minutes/seconds/ms). */
export function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Compute [from, to) for a given preset relative to `now`.
 * `to` is start of tomorrow UTC (exclusive), `from` is N days/months back.
 */
export function getDateRange(preset: PeriodPreset, now = new Date()): DateRange {
  const to = startOfDayUTC(addDays(now, 1)); // exclusive tomorrow 00:00 UTC

  switch (preset) {
    case "7d":
      return { from: startOfDayUTC(subDays(now, 6)), to };
    case "30d":
      return { from: startOfDayUTC(subDays(now, 29)), to };
    case "90d":
      return { from: startOfDayUTC(subDays(now, 89)), to };
    case "6mo":
      return { from: startOfDayUTC(subMonths(now, 6)), to };
    case "1yr":
      return { from: startOfDayUTC(subYears(now, 1)), to };
  }
}

/**
 * Compute the comparison range based on the primary range and compare mode.
 *
 * - `previous`: shift the entire range back by its own duration.
 * - `lastYear`: same calendar dates shifted back exactly 1 year.
 * - `none`: returns null.
 */
export function getComparisonRange(
  range: DateRange,
  mode: CompareMode
): DateRange | null {
  if (mode === "none") return null;

  if (mode === "lastYear") {
    return {
      from: subYears(range.from, 1),
      to: subYears(range.to, 1),
    };
  }

  // "previous" — shift back by the range duration
  const days = differenceInDays(range.to, range.from);
  return {
    from: subDays(range.from, days),
    to: range.from,
  };
}

// ---------------------------------------------------------------------------
// Custom date range helpers
// ---------------------------------------------------------------------------

/**
 * Validate custom date params for API routes.
 * Returns an error message string or null if valid.
 */
export function validateCustomDateParams(from: string, to: string): string | null {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return "Invalid date format — use ISO 8601";
  }
  if (fromDate >= toDate) {
    return "from must be before to";
  }
  const daySpan = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daySpan > 366) {
    return "Date range must not exceed 366 days";
  }
  return null;
}

/**
 * Resolve a preset or custom from/to into a concrete DateRange.
 * Falls back to 30d if custom dates are invalid.
 */
export function resolveRange(
  params: { period: PeriodPreset } | { customFrom: string; customTo: string }
): DateRange {
  if ("customFrom" in params) {
    const from = new Date(params.customFrom);
    const to = new Date(params.customTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
      return getDateRange("30d");
    }
    from.setUTCHours(0, 0, 0, 0);
    to.setUTCHours(0, 0, 0, 0);
    return { from, to };
  }
  return getDateRange(params.period);
}

// ---------------------------------------------------------------------------
// Date formatting helpers
// ---------------------------------------------------------------------------

/** Format a Date to YYYY-MM-DD in UTC (for chart buckets and API keys). */
export function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Convert a DateRange to a serialized DTO for API responses. */
export function toDateRangeDTO(range: DateRange): DateRangeDTO {
  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Bucket helpers
// ---------------------------------------------------------------------------

/**
 * Group items into daily buckets by a date accessor.
 * Returns a Map keyed by YYYY-MM-DD.
 */
export function bucketByDay<T>(
  items: T[],
  getDate: (item: T) => Date
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = toDateKey(getDate(item));
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/**
 * Generate all date keys between from (inclusive) and to (exclusive).
 * Useful for filling gaps in chart data so every day has a data point.
 */
export function generateDateKeys(range: DateRange): string[] {
  const keys: string[] = [];
  let current = range.from;
  while (current < range.to) {
    keys.push(toDateKey(current));
    current = addDays(current, 1);
  }
  return keys;
}
