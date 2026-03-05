"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/admin/analytics/formatters";

interface HBarDatum {
  label: string;
  value: number;
}

interface HBarChartProps {
  data: HBarDatum[];
  valueFormat?: "currency" | "number";
  /** "axis" = Recharts Y-axis labels (default), "above" = CSS labels above each bar, "inline" = compact single-row per item. */
  labelPosition?: "axis" | "above" | "inline";
  className?: string;
}

const chartConfig = {
  value: { label: "Value", color: "var(--chart-1)" },
} satisfies ChartConfig;

const MAX_LABEL_LEN = 14;

function TruncatedYTick(props: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const { x = 0, y = 0, payload } = props;
  const full = payload?.value ?? "";
  const truncated =
    full.length > MAX_LABEL_LEN ? `${full.slice(0, MAX_LABEL_LEN)}…` : full;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="currentColor"
        className="text-xs fill-muted-foreground"
      >
        {truncated}
        {full.length > MAX_LABEL_LEN && <title>{full}</title>}
      </text>
    </g>
  );
}

export function HBarChart({
  data,
  valueFormat = "number",
  labelPosition = "axis",
  className,
}: HBarChartProps) {
  const compactFormatter =
    valueFormat === "currency" ? formatCompactCurrency : formatNumber;
  const fullFormatter =
    valueFormat === "currency" ? formatCurrency : formatNumber;

  // CSS-based label-above variant — full product names above proportional bars
  if (labelPosition === "above") {
    const maxValue = Math.max(...data.map((d) => d.value));
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {data.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-muted-foreground mb-0.5 truncate" title={item.label}>
              {item.label}
            </p>
            <div className="flex items-center gap-2">
              <div
                className="h-4 rounded-r bg-chart-1 transition-all"
                style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
              />
              <span className="text-xs text-muted-foreground shrink-0">
                {fullFormatter(item.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Compact inline variant — label, bar, and value on a single row
  if (labelPosition === "inline") {
    const maxValue = Math.max(...data.map((d) => d.value));
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-2 min-h-6">
            <span className="w-48 shrink-0 text-xs text-muted-foreground truncate" title={item.label}>
              {item.label}
            </span>
            <div className="flex-1 min-w-0">
              <div
                className="h-3 rounded-r bg-chart-1 transition-all"
                style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-xs text-muted-foreground text-right tabular-nums">
              {fullFormatter(item.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const tooltipFormatter =
    valueFormat === "currency"
      ? (value: unknown, name: unknown) => (
          <>
            <div className="h-2.5 w-2.5 shrink-0 rounded-sm bg-(--color-value)" />
            <div className="flex flex-1 justify-between items-center gap-4 leading-none">
              <span className="text-muted-foreground">{name as string}</span>
              <span className="font-mono font-medium tabular-nums">
                {formatCurrency(value as number)}
              </span>
            </div>
          </>
        )
      : undefined;

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
          tickFormatter={(v: number) => compactFormatter(v)}
        />
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={100}
          tick={<TruncatedYTick />}
        />
        <ChartTooltip
          content={<ChartTooltipContent formatter={tooltipFormatter} />}
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
