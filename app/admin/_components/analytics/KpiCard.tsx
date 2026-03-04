"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DeltaResult } from "@/lib/admin/analytics/contracts";
import { formatByType, formatDelta } from "@/lib/admin/analytics/formatters";

interface KpiCardProps {
  label: string;
  value: number;
  format: "currency" | "number" | "percent";
  delta?: DeltaResult;
  deltaLabel?: string;
  icon?: LucideIcon;
  href?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  format,
  delta,
  deltaLabel,
  icon: Icon,
  href,
  className,
}: KpiCardProps) {
  const content = (
    <Card
      className={cn(
        "transition-colors",
        href && "hover:border-primary/40 cursor-pointer",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight">
            {formatByType(value, format)}
          </span>
          {delta && delta.direction !== "flat" && (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-normal",
                delta.direction === "up" && "text-emerald-600 dark:text-emerald-400",
                delta.direction === "down" && "text-red-600 dark:text-red-400"
              )}
            >
              {formatDelta(delta)}
              {deltaLabel && ` ${deltaLabel}`}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
