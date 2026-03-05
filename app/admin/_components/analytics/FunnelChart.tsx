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
    <div className={cn("flex flex-col items-center gap-0", className)}>
      {steps.map((step, i) => {
        // Width tapers from 100% down proportionally, with a 20% minimum
        const widthPct = Math.max((step.value / maxValue) * 100, 20);
        return (
          <div key={step.label} className="w-full flex flex-col items-center">
            {i > 0 && step.conversionFromPrevious != null && (
              <div className="flex items-center gap-1 py-1 text-xs text-muted-foreground">
                <ArrowDown className="h-3 w-3" />
                {formatPercent(step.conversionFromPrevious)}
              </div>
            )}
            <div
              className={cn(
                "relative flex items-center justify-center rounded-md py-3 transition-all",
                STEP_COLORS[i % STEP_COLORS.length]
              )}
              style={{ width: `${widthPct}%`, opacity: 0.85 }}
            >
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium text-white whitespace-nowrap">
                  {step.label}
                </span>
                <span className="text-white/80 text-xs whitespace-nowrap">
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
