"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompactCurrency, formatNumber } from "@/lib/admin/analytics/formatters";

interface HBarDatum {
  label: string;
  value: number;
}

interface HBarChartProps {
  data: HBarDatum[];
  valueFormat?: "currency" | "number";
  className?: string;
}

const chartConfig = {
  value: { label: "Value", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function HBarChart({
  data,
  valueFormat = "number",
  className,
}: HBarChartProps) {
  const formatter =
    valueFormat === "currency" ? formatCompactCurrency : formatNumber;

  return (
    <ChartContainer config={chartConfig} className={className}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 12, top: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatter(v)}
        />
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={100}
          tickFormatter={(v: string) =>
            v.length > 14 ? `${v.slice(0, 14)}…` : v
          }
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
