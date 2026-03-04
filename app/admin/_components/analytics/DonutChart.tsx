"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatNumber } from "@/lib/admin/analytics/formatters";

interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  centerLabel?: string;
  className?: string;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function DonutChart({
  data,
  centerLabel,
  className,
}: DonutChartProps) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.label,
      {
        label: d.label,
        color: d.color ?? CHART_COLORS[i % CHART_COLORS.length],
      },
    ])
  );

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartContainer config={config} className={className}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="85%"
          strokeWidth={2}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.label}
              fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        {centerLabel && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground text-lg font-semibold"
          >
            {centerLabel}
          </text>
        )}
        {!centerLabel && total > 0 && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground text-lg font-semibold"
          >
            {formatNumber(total)}
          </text>
        )}
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}
