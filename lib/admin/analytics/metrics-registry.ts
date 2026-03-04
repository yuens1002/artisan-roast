/**
 * Metric registry — pure functions for KPI computation.
 *
 * Single source of truth for every formula used across dashboard and sales.
 * Currency values: cents. Ratios: 0..1. Directions: up/down/flat.
 */

import type { DeltaResult, SplitPayload } from "./contracts";

// ---------------------------------------------------------------------------
// Delta (period-over-period comparison)
// ---------------------------------------------------------------------------

/**
 * Compute the % change between current and previous values.
 * Returns a DeltaResult with normalized ratio (0..1) and direction.
 */
export function computeDelta(
  current: number,
  previous: number | undefined | null
): DeltaResult {
  if (previous == null || previous === 0) {
    if (current === 0) return { value: 0, direction: "flat" };
    return { value: 1, direction: "up" }; // infinite increase capped at 100%
  }

  const change = (current - previous) / Math.abs(previous);
  if (Math.abs(change) < 0.005) return { value: 0, direction: "flat" };
  return {
    value: Math.abs(change),
    direction: change > 0 ? "up" : "down",
  };
}

// ---------------------------------------------------------------------------
// Revenue & cost metrics (inputs in cents, outputs in cents or ratios)
// ---------------------------------------------------------------------------

/** Net revenue = gross revenue − refunds (all in cents). */
export function computeNetRevenue(revenue: number, refunds: number): number {
  return revenue - refunds;
}

/** AOV = revenue / orders. Returns 0 if no orders. */
export function computeAov(revenue: number, orders: number): number {
  return orders === 0 ? 0 : Math.round(revenue / orders);
}

/** Refund rate as a ratio (0..1). */
export function computeRefundRate(refunds: number, revenue: number): number {
  return revenue === 0 ? 0 : refunds / revenue;
}

/** Fulfillment rate: fulfilled / total orders as a ratio (0..1). */
export function computeFulfillmentRate(
  fulfilled: number,
  total: number
): number {
  return total === 0 ? 0 : fulfilled / total;
}

// ---------------------------------------------------------------------------
// Mix metrics (ratios 0..1)
// ---------------------------------------------------------------------------

/** Subscription revenue as a share of total revenue. */
export function computeSubscriptionPercent(
  subscriptionRevenue: number,
  totalRevenue: number
): number {
  return totalRevenue === 0 ? 0 : subscriptionRevenue / totalRevenue;
}

/** Promo order count as a share of total orders. */
export function computePromoPercent(
  promoOrders: number,
  totalOrders: number
): number {
  return totalOrders === 0 ? 0 : promoOrders / totalOrders;
}

/** Average items per order. */
export function computeAvgItems(
  totalItems: number,
  totalOrders: number
): number {
  return totalOrders === 0 ? 0 : totalItems / totalOrders;
}

// ---------------------------------------------------------------------------
// Conversion metrics
// ---------------------------------------------------------------------------

/** Conversion rate: conversions / opportunities as a ratio (0..1). */
export function computeConversionRate(
  conversions: number,
  opportunities: number
): number {
  return opportunities === 0 ? 0 : conversions / opportunities;
}

// ---------------------------------------------------------------------------
// Split computation
// ---------------------------------------------------------------------------

/** Build a SplitPayload from two named values. */
export function computeSplit(
  leftLabel: string,
  leftValue: number,
  rightLabel: string,
  rightValue: number
): SplitPayload {
  const total = leftValue + rightValue;
  return {
    left: {
      label: leftLabel,
      value: leftValue,
      percent: total === 0 ? 0 : leftValue / total,
    },
    right: {
      label: rightLabel,
      value: rightValue,
      percent: total === 0 ? 0 : rightValue / total,
    },
  };
}
