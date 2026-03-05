"use client";

import { Activity } from "lucide-react";
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
import { ChartCard } from "@/app/admin/_components/analytics";
import { formatCompactNumber } from "@/lib/admin/analytics/formatters";
import type { ActivityByDayPoint } from "@/lib/admin/analytics/contracts";

const activityChartConfig = {
  productView: { label: "Product Views", color: "var(--chart-1)" },
  addToCart: { label: "Add to Cart", color: "var(--chart-2)" },
  search: { label: "Searches", color: "var(--chart-4)" },
  pageView: { label: "Page Views", color: "var(--chart-5)" },
  removeFromCart: { label: "Remove from Cart", color: "oklch(0.627 0.265 303.9)" },
} satisfies ChartConfig;

interface DailyActivitySectionProps {
  data: ActivityByDayPoint[];
}

export function DailyActivitySection({ data }: DailyActivitySectionProps) {
  return (
    <ChartCard
      title="Daily Activity"
      description="Activity breakdown by type"
      titleIcon={Activity}
    >
      <ChartContainer config={activityChartConfig} className="aspect-auto h-64 w-full">
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
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
          {/* Stacked areas — removeFromCart first (bottom) to hide stroke when 0 */}
          <Area
            type="monotone"
            dataKey="removeFromCart"
            name="Remove from Cart"
            stackId="activity"
            stroke="var(--color-removeFromCart)"
            fill="var(--color-removeFromCart)"
            fillOpacity={0.4}
            strokeWidth={0}
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
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  );
}
