import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/admin/analytics/formatters";
import type { SplitPayload } from "@/lib/admin/analytics/contracts";

interface SplitComparisonProps {
  data: SplitPayload;
  className?: string;
}

export function SplitComparison({ data, className }: SplitComparisonProps) {
  const { left, right } = data;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Labels */}
      <div className="flex justify-between text-sm">
        <div>
          <span className="font-medium">{left.label}</span>
          <span className="ml-1.5 text-muted-foreground">
            {formatPercent(left.percent)}
          </span>
        </div>
        <div className="text-right">
          <span className="font-medium">{right.label}</span>
          <span className="ml-1.5 text-muted-foreground">
            {formatPercent(right.percent)}
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden">
        <div
          className="bg-chart-1 transition-all"
          style={{ width: `${Math.max(left.percent * 100, 2)}%` }}
        />
        <div
          className="bg-chart-2 transition-all"
          style={{ width: `${Math.max(right.percent * 100, 2)}%` }}
        />
      </div>
    </div>
  );
}
