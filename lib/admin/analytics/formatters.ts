/**
 * Consistent formatters for admin analytics UI.
 *
 * Currency: cents → display string.
 * Percent: ratio (0..1) → display string.
 */

import type { DeltaResult } from "./contracts";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-US");

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Format cents as USD. e.g. 123456 → "$1,234.56" */
export function formatCurrency(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

/** Compact currency for chart axes. e.g. 1234500 → "$12.3K" */
export function formatCompactCurrency(cents: number): string {
  return compactCurrencyFormatter.format(cents / 100);
}

/** Format a ratio (0..1) as a percentage. e.g. 0.123 → "12.3%" */
export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio);
}

/** Format an integer. e.g. 1234 → "1,234" */
export function formatNumber(n: number): string {
  return numberFormatter.format(Math.round(n));
}

/** Compact number. e.g. 12345 → "12.3K" */
export function formatCompactNumber(n: number): string {
  return compactNumberFormatter.format(n);
}

/** Format grams as weight. Respects admin weight unit setting. */
export function formatWeight(
  grams: number,
  unit: "METRIC" | "IMPERIAL" = "IMPERIAL"
): string {
  if (unit === "METRIC") {
    const kg = grams / 1000;
    return `${kg.toFixed(1)} kg`;
  }
  const lbs = grams / 453.592;
  return `${lbs.toFixed(1)} lbs`;
}

/**
 * Format a DeltaResult for display. e.g. { value: 0.123, direction: "up" } → "+12.3%"
 */
export function formatDelta(delta: DeltaResult): string {
  if (delta.direction === "flat") return percentFormatter.format(0);
  const sign = delta.direction === "up" ? "+" : "−";
  return `${sign}${percentFormatter.format(delta.value)}`;
}

/**
 * Format a value based on its declared format type.
 * Convenience for rendering KpiCard values.
 */
export function formatByType(
  value: number,
  format: "currency" | "number" | "percent"
): string {
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return formatPercent(value);
    case "number":
      return formatNumber(value);
  }
}

/** Format a DB enum status. e.g. "IN_PROGRESS" → "In Progress" */
export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
