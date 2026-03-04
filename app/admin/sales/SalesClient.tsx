"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ReceiptText,
  Repeat,
} from "lucide-react";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import {
  PeriodSelector,
  KpiCard,
  StatGrid,
  ChartCard,
  TrendChart,
  DonutChart,
  HBarChart,
  RankedList,
  SplitComparison,
  SkeletonDashboard,
} from "@/app/admin/_components/analytics";
import { DataTable, DataTablePagination } from "@/app/admin/_components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PeriodPreset,
  CompareMode,
  SalesResponse,
  SalesRow,
} from "@/lib/admin/analytics/contracts";
import { computeDelta } from "@/lib/admin/analytics/metrics-registry";
import { formatWeight, formatCurrency } from "@/lib/admin/analytics/formatters";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Column definitions (stable, no deps) ────────────────────────────
const salesColumns: ColumnDef<SalesRow, unknown>[] = [
  {
    accessorKey: "orderNumber",
    header: "Order #",
    size: 100,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.orderNumber}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    size: 110,
    enableSorting: true,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    accessorKey: "customerEmail",
    header: "Customer",
    size: 180,
    cell: ({ row }) =>
      row.original.customerName ?? row.original.customerEmail ?? "—",
  },
  {
    accessorKey: "itemCount",
    header: "Items",
    size: 70,
    enableSorting: true,
    cell: ({ row }) => row.original.itemCount,
  },
  {
    accessorKey: "orderType",
    header: "Type",
    size: 110,
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.orderType === "SUBSCRIPTION" ? "default" : "secondary"
        }
        className="text-xs"
      >
        {row.original.orderType === "SUBSCRIPTION" ? "Sub" : "One-time"}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 110,
    enableSorting: true,
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    size: 100,
    enableSorting: true,
    cell: ({ row }) => formatCurrency(row.original.total),
  },
  {
    accessorKey: "refunded",
    header: "Refunded",
    size: 100,
    cell: ({ row }) =>
      row.original.refunded > 0 ? formatCurrency(row.original.refunded) : "—",
  },
  {
    id: "location",
    header: "Location",
    size: 140,
    cell: ({ row }) =>
      [row.original.city, row.original.state].filter(Boolean).join(", ") ||
      "—",
  },
];

// ── Component ────────────────────────────────────────────────────────

