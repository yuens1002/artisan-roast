"use client";

import { useMemo } from "react";
import {
  FunnelChart as RechartsFunnelChart,
  Funnel,
  LabelList,
  Tooltip,
} from "recharts";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercent } from "@/lib/admin/analytics/formatters";
import type { FunnelStep } from "@/lib/admin/analytics/contracts";

interface FunnelChartProps {
  steps: FunnelStep[];
  className?: string;
}

const STEP_FILLS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function FunnelChart({ steps, className }: FunnelChartProps) {
  const chartData = useMemo(
    () =>
      steps.map((step, i) => ({
        name: step.label,
        value: step.value,
        conversionFromPrevious: step.conversionFromPrevious,
        fill: STEP_FILLS[i % STEP_FILLS.length],
      })),
    [steps]
  );

  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    steps.forEach((step, i) => {
      const key = step.label.toLowerCase().replace(/\s+/g, "_");
      cfg[key] = {
        label: step.label,
        color: STEP_FILLS[i % STEP_FILLS.length],
      };
    });
    return cfg satisfies ChartConfig;
  }, [steps]);

  if (steps.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ChartContainer config={chartConfig} className="h-45 w-full">
        <RechartsFunnelChart>
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null;
              const item = payload[0]?.payload as (typeof chartData)[number] | undefined;
              if (!item) return null;
              return (
                <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-muted-foreground mt-0.5">
                    {formatNumber(item.value)}
                    {item.conversionFromPrevious != null && (
                      <span className="ml-2">
                        ({formatPercent(item.conversionFromPrevious)} from prev)
                      </span>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Funnel
            dataKey="value"
            data={chartData}
            isAnimationActive
          >
            <LabelList
              dataKey="name"
              position="center"
              fill="#fff"
              className="text-sm font-medium"
            />
          </Funnel>
        </RechartsFunnelChart>
      </ChartContainer>

      {/* Conversion rates between steps */}
      <div className="flex justify-center gap-8 text-xs text-muted-foreground">
        {steps.slice(1).map(
          (step) =>
            step.conversionFromPrevious != null && (
              <span key={step.label}>
                → {step.label}: {formatPercent(step.conversionFromPrevious)}
              </span>
            )
        )}
      </div>
    </div>
  );
}
