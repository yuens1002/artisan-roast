"use client";

import { ClipboardList } from "lucide-react";
import { ChartCard } from "../analytics/ChartCard";
import { DonutChart } from "../analytics/DonutChart";
import { formatStatus } from "@/lib/admin/analytics/formatters";
import type { StatusBreakdownItem } from "@/lib/admin/analytics/contracts";

interface OrdersStatusSectionProps {
  data: StatusBreakdownItem[];
}

export function OrdersStatusSection({ data }: OrdersStatusSectionProps) {
  const chartData = data.map((s) => ({
    label: formatStatus(s.status),
    value: s.count,
  }));

  const total = data.reduce((sum, s) => sum + s.count, 0);

  return (
    <ChartCard title="Total Orders by Status" titleIcon={ClipboardList} description="Breakdown by fulfillment stage">
      {total > 0 ? (
        <DonutChart data={chartData} />
      ) : (
        <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
          No orders in this period
        </div>
      )}
    </ChartCard>
  );
}
