"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ReceiptText,
  Repeat,
} from "lucide-react";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import {
  PeriodSelector,
  KpiCard,
  StatGrid,
  ChartCard,
  TrendChart,
  DonutChart,
  HBarChart,
  RankedList,
  SplitComparison,
  SkeletonDashboard,
} from "@/app/admin/_components/analytics";
import { Button } from "@/components/ui/button";
import type {
  PeriodPreset,
  CompareMode,
  SalesResponse,
} from "@/lib/admin/analytics/contracts";
import { computeDelta } from "@/lib/admin/analytics/metrics-registry";
import { formatWeight } from "@/lib/admin/analytics/formatters";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SalesClient() {
  const [period, setPeriod] = useState<PeriodPreset>("30d");
  const [compare, setCompare] = useState<CompareMode>("previous");

  const apiUrl = `/api/admin/sales?period=${period}&compare=${compare}`;

  const { data, isLoading } = useSWR<SalesResponse>(apiUrl, fetcher, {
    keepPreviousData: true,
  });

  const handleExportCsv = useCallback(() => {
    window.open(`${apiUrl}&export=csv`, "_blank");
  }, [apiUrl]);

  if (isLoading && !data) {
    return (
      <>
        <PageTitle title="Sales Analytics" />
        <SkeletonDashboard />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageTitle title="Sales Analytics" />
        <p className="text-muted-foreground">Failed to load sales data.</p>
      </>
    );
  }

  const { kpis, comparisonKpis } = data;

  const kpiCards = [
    {
      label: "Revenue",
      value: kpis.revenue,
      format: "currency" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.revenue, comparisonKpis.revenue)
        : undefined,
      icon: DollarSign,
    },
    {
      label: "Orders",
      value: kpis.orders,
      format: "number" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.orders, comparisonKpis.orders)
        : undefined,
      icon: ShoppingCart,
    },
    {
      label: "AOV",
      value: kpis.aov,
      format: "currency" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.aov, comparisonKpis.aov)
        : undefined,
      icon: TrendingUp,
    },
    {
      label: "Refunds",
      value: kpis.refundAmount,
      format: "currency" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.refundAmount, comparisonKpis.refundAmount)
        : undefined,
      icon: ReceiptText,
    },
    {
      label: "Sub %",
      value: kpis.subscriptionPercent,
      format: "percent" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.subscriptionPercent, comparisonKpis.subscriptionPercent)
        : undefined,
      icon: Repeat,
    },
  ];

  return (
    <>
      <PageTitle
        title="Sales Analytics"
        action={
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Period selector */}
        <PeriodSelector
          mode="state"
          value={period}
          compare={compare}
          onChange={setPeriod}
          onCompareChange={setCompare}
        />

        {/* KPI cards */}
        <StatGrid columns={5}>
          {kpiCards.map((card) => (
            <KpiCard key={card.label} {...card} />
          ))}
        </StatGrid>

        {/* Revenue trend */}
        <ChartCard
          title="Revenue Over Time"
          description="Daily revenue with comparison overlay"
        >
          <TrendChart
            data={data.revenueByDay}
            primaryLabel="Revenue"
            secondaryLabel="Orders"
            comparisonData={data.comparisonByDay ?? undefined}
          />
        </ChartCard>

        {/* Row 2: Top products + Category breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Top Products">
            <RankedList
              items={data.topProducts}
              valueLabel="Revenue"
              limit={10}
            />
          </ChartCard>
          <ChartCard title="Category Breakdown">
            <HBarChart
              data={data.categoryBreakdown.map((c) => ({
                label: c.category,
                value: c.revenue,
              }))}
              valueFormat="currency"
            />
          </ChartCard>
        </div>

        {/* Row 3: Orders by status + Subscription split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Orders by Status">
            <DonutChart
              data={data.ordersByStatus.map((s) => ({
                label: s.status,
                value: s.count,
              }))}
            />
          </ChartCard>
          <ChartCard title="Subscription vs One-time">
            <SplitComparison data={data.purchaseTypeSplit} />
          </ChartCard>
        </div>

        {/* Row 4: Top locations + Coffee by weight */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Sales by Location">
            <RankedList
              items={data.topLocations}
              valueLabel="Revenue"
              limit={10}
            />
          </ChartCard>
          <ChartCard title="Coffee Sold by Weight">
            {data.coffeeByWeight.length > 0 ? (
              <HBarChart
                data={data.coffeeByWeight.map((c) => ({
                  label: `${c.product} (${formatWeight(c.weightSoldGrams)})`,
                  value: c.quantity,
                }))}
                valueFormat="number"
              />
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No coffee orders in this period
              </p>
            )}
          </ChartCard>
        </div>
      </div>
    </>
  );
}
