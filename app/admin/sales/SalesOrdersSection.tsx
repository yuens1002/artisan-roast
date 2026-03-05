"use client";

import type { Table } from "@tanstack/react-table";
import { Filter, ShoppingCart } from "lucide-react";
import { ChartCard } from "@/app/admin/_components/analytics";
import {
  ColumnVisibilityToggle,
  DataTable,
  DataTableActionBar,
} from "@/app/admin/_components/data-table";
import type { ActiveFilter } from "@/app/admin/_components/data-table";
import type { SalesRow } from "@/lib/admin/analytics/contracts";
import { salesFilterConfigs, SALES_TOGGLABLE_COLUMNS } from "./sales-table-config";

interface SalesOrdersSectionProps {
  table: Table<SalesRow>;
  activeFilter: ActiveFilter | null;
  onFilterChange: (filter: ActiveFilter | null) => void;
  columnVisibility: Record<string, boolean>;
  onVisibilityChange: (columnId: string, visible: boolean) => void;
  totalOrders: number;
}

export function SalesOrdersSection({
  table,
  activeFilter,
  onFilterChange,
  columnVisibility,
  onVisibilityChange,
  totalOrders,
}: SalesOrdersSectionProps) {
  return (
    <ChartCard title="Orders" titleIcon={ShoppingCart} description="Individual order details">
      <DataTableActionBar
        config={{
          left: [
            {
              type: "filter",
              configs: salesFilterConfigs,
              activeFilter,
              onFilterChange,
              collapse: { icon: Filter },
            },
            {
              type: "custom",
              content: (
                <ColumnVisibilityToggle
                  columns={SALES_TOGGLABLE_COLUMNS}
                  columnVisibility={columnVisibility}
                  onVisibilityChange={onVisibilityChange}
                />
              ),
            },
          ],
          right: [
            {
              type: "recordCount",
              count: totalOrders,
              label: "orders",
            },
            { type: "pageSizeSelector", table },
            { type: "pagination", table },
          ],
        }}
      />
      <DataTable table={table} stickyHeader fitContainer />
    </ChartCard>
  );
}
