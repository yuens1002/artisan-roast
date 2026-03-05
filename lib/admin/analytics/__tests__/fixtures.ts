/**
 * Zod-typed test fixtures for analytics query tests.
 *
 * Each fixture is validated at import time to catch shape drift.
 * All currency values in cents, dates as Date objects.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas (mirror Prisma return shapes)
// ---------------------------------------------------------------------------

const OrderFixtureSchema = z.object({
  id: z.string(),
  totalInCents: z.number(),
  refundedAmountInCents: z.number().nullable(),
  discountAmountInCents: z.number(),
  taxAmountInCents: z.number(),
  shippingAmountInCents: z.number(),
  promoCode: z.string().nullable(),
  status: z.enum([
    "PENDING",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "PICKED_UP",
    "CANCELLED",
    "FAILED",
  ]),
  userId: z.string(),
  createdAt: z.date(),
  shippingState: z.string().nullable(),
  shippingCity: z.string().nullable(),
});

const OrderItemFixtureSchema = z.object({
  id: z.string(),
  quantity: z.number(),
  priceInCents: z.number(),
  orderId: z.string(),
  purchaseOption: z.object({
    type: z.enum(["ONE_TIME", "SUBSCRIPTION"]),
    variant: z.object({
      weight: z.number().nullable(),
      productId: z.string(),
      product: z.object({
        name: z.string(),
        slug: z.string(),
        type: z.enum(["COFFEE", "MERCH"]),
      }),
    }),
  }),
});

const ReviewFixtureSchema = z.object({
  id: z.string(),
  rating: z.number().min(1).max(5),
  status: z.enum(["PUBLISHED", "FLAGGED", "PENDING"]),
  productId: z.string(),
  createdAt: z.date(),
});

const ActivityFixtureSchema = z.object({
  id: z.string(),
  activityType: z.enum([
    "PAGE_VIEW",
    "PRODUCT_VIEW",
    "SEARCH",
    "ADD_TO_CART",
    "REMOVE_FROM_CART",
  ]),
  searchQuery: z.string().nullable(),
  createdAt: z.date(),
});

// ---------------------------------------------------------------------------
// Fixture data: a known 7-day window with predictable totals
// ---------------------------------------------------------------------------

// Period: 2026-03-01 00:00 UTC to 2026-03-08 00:00 UTC (7 days)
export const FIXTURE_RANGE = {
  from: new Date("2026-03-01T00:00:00Z"),
  to: new Date("2026-03-08T00:00:00Z"),
};

// Comparison: 2026-02-22 to 2026-03-01
export const FIXTURE_COMPARISON_RANGE = {
  from: new Date("2026-02-22T00:00:00Z"),
  to: new Date("2026-03-01T00:00:00Z"),
};

// 5 orders totaling $500 ($50000 cents)
const rawOrders = [
  {
    id: "ord-1",
    totalInCents: 15000,
    refundedAmountInCents: 0,
    discountAmountInCents: 0,
    taxAmountInCents: 1200,
    shippingAmountInCents: 500,
    promoCode: null,
    status: "DELIVERED" as const,
    userId: "user-1",
    createdAt: new Date("2026-03-01T10:00:00Z"),
    shippingState: "CA",
    shippingCity: "Los Angeles",
  },
  {
    id: "ord-2",
    totalInCents: 12000,
    refundedAmountInCents: 0,
    discountAmountInCents: 500,
    taxAmountInCents: 960,
    shippingAmountInCents: 500,
    promoCode: "SPRING10",
    status: "SHIPPED" as const,
    userId: "user-2",
    createdAt: new Date("2026-03-02T14:00:00Z"),
    shippingState: "NY",
    shippingCity: "New York",
  },
  {
    id: "ord-3",
    totalInCents: 8000,
    refundedAmountInCents: 8000,
    discountAmountInCents: 0,
    taxAmountInCents: 640,
    shippingAmountInCents: 0,
    promoCode: null,
    status: "CANCELLED" as const,
    userId: "user-1",
    createdAt: new Date("2026-03-03T09:00:00Z"),
    shippingState: "CA",
    shippingCity: "San Francisco",
  },
  {
    id: "ord-4",
    totalInCents: 10000,
    refundedAmountInCents: 0,
    discountAmountInCents: 0,
    taxAmountInCents: 800,
    shippingAmountInCents: 500,
    promoCode: null,
    status: "DELIVERED" as const,
    userId: "user-3",
    createdAt: new Date("2026-03-05T16:00:00Z"),
    shippingState: "CA",
    shippingCity: "Los Angeles",
  },
  {
    id: "ord-5",
    totalInCents: 5000,
    refundedAmountInCents: 0,
    discountAmountInCents: 0,
    taxAmountInCents: 400,
    shippingAmountInCents: 500,
    promoCode: "SPRING10",
    status: "PENDING" as const,
    userId: "user-2",
    createdAt: new Date("2026-03-07T11:00:00Z"),
    shippingState: "NY",
    shippingCity: "Brooklyn",
  },
];

const rawOrderItems = [
  {
    id: "item-1",
    quantity: 2,
    priceInCents: 6000,
    orderId: "ord-1",
    purchaseOption: {
      type: "ONE_TIME" as const,
      variant: {
        weight: 340,
        productId: "prod-1",
        product: { name: "Ethiopian Yirgacheffe", slug: "ethiopian-yirgacheffe", type: "COFFEE" as const },
      },
    },
  },
  {
    id: "item-2",
    quantity: 1,
    priceInCents: 3000,
    orderId: "ord-1",
    purchaseOption: {
      type: "SUBSCRIPTION" as const,
      variant: {
        weight: 340,
        productId: "prod-2",
        product: { name: "Colombian Supremo", slug: "colombian-supremo", type: "COFFEE" as const },
      },
    },
  },
  {
    id: "item-3",
    quantity: 1,
    priceInCents: 12000,
    orderId: "ord-2",
    purchaseOption: {
      type: "ONE_TIME" as const,
      variant: {
        weight: null,
        productId: "prod-3",
        product: { name: "Artisan Mug", slug: "artisan-mug", type: "MERCH" as const },
      },
    },
  },
  {
    id: "item-4",
    quantity: 1,
    priceInCents: 8000,
    orderId: "ord-3",
    purchaseOption: {
      type: "ONE_TIME" as const,
      variant: {
        weight: 340,
        productId: "prod-1",
        product: { name: "Ethiopian Yirgacheffe", slug: "ethiopian-yirgacheffe", type: "COFFEE" as const },
      },
    },
  },
  {
    id: "item-5",
    quantity: 2,
    priceInCents: 5000,
    orderId: "ord-4",
    purchaseOption: {
      type: "SUBSCRIPTION" as const,
      variant: {
        weight: 340,
        productId: "prod-2",
        product: { name: "Colombian Supremo", slug: "colombian-supremo", type: "COFFEE" as const },
      },
    },
  },
  {
    id: "item-6",
    quantity: 1,
    priceInCents: 5000,
    orderId: "ord-5",
    purchaseOption: {
      type: "ONE_TIME" as const,
      variant: {
        weight: 340,
        productId: "prod-1",
        product: { name: "Ethiopian Yirgacheffe", slug: "ethiopian-yirgacheffe", type: "COFFEE" as const },
      },
    },
  },
];

const rawReviews = [
  { id: "rev-1", rating: 5, status: "PUBLISHED" as const, productId: "prod-1", createdAt: new Date("2026-03-02T10:00:00Z") },
  { id: "rev-2", rating: 4, status: "PUBLISHED" as const, productId: "prod-1", createdAt: new Date("2026-03-03T12:00:00Z") },
  { id: "rev-3", rating: 3, status: "PENDING" as const, productId: "prod-2", createdAt: new Date("2026-03-05T08:00:00Z") },
];

const rawActivities = [
  { id: "act-1", activityType: "PRODUCT_VIEW" as const, searchQuery: null, createdAt: new Date("2026-03-01T08:00:00Z") },
  { id: "act-2", activityType: "PRODUCT_VIEW" as const, searchQuery: null, createdAt: new Date("2026-03-01T09:00:00Z") },
  { id: "act-3", activityType: "PRODUCT_VIEW" as const, searchQuery: null, createdAt: new Date("2026-03-02T10:00:00Z") },
  { id: "act-4", activityType: "ADD_TO_CART" as const, searchQuery: null, createdAt: new Date("2026-03-01T10:00:00Z") },
  { id: "act-5", activityType: "ADD_TO_CART" as const, searchQuery: null, createdAt: new Date("2026-03-03T11:00:00Z") },
  { id: "act-6", activityType: "SEARCH" as const, searchQuery: "ethiopian", createdAt: new Date("2026-03-01T07:00:00Z") },
  { id: "act-7", activityType: "SEARCH" as const, searchQuery: "ethiopian", createdAt: new Date("2026-03-02T08:00:00Z") },
  { id: "act-8", activityType: "SEARCH" as const, searchQuery: "mug", createdAt: new Date("2026-03-04T09:00:00Z") },
];

// ---------------------------------------------------------------------------
// Validate and export
// ---------------------------------------------------------------------------

export const ORDERS = z.array(OrderFixtureSchema).parse(rawOrders);
export const ORDER_ITEMS = z.array(OrderItemFixtureSchema).parse(rawOrderItems);
export const REVIEWS = z.array(ReviewFixtureSchema).parse(rawReviews);
export const ACTIVITIES = z.array(ActivityFixtureSchema).parse(rawActivities);

// ---------------------------------------------------------------------------
// Pre-computed expected values (golden fixture assertions)
// ---------------------------------------------------------------------------

/** KPI-eligible orders (not CANCELLED/FAILED): ord-1, ord-2, ord-4, ord-5 */
export const EXPECTED = {
  /** Sum of KPI-eligible orders: 15000 + 12000 + 10000 + 5000 */
  kpiRevenue: 42000,
  /** Refunds from KPI-eligible orders: 0 */
  kpiRefunds: 0,
  /** KPI-eligible order count */
  kpiOrderCount: 4,
  /** All orders including cancelled */
  allOrderCount: 5,
  /** Refunds including cancelled: 8000 */
  allRefunds: 8000,
  /** Orders with promoCode: ord-2, ord-5 */
  promoOrderCount: 2,
  /** Fulfilled (DELIVERED/SHIPPED/OUT_FOR_DELIVERY/PICKED_UP): ord-1, ord-2, ord-4 */
  fulfilledCount: 3,
  /** Subscription item revenue: item-2 (3000*1) + item-5 (5000*2) = 13000 */
  subscriptionRevenue: 13000,
  /** One-time item revenue: item-1 (6000*2) + item-3 (12000*1) + item-4 (8000*1) + item-6 (5000*1) = 37000 */
  oneTimeRevenue: 37000,
  /** Total items across all orders: 2+1+1+1+2+1 = 8 */
  totalItems: 8,
  /** Reviews: avg (5+4+3)/3 = 4.0 */
  avgRating: 4.0,
  /** Pending reviews: 1 */
  pendingReviewCount: 1,
  /** Product views: 3, Add to cart: 2 */
  productViews: 3,
  addToCart: 2,
  /** Top search: "ethiopian" with 2 occurrences */
  topSearch: "ethiopian",
  topSearchCount: 2,
  /** Top product by revenue: Ethiopian Yirgacheffe (item-1: 12000 + item-4: 8000 + item-6: 5000 = 25000) */
  topProductSlug: "ethiopian-yirgacheffe",
  topProductRevenue: 25000,
  /** CA orders: ord-1, ord-3, ord-4 (3 orders) */
  caOrders: 3,
  caRevenue: 33000,
} as const;
