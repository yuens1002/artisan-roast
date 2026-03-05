import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/admin/analytics/formatters";
import type { RankedItem } from "@/lib/admin/analytics/contracts";

interface RankedListProps {
  items: RankedItem[];
  valueLabel?: string;
  limit?: number;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
}

export function RankedList({
  items,
  valueLabel,
  limit = 5,
  viewAllHref,
  viewAllLabel = "View All",
  className,
}: RankedListProps) {
  const displayed = items.slice(0, limit);

  if (displayed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No data available
      </p>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {valueLabel && (
        <div className="flex justify-end pb-1">
          <span className="text-xs text-muted-foreground">{valueLabel}</span>
        </div>
      )}
      <ol className="space-y-0.5">
        {displayed.map((item) => {
          const row = (
            <li
              key={`${item.rank}-${item.label}`}
              className="flex items-center gap-3 py-1.5 text-sm"
            >
              <span className="w-5 text-left text-xs text-muted-foreground tabular-nums">
                {item.rank}
              </span>
              <span className="flex-1 truncate" title={item.label}>{item.label}</span>
              <span className="text-right tabular-nums font-medium">
                {formatNumber(item.value)}
              </span>
            </li>
          );

          if (item.href) {
            return (
              <Link key={`${item.rank}-${item.label}`} href={item.href}>
                {row}
              </Link>
            );
          }
          return row;
        })}
      </ol>
      {viewAllHref && items.length > limit && (
        <div className="pt-2 text-center">
          <Link
            href={viewAllHref}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            {viewAllLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
