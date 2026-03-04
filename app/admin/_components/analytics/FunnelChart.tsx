"use client";

import { cn } from "@/lib/utils";
import { formatNumber, formatPercent } from "@/lib/admin/analytics/formatters";
import type { FunnelStep } from "@/lib/admin/analytics/contracts";
import { ArrowDown } from "lucide-react";

interface FunnelChartProps {
  steps: FunnelStep[];
  className?: string;
}

const STEP_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
];

export function FunnelChart({ steps, className }: FunnelChartProps) {
  if (steps.length === 0) return null;

  const maxValue = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {steps.map((step, i) => {
        const widthPct = Math.max((step.value / maxValue) * 100, 8);
        return (
          <div key={step.label}>
            {i > 0 && step.conversionFromPrevious != null && (
              <div className="flex items-center gap-1.5 py-1 pl-2 text-xs text-muted-foreground">
                <ArrowDown className="h-3 w-3" />
                {formatPercent(step.conversionFromPrevious)}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-8 rounded-md transition-all",
                  STEP_COLORS[i % STEP_COLORS.length]
                )}
                style={{ width: `${widthPct}%`, opacity: 0.8 }}
              />
              <div className="flex flex-col text-sm">
                <span className="font-medium">{step.label}</span>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(step.value)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
