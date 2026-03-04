"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Eye,
  ShoppingCart,
  BarChart3,
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
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DashboardToolbar,
  DateRangePicker,
  KpiCard,
  ChartCard,
  FunnelChart,
  RankedList,
  StatGrid,
  SkeletonDashboard,
} from "@/app/admin/_components/analytics";
import type {
  PeriodPreset,
  UserAnalyticsResponse,
} from "@/lib/admin/analytics/contracts";
import { formatCompactNumber } from "@/lib/admin/analytics/formatters";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const activityChartConfig = {
  primary: { label: "Activities", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function UserAnalyticsClient() {
  const [period, setPeriod] = useState<PeriodPreset>("30d");

  const { data, isLoading } = useSWR<UserAnalyticsResponse>(
    `/api/admin/analytics?period=${period}`,
    fetcher,
    { keepPreviousData: true }
  );

  if (isLoading && !data) {
    return <SkeletonDashboard sections={4} />;
  }

  if (!data) return null;

  const { kpis, behaviorFunnel, trendingProducts, topSearches, activityByDay, activityBreakdown } = data;

  return (
    <div className="space-y-6">
      {/* Toolbar — period selector, no export */}
      <DashboardToolbar>
        <DateRangePicker
          mode="state"
          period={period}
          compare="none"
          onPeriodChange={setPeriod}
          onCompareChange={() => {}}
          hideCompare
        />
      </DashboardToolbar>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Product Views"
          value={kpis.totalProductViews}
          format="number"
          icon={Eye}
        />
        <KpiCard
          label="Add to Cart"
          value={kpis.totalAddToCart}
          format="number"
          icon={ShoppingCart}
        />
        <KpiCard
          label="Orders"
          value={kpis.totalOrders}
          format="number"
          icon={BarChart3}
        />
        <KpiCard
          label="Conversion Rate"
          value={kpis.conversionRate}
          format="percent"
          icon={TrendingUp}
        />
      </div>

      {/* Row 1: Behavior Funnel + Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Behavior Funnel" description="Views → Cart → Orders" className="lg:col-span-2">
          <FunnelChart steps={behaviorFunnel} />
        </ChartCard>

        <ChartCard title="Activity Breakdown" description="Distribution by type">
          <StatGrid columns={3}>
            {activityBreakdown.map((item) => (
              <div
                key={item.label}
                className="text-center p-3 bg-secondary rounded-lg"
              >
                <div className="text-2xl font-bold">{item.value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1 capitalize">
                  {item.label.toLowerCase()}
                </div>
              </div>
            ))}
          </StatGrid>
        </ChartCard>
      </div>

      {/* Row 2: Trending Products + Top Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Trending Products"
          description="Most viewed products"
          action={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        >
          <RankedList items={trendingProducts} valueLabel="Views" limit={10} />
        </ChartCard>

        <ChartCard
          title="Top Searches"
          description="Most popular search terms"
          action={<Search className="h-4 w-4 text-muted-foreground" />}
        >
          <RankedList items={topSearches} valueLabel="Searches" limit={10} />
        </ChartCard>
      </div>

      {/* Row 3: Daily Activity Trend */}
      <ChartCard
        title="Daily Activity"
        description="Total user activities per day"
        action={<Activity className="h-4 w-4 text-muted-foreground" />}
      >
        <ChartContainer config={activityChartConfig} className="h-[250px] w-full">
          <AreaChart data={activityByDay} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
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
            <Area
              type="monotone"
              dataKey="primary"
              name="Activities"
              stroke="var(--color-primary)"
              fill="var(--color-primary)"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
}
