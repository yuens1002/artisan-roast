/**
 * Shared Prisma WHERE builder for Order queries.
 *
 * Used by both dashboard and sales services to guarantee filter parity
 * between data routes and export routes.
 */

import type { Prisma } from "@prisma/client";
import type { DateRange } from "../time";

export interface OrderFilterParams {
  range: DateRange;
  /** Restrict to these statuses (undefined = no filter) */
  statuses?: string[];
  /** Filter by purchase type via order items */
  orderType?: "ALL" | "ONE_TIME" | "SUBSCRIPTION";
  /** Filter by promo code */
  promoCode?: string;
  /** Filter by shipping state */
  location?: string;
  /** Filter by product ID (via order items) */
  productId?: string;
  /** Filter by category ID (via order items → product → categories) */
  categoryId?: string;
}

/**
 * Build a Prisma `where` clause for Order queries.
 *
 * Uses the canonical [fromInclusive, toExclusive) interval.
 */
export function buildOrderWhere(
  params: OrderFilterParams
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {
    createdAt: {
      gte: params.range.from,
      lt: params.range.to,
    },
  };

  if (params.statuses && params.statuses.length > 0) {
    where.status = { in: params.statuses as Prisma.EnumOrderStatusFilter["in"] };
  }

  if (params.promoCode) {
    where.promoCode = params.promoCode;
  }

  if (params.location) {
    where.shippingState = params.location;
  }

  // Filter by order type or product/category via order items
  const needsItemFilter =
    (params.orderType && params.orderType !== "ALL") ||
    params.productId ||
    params.categoryId;

  if (needsItemFilter) {
    // Build purchaseOption filter conditions
    const poConditions: Prisma.PurchaseOptionWhereInput = {};
    const variantConditions: Prisma.ProductVariantWhereInput = {};

    if (params.orderType && params.orderType !== "ALL") {
      poConditions.type = params.orderType;
    }

    if (params.productId) {
      variantConditions.productId = params.productId;
    }

    if (params.categoryId) {
      variantConditions.product = {
        categories: { some: { categoryId: params.categoryId } },
      };
    }

    if (Object.keys(variantConditions).length > 0) {
      poConditions.variant = variantConditions;
    }

    where.items = {
      some: {
        purchaseOption: Object.keys(poConditions).length > 0
          ? poConditions
          : undefined,
      },
    };
  }

  return where;
}

/**
 * Build a "KPI-safe" where clause: same filters but excluding
 * CANCELLED and FAILED orders from financial aggregates.
 */
export function buildKpiOrderWhere(
  params: OrderFilterParams
): Prisma.OrderWhereInput {
  const base = buildOrderWhere(params);
  return {
    ...base,
    status: { notIn: ["CANCELLED", "FAILED"] },
  };
}
