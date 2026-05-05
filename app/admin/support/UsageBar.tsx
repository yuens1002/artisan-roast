"use client";

import { Progress } from "@/components/ui/progress";
import type { CreditPool } from "@/lib/license-types";

// ---------------------------------------------------------------------------
// Usage bar — shared credit/quota progress bar
// ---------------------------------------------------------------------------

interface UsageBarProps {
  icon: React.ReactNode;
  label: string;
  pool: CreditPool;
  /** Show breakdown text ("3 plan, 1 add-on") when both sources exist. Default true. */
  showBreakdown?: boolean;
  /** Override the right-side count text. Default: `${used} / ${total} used` */
  formatter?: (pool: CreditPool) => string;
}

export function UsageBar({ icon, label, pool, showBreakdown = true, formatter }: UsageBarProps) {
  const total = pool.limit + pool.purchased;
  const pct = total > 0 ? (pool.used / total) * 100 : 0;
  const countLabel = formatter ? formatter(pool) : `${pool.used} / ${total} used`;

  const breakdown: string[] = [];
  if (pool.limit > 0) {
    const planRemaining = Math.max(
      0,
      pool.limit - Math.min(pool.used, pool.limit)
    );
    breakdown.push(`${planRemaining} plan`);
  }
  if (pool.purchased > 0) {
    const purchasedRemaining =
      pool.remaining -
      Math.max(0, pool.limit - Math.min(pool.used, pool.limit));
    breakdown.push(`${Math.max(0, purchasedRemaining)} add-on`);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="tabular-nums text-muted-foreground">
          {countLabel}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
      {showBreakdown && breakdown.length > 1 && (
        <p className="text-xs text-muted-foreground">
          {pool.remaining} remaining ({breakdown.join(", ")})
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Renewal date helper
// ---------------------------------------------------------------------------

export function getNextRenewalDate(
  snapshotAt: string,
  interval: string
): string {
  const start = new Date(snapshotAt);
  const now = new Date();
  const d = new Date(start);
  while (d <= now) {
    if (interval === "year") {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
