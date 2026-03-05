/**
 * Shared API contracts for admin analytics.
 *
 * Consumed by: API routes, client components, tests.
 * Currency values are always in cents. Ratios are 0..1.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type PeriodPreset = "7d" | "30d" | "90d" | "6mo" | "1yr";
export type CompareMode = "previous" | "lastYear" | "none";

export interface DateRangeDTO {
  /** ISO-8601 date string (inclusive) */
  from: string;
  /** ISO-8601 date string (exclusive) */
  to: string;
}

export interface DeltaResult {
  /** Absolute % change, e.g. 0.123 = 12.3% */
  value: number;
  direction: "up" | "down" | "flat";
}

// ---------------------------------------------------------------------------
// KPI Card payload (consumed by KpiCard component)
// ---------------------------------------------------------------------------

export interface KpiCardPayload {
  id: string;
  label: string;
  /** Raw value in canonical units (cents for currency, ratio for %) */
  value: number;
  format: "currency" | "number" | "percent";
  delta?: DeltaResult;
  deltaLabel?: string;
  /** Lucide icon name, resolved client-side */
  icon?: string;
  /** Drill-through link */
  href?: string;
}

// ---------------------------------------------------------------------------
// Chart data shapes
// ---------------------------------------------------------------------------

export interface ChartDataPoint {
  /** YYYY-MM-DD */
  date: string;
  /** Primary metric value (cents for revenue, count for orders) */
  primary: number;
  /** Optional secondary metric on the same day */
  secondary?: number;
}

export interface RankedItem {
  rank: number;
  label: string;
  value: number;
  href?: string;
}

export interface FunnelStep {
  label: string;
  value: number;
  /** Conversion % from the previous step (undefined for first step) */
  conversionFromPrevious?: number;
}

export interface SplitPayload {
  left: { label: string; value: number; percent: number };
  right: { label: string; value: number; percent: number };
}

export interface ChipPayload {
  label: string;
  value: number;
  format: "currency" | "number" | "percent";
}

export interface AlertPayload {
  severity: "warning" | "error";
  message: string;
  href?: string;
}

export interface CategoryBreakdownItem {
  category: string;
  kind: "COFFEE" | "MERCH" | "BOTH";
  revenue: number;
  orders: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
}

export interface LocationItem {
  state: string;
  city: string;
  orders: number;
  revenue: number;
}

export interface WeightItem {
  product: string;
  weightSoldGrams: number;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Dashboard API response
// ---------------------------------------------------------------------------

export interface DashboardKpis {
  revenue: number;
  netRevenue: number;
  orders: number;
  aov: number;
  refundAmount: number;
  refundRate: number;
  reviews: number;
  avgRating: number;
  products: number;
  coffeeProducts: number;
  merchProducts: number;
  users: number;
  newUsers: number;
  newsletterActive: number;
  newsletterTotal: number;
  coffeeRevenue: number;
  merchRevenue: number;
}

export interface DashboardResponse {
  period: DateRangeDTO;
  comparison: DateRangeDTO | null;

  kpis: DashboardKpis;
  comparisonKpis: DashboardKpis | null;

  chips: ChipPayload[];
  alerts: AlertPayload[];

  revenueByDay: ChartDataPoint[];
  comparisonRevenueByDay: ChartDataPoint[] | null;

  ordersByStatus: StatusBreakdownItem[];
  behaviorFunnel: FunnelStep[];

  subscriptionSplit: SplitPayload;
  customerSplit: SplitPayload;

  topProducts: RankedItem[];
  topLocations: RankedItem[];
  topSearches: RankedItem[];
  topCustomers: RankedItem[];

  reviewsSummary: {
    avgRating: number;
    pendingCount: number;
    total: number;
    topReviewed: { name: string; slug: string; count: number } | null;
    starBreakdown: { rating: number; count: number }[];
    statusCounts: { published: number; pending: number; flagged: number };
    latestReview: {
      id: string;
      rating: number;
      title: string | null;
      content: string;
      createdAt: string;
      status: string;
      userName: string | null;
      productName: string;
      productSlug: string;
    } | null;
  };
}

export interface DashboardQueryParams {
  period: PeriodPreset;
  compare: CompareMode;
}

// ---------------------------------------------------------------------------
// Sales API response
// ---------------------------------------------------------------------------

export interface SalesKpis {
  revenue: number;
  netRevenue: number;
  orders: number;
  aov: number;
  refundAmount: number;
  refundRate: number;
  fulfillmentRate: number;
  avgItemsPerOrder: number;
  subscriptionRevenue: number;
  oneTimeRevenue: number;
  subscriptionPercent: number;
  promoOrderPercent: number;
}

export interface SalesRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerEmail: string | null;
  customerName: string | null;
  itemCount: number;
  orderType: "ONE_TIME" | "SUBSCRIPTION";
  promoCode: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  refunded: number;
  status: string;
  city: string | null;
  state: string | null;
}

export interface SalesResponse {
  period: DateRangeDTO;
  comparison: DateRangeDTO | null;

  kpis: SalesKpis;
  comparisonKpis: SalesKpis | null;

  revenueByDay: ChartDataPoint[];
  comparisonByDay: ChartDataPoint[] | null;

  categoryBreakdown: CategoryBreakdownItem[];
  ordersByStatus: StatusBreakdownItem[];
  purchaseTypeSplit: SplitPayload;
  salesByLocation: LocationItem[];
  coffeeByWeight: WeightItem[];

  topProducts: RankedItem[];
  topLocations: RankedItem[];

  table: {
    rows: SalesRow[];
    total: number;
    page: number;
    pageSize: number;
  };
}

// ---------------------------------------------------------------------------
// User Analytics API response
// ---------------------------------------------------------------------------

export interface UserAnalyticsKpis {
  totalProductViews: number;
  totalAddToCart: number;
  totalOrders: number;
  /** Ratio 0..1 — views to orders */
  conversionRate: number;
  /** Ratio 0..1 — cart to orders */
  cartConversionRate: number;
  totalSearches: number;
  totalPageViews: number;
}

export interface ActivityByDayPoint {
  date: string;
  pageView: number;
  productView: number;
  search: number;
  addToCart: number;
  removeFromCart: number;
}

export interface UserAnalyticsResponse {
  period: DateRangeDTO;
  comparison: DateRangeDTO | null;
  kpis: UserAnalyticsKpis;
  comparisonKpis: UserAnalyticsKpis | null;
  behaviorFunnel: FunnelStep[];
  trendingProducts: RankedItem[];
  topSearches: RankedItem[];
  activityByDay: ActivityByDayPoint[];
}

// ---------------------------------------------------------------------------
// Sales query params
// ---------------------------------------------------------------------------

export interface SalesQueryParams {
  from: string;
  to: string;
  compare: CompareMode;
  orderType?: "ALL" | "SUBSCRIPTION" | "ONE_TIME";
  status?: string;
  productId?: string;
  categoryId?: string;
  promoCode?: string;
  location?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: "asc" | "desc";
  export?: boolean;
}
