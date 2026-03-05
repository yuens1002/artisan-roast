"use client";

import { useState } from "react";
import {
  BarChart3,
  ClipboardList,
  MapPin,
  Repeat,
  TrendingUp,
  Trophy,
  Weight,
} from "lucide-react";
import {
  ChartCard,
  ChartCardToggleAction,
  TrendChart,
  DonutChart,
  HBarChart,
  RankedList,
} from "@/app/admin/_components/analytics";
import { formatCurrency, formatStatus } from "@/lib/admin/analytics/formatters";
import type { SalesResponse } from "@/lib/admin/analytics/contracts";

interface SalesChartsSectionProps {
  data: SalesResponse;
  weightUnit: "METRIC" | "IMPERIAL";
}

export function SalesChartsSection({ data, weightUnit }: SalesChartsSectionProps) {
  const [showAllCoffee, setShowAllCoffee] = useState(false);
  const weightUnitLabel = weightUnit === "METRIC" ? "kg" : "lbs";

  return (
    <>
      {/* Revenue trend */}
      <ChartCard
        title="Revenue Over Time"
        titleIcon={TrendingUp}
        description="Daily revenue with comparison overlay"
      >
        <TrendChart
          data={data.revenueByDay}
          primaryLabel="Revenue"
          secondaryLabel="Orders"
          comparisonData={data.comparisonByDay ?? undefined}
          className="aspect-auto h-56"
        />
      </ChartCard>

      {/* Row 2: Top products (60%) + Subscription vs One-time (40%) */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4">
        <ChartCard title="Top Products" titleIcon={Trophy} description="Best sellers by revenue">
          <RankedList
            items={data.topProducts}
            valueLabel="Revenue"
            limit={10}
          />
        </ChartCard>
        <ChartCard title="Subscription vs One-time" titleIcon={Repeat} description="Revenue split by purchase type">
          <DonutChart
            data={[
              {
                label: data.purchaseTypeSplit.left.label,
                value: data.purchaseTypeSplit.left.value,
              },
              {
                label: data.purchaseTypeSplit.right.label,
                value: data.purchaseTypeSplit.right.value,
              },
            ]}
            centerLabel={formatCurrency(
              data.purchaseTypeSplit.left.value +
                data.purchaseTypeSplit.right.value
            )}
            valueFormat="currency"
          />
        </ChartCard>
      </div>

      {/* Row 3: Category breakdown (40%) + Coffee by weight (60%) */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4">
        <ChartCard title="Category Breakdown" titleIcon={BarChart3} description="Revenue by product category">
          <HBarChart
            data={data.categoryBreakdown.map((c) => ({
              label: c.category,
              value: c.revenue,
            }))}
            valueFormat="currency"
            labelPosition="above"
          />
        </ChartCard>
        <ChartCard
          title={`Coffee Sold by Weight (${weightUnitLabel})`}
          titleIcon={Weight}
          description="Total weight shipped per product"
          action={data.coffeeByWeight.length > 10 ? (
            <ChartCardToggleAction
              expanded={showAllCoffee}
              onToggle={() => setShowAllCoffee((v) => !v)}
            />
          ) : undefined}
        >
          {data.coffeeByWeight.length > 0 ? (
            <HBarChart
              data={[...data.coffeeByWeight]
                .sort((a, b) => b.weightSoldGrams - a.weightSoldGrams)
                .slice(0, showAllCoffee ? undefined : 10)
                .map((c) => ({
                  label: c.product,
                  value: parseFloat(
                    (weightUnit === "METRIC"
                      ? c.weightSoldGrams / 1000
                      : c.weightSoldGrams / 453.592
                    ).toFixed(1)
                  ),
                }))}
              valueFormat="number"
              labelPosition="inline"
            />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No coffee orders in this period
            </p>
          )}
        </ChartCard>
      </div>

      {/* Row 4: Orders by status + Sales by Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Total Orders by Status" titleIcon={ClipboardList} description="Breakdown by fulfillment stage">
          <DonutChart
            data={data.ordersByStatus.map((s) => ({
              label: formatStatus(s.status),
              value: s.count,
            }))}
          />
        </ChartCard>
        <ChartCard title="Sales by Location" titleIcon={MapPin} description="Revenue by customer location">
          <RankedList
            items={data.topLocations}
            valueLabel="Revenue"
            limit={10}
          />
        </ChartCard>
      </div>
    </>
  );
}
