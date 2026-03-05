"use client";

import { Repeat } from "lucide-react";
import { ChartCard } from "../analytics/ChartCard";
import { SplitComparison } from "../analytics/SplitComparison";
import type { SplitPayload } from "@/lib/admin/analytics/contracts";

interface MixRetentionSectionProps {
  subscriptionSplit: SplitPayload;
  customerSplit: SplitPayload;
}

export function MixRetentionSection({
  subscriptionSplit,
  customerSplit,
}: MixRetentionSectionProps) {
  return (
    <ChartCard title="Mix & Retention" titleIcon={Repeat} description="Subscription vs one-time & new vs returning">
      <div className="space-y-6">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Revenue by Type</p>
          <SplitComparison data={subscriptionSplit} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Customer Mix</p>
          <SplitComparison data={customerSplit} />
        </div>
      </div>
    </ChartCard>
  );
}
