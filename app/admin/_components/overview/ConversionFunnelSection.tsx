"use client";

import { Filter } from "lucide-react";
import { ChartCard } from "../analytics/ChartCard";
import { FunnelChart } from "../analytics/FunnelChart";
import type { FunnelStep } from "@/lib/admin/analytics/contracts";

interface ConversionFunnelSectionProps {
  steps: FunnelStep[];
}

export function ConversionFunnelSection({
  steps,
}: ConversionFunnelSectionProps) {
  const hasData = steps.some((s) => s.value > 0);

  return (
    <ChartCard title="Conversion Funnel" titleIcon={Filter} description="Views → Cart → Orders">
      {hasData ? (
        <FunnelChart steps={steps} />
      ) : (
        <div className="flex items-center justify-center h-50 text-sm text-muted-foreground">
          No activity data
        </div>
      )}
    </ChartCard>
  );
}
