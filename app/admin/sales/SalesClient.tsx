"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import type { PaginationState, SortingState } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  DollarSign,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Weight,
} from "lucide-react";
import { ADMIN_PAGES } from "@/lib/config/admin-pages";
import {
  DashboardPageTemplate,
  DashboardToolbar,
  DateRangePicker,
  KpiCard,
  StatGrid,
  SkeletonDashboard,
} from "@/app/admin/_components/analytics";
import { useColumnVisibility } from "@/app/admin/_components/data-table";
import type { ActiveFilter } from "@/app/admin/_components/data-table";
import type {
  PeriodPreset,
  CompareMode,
  SalesResponse,
  SalesRow,
} from "@/lib/admin/analytics/contracts";
import { computeDelta } from "@/lib/admin/analytics/metrics-registry";
import { salesColumns, buildFilterQueryParams } from "./sales-table-config";
import { SalesChartsSection } from "./SalesChartsSection";
import { SalesOrdersSection } from "./SalesOrdersSection";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  });

// ── Component ────────────────────────────────────────────────────────

interface SalesClientProps {
  weightUnit: "METRIC" | "IMPERIAL";
}

export default function SalesClient({ weightUnit }: SalesClientProps) {
  const [period, setPeriod] = useState<PeriodPreset>("30d");
  const [compare, setCompare] = useState<CompareMode>("previous");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);
  const { columnVisibility, handleVisibilityChange } =
    useColumnVisibility("sales-table-cols");

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

  // Build filter query params from activeFilter state
  const filterParams = buildFilterQueryParams(activeFilter);

  const apiUrl = `/api/admin/sales?period=${period}&compare=${compare}&page=${pagination.pageIndex}&pageSize=${pagination.pageSize}&sort=${sortCol}&dir=${sortDir}${filterParams}`;

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

  const handleFilterChange = useCallback(
    (filter: ActiveFilter | null) => {
      setActiveFilter(filter);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    []
  );

  // Server-side table — manual pagination/sorting, no client-side row models
  const salesTable = useReactTable<SalesRow>({
    data: data?.table?.rows ?? [],
    columns: salesColumns,
    state: { sorting, pagination, columnVisibility },
    onSortingChange: handleSortingChange,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: data?.table?.total ?? 0,
    columnResizeMode: "onChange",
  });

  // ── Loading / error states ─────────────────────────────────────
  if (isLoading && !data) {
    return (
      <DashboardPageTemplate title={ADMIN_PAGES.sales.label} subtitle={ADMIN_PAGES.sales.description}>
        <SkeletonDashboard />
      </DashboardPageTemplate>
    );
  }

  if (!data) {
    return (
      <DashboardPageTemplate title={ADMIN_PAGES.sales.label} subtitle={ADMIN_PAGES.sales.description}>
        <p className="text-muted-foreground">Failed to load sales data.</p>
      </DashboardPageTemplate>
    );
  }

  const { kpis, comparisonKpis } = data;

  // Total coffee weight for KPI card
  const totalCoffeeGrams = data.coffeeByWeight.reduce(
    (sum, c) => sum + c.weightSoldGrams,
    0
  );
  const totalCoffeeWeight =
    weightUnit === "METRIC"
      ? Math.round(totalCoffeeGrams / 1000)
      : Math.round(totalCoffeeGrams / 453.592);
  const weightUnitLabel = weightUnit === "METRIC" ? "kg" : "lbs";

  const kpiCards = [
    {
      label: "Revenue",
      description: "Gross sales for the period",
      value: kpis.revenue,
      format: "currency" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.revenue, comparisonKpis.revenue)
        : undefined,
      icon: DollarSign,
    },
    {
      label: "Orders",
      description: "Total orders placed",
      value: kpis.orders,
      format: "number" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.orders, comparisonKpis.orders)
        : undefined,
      icon: ShoppingCart,
    },
    {
      label: "AOV",
      labelTitle: "Average Order Value",
      description: "Revenue per order",
      value: kpis.aov,
      format: "currency" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.aov, comparisonKpis.aov)
        : undefined,
      icon: TrendingUp,
    },
    {
      label: "Refunds",
      description: "Returned order value",
      value: kpis.refundAmount,
      format: "currency" as const,
      delta: comparisonKpis
        ? computeDelta(kpis.refundAmount, comparisonKpis.refundAmount)
        : undefined,
      icon: ReceiptText,
    },
    {
      label: "Coffee Sold",
      description: "Total weight shipped",
      value: totalCoffeeWeight,
      format: "number" as const,
      valueLabel: weightUnitLabel,
      icon: Weight,
    },
  ];

  return (
    <DashboardPageTemplate title={ADMIN_PAGES.sales.label} subtitle={ADMIN_PAGES.sales.description}>
      {/* Period selector + Export */}
      <DashboardToolbar onExport={handleExportCsv}>
        <DateRangePicker
          mode="state"
          period={period}
          compare={compare}
          onPeriodChange={handlePeriodChange}
          onCompareChange={handleCompareChange}
          hideCompare
        />
      </DashboardToolbar>

      {/* KPI cards */}
      <StatGrid columns={5}>
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </StatGrid>

      {/* Chart sections */}
      <SalesChartsSection data={data} weightUnit={weightUnit} />

      {/* Orders table */}
      <SalesOrdersSection
        table={salesTable}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        columnVisibility={columnVisibility}
        onVisibilityChange={handleVisibilityChange}
        totalOrders={data.table?.total ?? 0}
      />
    </DashboardPageTemplate>
  );
}
