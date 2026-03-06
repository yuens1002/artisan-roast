"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompactCurrency } from "@/lib/admin/analytics/formatters";
import type { ChartDataPoint } from "@/lib/admin/analytics/contracts";

interface TrendChartProps {
  data: ChartDataPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  comparisonData?: ChartDataPoint[];
  className?: string;
}

export function TrendChart({
  data,
  primaryLabel,
  secondaryLabel,
  comparisonData,
  className,
}: TrendChartProps) {
  // Merge comparison data onto main data if present
  const mergedData = data.map((point) => {
    const compPoint = comparisonData?.find((c) => c.date === point.date);
    return {
      ...point,
      comparison: compPoint?.primary,
    };
  });

  // Keys deliberately avoid "primary"/"secondary" to prevent clashing with
  // Tailwind's --color-primary / --color-secondary theme variables.
  const config: ChartConfig = {
    trend1: { label: primaryLabel, color: "var(--chart-1)" },
    ...(secondaryLabel
      ? { trend2: { label: secondaryLabel, color: "var(--chart-2)" } }
      : {}),
    ...(comparisonData
      ? { comparison: { label: `${primaryLabel} (prev)`, color: "var(--chart-3)" } }
      : {}),
  };

  return (
    <ChartContainer config={config} className={className}>
      <AreaChart data={mergedData} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
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
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatCompactCurrency(v)}
          width={48}
        />
        {secondaryLabel && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={30}
          />
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="primary"
          name={primaryLabel}
          stroke="var(--color-trend1)"
          fill="var(--color-trend1)"
          fillOpacity={0.1}
          strokeWidth={2}
        />
        {secondaryLabel && (
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="secondary"
            name={secondaryLabel}
            stroke="var(--color-trend2)"
            fill="var(--color-trend2)"
            fillOpacity={0.05}
            strokeWidth={1.5}
          />
        )}
        {comparisonData && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="comparison"
            name={`${primaryLabel} (prev)`}
            stroke="var(--color-comparison)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
          />
        )}
      </AreaChart>
    </ChartContainer>
  );
}