export default function SalesClient() {
  const [period, setPeriod] = useState<PeriodPreset>("30d");
  const [compare, setCompare] = useState<CompareMode>("previous");

  // Server-side table state — directly drives the SWR URL
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const sortCol = sorting[0]?.id ?? "createdAt";
  const sortDir = sorting[0]?.desc ? "desc" : "asc";

  const apiUrl = `/api/admin/sales?period=${period}&compare=${compare}&page=${pagination.pageIndex}&pageSize=${pagination.pageSize}&sort=${sortCol}&dir=${sortDir}`;

  const { data, isLoading } = useSWR<SalesResponse>(apiUrl, fetcher, {
    keepPreviousData: true,
  });

  const handleExportCsv = useCallback(() => {
    window.open(
      `/api/admin/sales?period=${period}&compare=${compare}&export=csv`,
      "_blank"
    );
  }, [period, compare]);

  // Reset pagination when period/compare changes
  const handlePeriodChange = useCallback((p: PeriodPreset) => {
    setPeriod(p);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleCompareChange = useCallback((c: CompareMode) => {
    setCompare(c);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Reset to page 0 when sorting changes
  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      setSorting(updater);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    []
  );

  // Server-side table — manual pagination/sorting, no client-side row models
  const salesTable = useReactTable<SalesRow>({
    data: data?.table.rows ?? [],
    columns: salesColumns,
    state: { sorting, pagination },
    onSortingChange: handleSortingChange,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: data?.table.total ?? 0,
  });

  // ── Loading / error states ─────────────────────────────────────
  if (isLoading && !data) {
    return (
      <>
        <PageTitle title="Sales Analytics" />
        <SkeletonDashboard />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageTitle title="Sales Analytics" />
        <p className="text-muted-foreground">Failed to load sales data.</p>
      </>
    );
  }

  const { kpis, comparisonKpis } = data;

  const kpiCards = [
    {
      label: "Revenue",
      value: kpis.revenue,
      format: "currency" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.revenue, comparisonKpis.revenue)
        : undefined,
      icon: DollarSign,
    },
    {
      label: "Orders",
      value: kpis.orders,
      format: "number" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.orders, comparisonKpis.orders)
        : undefined,
      icon: ShoppingCart,
    },
    {
      label: "AOV",
      value: kpis.aov,
      format: "currency" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.aov, comparisonKpis.aov)
        : undefined,
      icon: TrendingUp,
    },
    {
      label: "Refunds",
      value: kpis.refundAmount,
      format: "currency" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.refundAmount, comparisonKpis.refundAmount)
        : undefined,
      icon: ReceiptText,
    },
    {
      label: "Sub %",
      value: kpis.subscriptionPercent,
      format: "percent" as const,
      delta: comparisonKpis
        ? computeDelta(
            kpis.subscriptionPercent,
            comparisonKpis.subscriptionPercent
          )
        : undefined,
      icon: Repeat,
    },
  ];

  return (
    <>
      <PageTitle
        title="Sales Analytics"
        action={
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Period selector */}
        <PeriodSelector
          mode="state"
          value={period}
          compare={compare}
          onChange={handlePeriodChange}
          onCompareChange={handleCompareChange}
        />

        {/* KPI cards */}
        <StatGrid columns={5}>
          {kpiCards.map((card) => (
            <KpiCard key={card.label} {...card} />
          ))}
        </StatGrid>

        {/* Revenue trend */}
        <ChartCard
          title="Revenue Over Time"
          description="Daily revenue with comparison overlay"
        >
          <TrendChart
            data={data.revenueByDay}
            primaryLabel="Revenue"
            secondaryLabel="Orders"
            comparisonData={data.comparisonByDay ?? undefined}
          />
        </ChartCard>

        {/* Row 2: Top products + Category breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Top Products">
            <RankedList
              items={data.topProducts}
              valueLabel="Revenue"
              limit={10}
            />
          </ChartCard>
          <ChartCard title="Category Breakdown">
            <HBarChart
              data={data.categoryBreakdown.map((c) => ({
                label: c.category,
                value: c.revenue,
              }))}
              valueFormat="currency"
            />
          </ChartCard>
        </div>

        {/* Row 3: Orders by status + Subscription split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Orders by Status">
            <DonutChart
              data={data.ordersByStatus.map((s) => ({
                label: s.status,
                value: s.count,
              }))}
            />
          </ChartCard>
          <ChartCard title="Subscription vs One-time">
            <SplitComparison data={data.purchaseTypeSplit} />
          </ChartCard>
        </div>

        {/* Row 4: Top locations + Coffee by weight */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Sales by Location">
            <RankedList
              items={data.topLocations}
              valueLabel="Revenue"
              limit={10}
            />
          </ChartCard>
          <ChartCard title="Coffee Sold by Weight">
            {data.coffeeByWeight.length > 0 ? (
              <HBarChart
                data={data.coffeeByWeight.map((c) => ({
                  label: `${c.product} (${formatWeight(c.weightSoldGrams)})`,
                  value: c.quantity,
                }))}
                valueFormat="number"
              />
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No coffee orders in this period
              </p>
            )}
          </ChartCard>
        </div>

        {/* Sales orders table */}
        <ChartCard
          title="Orders"
          description={`${data.table.total} orders in period`}
        >
          <DataTable table={salesTable} />
          <DataTablePagination table={salesTable} />
        </ChartCard>
      </div>
    </>
  );
}
