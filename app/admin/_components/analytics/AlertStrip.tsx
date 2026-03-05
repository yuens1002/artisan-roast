import Link from "next/link";
import { AlertTriangle, XCircle, ArrowRight } from "lucide-react";
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
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="alert">
      {alerts.map((alert, i) => {
        const Icon = alert.severity === "error" ? XCircle : AlertTriangle;
        const badge = (
          <Badge
            key={i}
            variant="outline"
            className={cn(
              "gap-1.5 py-1 px-2.5 text-sm font-normal",
              alert.severity === "error"
                ? "border-red-300 bg-red-50/60 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400"
                : "border-amber-300 bg-amber-50/60 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {alert.message}
            {alert.href && <ArrowRight className="h-3.5 w-3.5 shrink-0 ml-0.5" />}
          </Badge>
        );

        if (alert.href) {
          return (
            <Link key={i} href={alert.href} className="transition-opacity hover:opacity-80">
              {badge}
            </Link>
          );
        }
        return badge;
      })}
    </div>
  );
}
