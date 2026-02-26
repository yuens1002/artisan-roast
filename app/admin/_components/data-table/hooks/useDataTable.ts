"use client";

import type { ActiveFilter, FilterConfig } from "../types";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

export interface UseDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  filterConfigs: FilterConfig[];
  columnVisibility?: VisibilityState;
  globalFilterFn?: FilterFn<TData>;
  filterToColumnFilters?: (filter: ActiveFilter) => ColumnFiltersState;
  pageSize?: number;
  enableColumnResizing?: boolean;
  initialSorting?: SortingState;
}

export function useDataTable<TData>({
  data,
  columns,
  filterConfigs,
  columnVisibility,
  globalFilterFn,
  filterToColumnFilters,
  pageSize = 25,
  enableColumnResizing = true,
  initialSorting,
}: UseDataTableOptions<TData>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);

  const columnFilters = useMemo<ColumnFiltersState>(
    () =>
      activeFilter && filterToColumnFilters
        ? filterToColumnFilters(activeFilter)
        : [],
    [activeFilter, filterToColumnFilters]
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns unstable refs by design
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: searchQuery,
      columnFilters,
      ...(columnVisibility ? { columnVisibility } : {}),
    },
    onSortingChange: setSorting,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnResizing,
    columnResizeMode: "onChange",
    initialState: {
      pagination: { pageSize },
    },
  });

  return {
    table,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    filterConfigs,
  };
}
