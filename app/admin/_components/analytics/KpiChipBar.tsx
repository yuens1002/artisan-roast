import { Badge } from "@/components/ui/badge";
import { formatByType } from "@/lib/admin/analytics/formatters";
import type { ChipPayload } from "@/lib/admin/analytics/contracts";

interface KpiChipBarProps {
  chips: ChipPayload[];
  className?: string;
}

export function KpiChipBar({ chips, className }: KpiChipBarProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className={className}
      role="list"
      aria-label="Supporting metrics"
    >
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {chips.map((chip) => (
          <Badge
            key={chip.label}
            variant="secondary"
            className="shrink-0 text-xs font-normal"
            role="listitem"
          >
            <span className="text-muted-foreground">{chip.label}:</span>
            <span className="ml-1 font-medium">
              {formatByType(chip.value, chip.format)}
            </span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
