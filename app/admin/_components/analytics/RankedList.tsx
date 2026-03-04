import Link from "next/link";
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
  viewAllLabel = "View all →",
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
        <div className="flex justify-end px-2 pb-1">
          <span className="text-xs text-muted-foreground">{valueLabel}</span>
        </div>
      )}
      <ol className="space-y-0.5">
        {displayed.map((item) => {
          const row = (
            <li
              key={`${item.rank}-${item.label}`}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm",
                item.href && "hover:bg-muted cursor-pointer"
              )}
            >
              <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">
                {item.rank}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
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
            className="text-xs text-primary hover:underline"
          >
            {viewAllLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
