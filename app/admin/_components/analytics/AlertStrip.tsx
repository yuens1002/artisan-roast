import Link from "next/link";
import { AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AlertPayload } from "@/lib/admin/analytics/contracts";

interface AlertStripProps {
  alerts: AlertPayload[];
  className?: string;
}

export function AlertStrip({ alerts, className }: AlertStripProps) {
  if (alerts.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20",
        className
      )}
      role="alert"
    >
      {alerts.map((alert, i) => {
        const Icon = alert.severity === "error" ? XCircle : AlertTriangle;
        const badge = (
          <Badge
            key={i}
            variant="outline"
            className={cn(
              "gap-1.5 text-xs font-normal",
              alert.severity === "error"
                ? "border-red-300 text-red-700 dark:border-red-800 dark:text-red-400"
                : "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {alert.message}
          </Badge>
        );

        if (alert.href) {
          return (
            <Link key={i} href={alert.href} className="hover:opacity-80">
              {badge}
            </Link>
          );
        }
        return badge;
      })}
    </div>
  );
}
