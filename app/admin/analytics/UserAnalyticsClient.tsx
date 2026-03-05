"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import {
  Eye,
  ShoppingCart,
  TrendingUp,
  Search,
  Activity,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DashboardToolbar,
  DateRangePicker,
  KpiCard,
  ChartCard,
  FunnelChart,
  RankedList,
  SkeletonDashboard,
} from "@/app/admin/_components/analytics";
import type {
  PeriodPreset,
  CompareMode,
  UserAnalyticsResponse,
} from "@/lib/admin/analytics/contracts";
import { computeDelta } from "@/lib/admin/analytics/metrics-registry";
import { formatCompactNumber } from "@/lib/admin/analytics/formatters";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const activityChartConfig = {
  total: { label: "Total", color: "var(--chart-1)" },
  productView: { label: "Product Views", color: "var(--chart-2)" },
  addToCart: { label: "Add to Cart", color: "var(--chart-3)" },
  search: { label: "Searches", color: "var(--chart-4)" },
  pageView: { label: "Page Views", color: "var(--chart-5)" },
  removeFromCart: { label: "Remove from Cart", color: "hsl(var(--muted-foreground))" },
} satisfies ChartConfig;

export default function UserAnalyticsClient() {
  const [period, setPeriod] = useState<PeriodPreset>("30d");
  const [compare, setCompare] = useState<CompareMode>("previous");
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();

  const isCustom = !!(customFrom && customTo);

  // Build API URL — use from/to for custom ranges, period for presets
  const apiUrl = isCustom
    ? `/api/admin/analytics?from=${customFrom}&to=${customTo}&compare=${compare}`
    : `/api/admin/analytics?period=${period}&compare=${compare}`;

  const { data, isLoading } = useSWR<UserAnalyticsResponse>(
    apiUrl,
    fetcher,
    { keepPreviousData: true }
  );

  const handlePeriodChange = useCallback((preset: PeriodPreset) => {
    setPeriod(preset);
    // Clear custom range when switching to a preset
    setCustomFrom(undefined);
    setCustomTo(undefined);
  }, []);

  const handleCustomRangeChange = useCallback((from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
  }, []);

  const handleExportCsv = useCallback(() => {
    const exportUrl = isCustom
      ? `/api/admin/analytics?from=${customFrom}&to=${customTo}&compare=${compare}&export=csv`
      : `/api/admin/analytics?period=${period}&compare=${compare}&export=csv`;
    window.open(exportUrl, "_blank");
  }, [period, compare, isCustom, customFrom, customTo]);

  // Add total column for the overlay line (must be before early returns)
  const chartData = useMemo(
    () =>
      (data?.activityByDay ?? []).map((d) => ({
        ...d,
        total: d.pageView + d.productView + d.search + d.addToCart + d.removeFromCart,
      })),
    [data?.activityByDay]
  );

  if (isLoading && !data) {
    return <SkeletonDashboard sections={4} />;
  }

  if (!data) return null;

  const { kpis, comparisonKpis, behaviorFunnel, trendingProducts, topSearches } = data;

  // Compute deltas for KPI cards
  const conversionDelta = comparisonKpis
    ? computeDelta(kpis.conversionRate, comparisonKpis.conversionRate)
    : undefined;
  const cartConversionDelta = comparisonKpis
    ? computeDelta(kpis.cartConversionRate, comparisonKpis.cartConversionRate)
    : undefined;
  const searchesDelta = comparisonKpis
    ? computeDelta(kpis.totalSearches, comparisonKpis.totalSearches)
    : undefined;
  const pageViewsDelta = comparisonKpis
    ? computeDelta(kpis.totalPageViews, comparisonKpis.totalPageViews)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Toolbar — period + export (compare only in calendar popover) */}
      <DashboardToolbar onExport={handleExportCsv}>
        <DateRangePicker
          mode="state"
          period={period}
          compare={compare}
          onPeriodChange={handlePeriodChange}
          onCompareChange={setCompare}
          customFrom={customFrom}
          customTo={customTo}
          onCustomRangeChange={handleCustomRangeChange}
          hideCompare
        />
      </DashboardToolbar>

      {/* KPI cards — unique metrics (not duplicated in funnel) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Conversion Rate"
          value={kpis.conversionRate}
          format="percent"
          icon={TrendingUp}
          delta={conversionDelta}
        />
        <KpiCard
          label="Cart Conversion"
          value={kpis.cartConversionRate}
          format="percent"
          icon={ShoppingCart}
          delta={cartConversionDelta}
        />
        <KpiCard
          label="Total Searches"
          value={kpis.totalSearches}
          format="number"
          icon={Search}
          delta={searchesDelta}
        />
        <KpiCard
          label="Page Views"
          value={kpis.totalPageViews}
          format="number"
          icon={Eye}
          delta={pageViewsDelta}
        />
      </div>

      {/* Row 1: Behavior Funnel (full width) */}
      <ChartCard title="Behavior Funnel" description="Views → Cart → Orders">
        <FunnelChart steps={behaviorFunnel} />
      </ChartCard>

      {/* Row 2: Trending Products + Top Searches (icons left of title) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Trending Products"
          description="Most viewed products"
          titleIcon={TrendingUp}
        >
          <RankedList items={trendingProducts} valueLabel="Views" limit={10} />
        </ChartCard>

        <ChartCard
          title="Top Searches"
          description="Most popular search terms"
          titleIcon={Search}
        >
          <RankedList items={topSearches} valueLabel="Searches" limit={10} />
        </ChartCard>
      </div>

      {/* Row 3: Daily Activity — stacked area chart with 5 series */}
      <ChartCard
        title="Daily Activity"
        description="Activity breakdown by type"
        titleIcon={Activity}
      >
        <ChartContainer config={activityChartConfig} className="h-75 w-full">
          <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: string) => {
                const d = new Date(v + "T00:00:00Z");
                return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              }}
              minTickGap={32}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCompactNumber(v)}
              width={50}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="total"
              name="Total"
              stroke="var(--color-total)"
              fill="none"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <Area
              type="monotone"
              dataKey="productView"
              name="Product Views"
              stackId="activity"
              stroke="var(--color-productView)"
              fill="var(--color-productView)"
              fillOpacity={0.4}
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="addToCart"
              name="Add to Cart"
              stackId="activity"
              stroke="var(--color-addToCart)"
              fill="var(--color-addToCart)"
              fillOpacity={0.4}
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="search"
              name="Searches"
              stackId="activity"
              stroke="var(--color-search)"
              fill="var(--color-search)"
              fillOpacity={0.4}
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="pageView"
              name="Page Views"
              stackId="activity"
              stroke="var(--color-pageView)"
              fill="var(--color-pageView)"
              fillOpacity={0.4}
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="removeFromCart"
              name="Remove from Cart"
              stackId="activity"
              stroke="var(--color-removeFromCart)"
              fill="var(--color-removeFromCart)"
              fillOpacity={0.4}
              strokeWidth={1.5}
            />
          </AreaChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
}
