"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  Eye,
  Filter,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { ADMIN_PAGES } from "@/lib/config/admin-pages";
import {
  DashboardPageTemplate,
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
import { DailyActivitySection } from "./DailyActivitySection";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

  if (isLoading && !data) {
    return (
      <DashboardPageTemplate
        title={ADMIN_PAGES.analytics.label}
        subtitle={ADMIN_PAGES.analytics.description}
      >
        <SkeletonDashboard sections={4} />
      </DashboardPageTemplate>
    );
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
    <DashboardPageTemplate
      title={ADMIN_PAGES.analytics.label}
      subtitle={ADMIN_PAGES.analytics.description}
    >
      {/* Toolbar — period + export */}
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
          description="Visitors who ordered"
          value={kpis.conversionRate}
          format="percent"
          icon={TrendingUp}
          delta={conversionDelta}
        />
        <KpiCard
          label="Cart Conversion"
          description="Carts that became orders"
          value={kpis.cartConversionRate}
          format="percent"
          icon={ShoppingCart}
          delta={cartConversionDelta}
        />
        <KpiCard
          label="Total Searches"
          description="Site search queries"
          value={kpis.totalSearches}
          format="number"
          icon={Search}
          delta={searchesDelta}
        />
        <KpiCard
          label="Page Views"
          description="Total pages visited"
          value={kpis.totalPageViews}
          format="number"
          icon={Eye}
          delta={pageViewsDelta}
        />
      </div>

      {/* Row 1: Funnel + Trending Products + Top Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Behavior Funnel" titleIcon={Filter} description="Views → Cart → Orders">
          <FunnelChart steps={behaviorFunnel} />
        </ChartCard>

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

      {/* Row 2: Daily Activity — stacked area chart with 5 series */}
      <DailyActivitySection data={data.activityByDay} />
    </DashboardPageTemplate>
  );
}
