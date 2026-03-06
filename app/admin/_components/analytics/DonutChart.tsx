"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatNumber, formatCurrency } from "@/lib/admin/analytics/formatters";

interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  centerLabel?: string;
  /** Large value shown below centerLabel for two-line center. */
  centerValue?: string;
  /** Format tooltip values as currency ($XX.XX) instead of plain numbers. */
  valueFormat?: "number" | "currency";
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
  centerValue,
  valueFormat = "number",
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
    <div className={cn("flex h-full flex-col", className)}>
      {/* Pie chart — fills available card space, PieChart keeps it circular */}
      <ChartContainer config={config} className="flex-1 min-h-48 w-full aspect-auto">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={
                  valueFormat === "currency"
                    ? (value, name, item) => (
                        <>
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{
                              background: item?.payload?.fill ?? item?.color,
                            }}
                          />
                          <div className="flex flex-1 justify-between items-center gap-4 leading-none">
                            <span className="text-muted-foreground">
                              {name}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {formatCurrency(value as number)}
                            </span>
                          </div>
                        </>
                      )
                    : undefined
                }
              />
            }
          />
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
          {centerLabel && centerValue ? (
            <g>
              <text
                x="50%"
                y="44%"
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-muted-foreground text-xs"
              >
                {centerLabel}
              </text>
              <text
                x="50%"
                y="56%"
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fontSize: "1.875rem", fontWeight: 700 }}
                className="fill-foreground"
              >
                {centerValue}
              </text>
            </g>
          ) : centerLabel ? (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground text-lg font-semibold"
            >
              {centerLabel}
            </text>
          ) : total > 0 ? (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground text-lg font-semibold"
            >
              {formatNumber(total)}
            </text>
          ) : null}
        </PieChart>
      </ChartContainer>

      {/* Legend — bottom-aligned, outside the SVG */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 pt-2 text-xs">
        {data.map((entry, i) => (
          <div key={entry.label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ background: entry.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-muted-foreground">{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
