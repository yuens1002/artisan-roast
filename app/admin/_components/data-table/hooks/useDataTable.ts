"use client";

import type { ActiveFilter, FilterConfig } from "../types";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type PaginationState,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// localStorage helpers (same pattern as useColumnVisibility)
// ---------------------------------------------------------------------------

interface StoredTableState {
  searchQuery?: string;
  activeFilter?: ActiveFilter | null;
  pageSize?: number;
}

function loadTableState(key: string): StoredTableState | null {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore parse errors
  }
  return null;
}

function saveTableState(key: string, state: StoredTableState) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Validate a restored filter: ensure the configId exists in current
 * filter configs and skip dateRange filters (time-sensitive).
 */
function validateRestoredFilter(
  filter: ActiveFilter | null | undefined,
  configs: FilterConfig[]
): ActiveFilter | null {
  if (!filter) return null;
  const config = configs.find((c) => c.id === filter.configId);
  if (!config) return null;
  if (config.filterType === "dateRange") return null;
  return filter;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface ServerSideOptions {
  /** Total number of rows across all pages (from API response) */
  totalRows: number;
}

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
  /** localStorage key — when set, search/filter/pageSize are persisted */
  storageKey?: string;
  /** Enable server-side pagination, sorting, and filtering */
  serverSide?: ServerSideOptions;
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
  storageKey,
  serverSide,
}: UseDataTableOptions<TData>) {
  // Load persisted state once on mount
  const stored = useRef(storageKey ? loadTableState(storageKey) : null);

  const restoredFilter = useMemo(
    () => validateRestoredFilter(stored.current?.activeFilter, filterConfigs),
    // Only compute once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [searchQuery, setSearchQuery] = useState(
    stored.current?.searchQuery ?? ""
  );
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(
    restoredFilter
  );
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: stored.current?.pageSize ?? pageSize,
  });

  // Persist search, filter, and page size to localStorage
  useEffect(() => {
    if (!storageKey) return;
    saveTableState(storageKey, {
      searchQuery,
      activeFilter,
      pageSize: pagination.pageSize,
    });
  }, [storageKey, searchQuery, activeFilter, pagination.pageSize]);

  const columnFilters = useMemo<ColumnFiltersState>(
    () =>
      activeFilter && filterToColumnFilters
        ? filterToColumnFilters(activeFilter)
        : [],
    [activeFilter, filterToColumnFilters]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
      globalFilter: searchQuery,
      columnFilters,
      ...(columnVisibility ? { columnVisibility } : {}),
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    // Server-side mode: skip client-side processing
    ...(serverSide
      ? {
          manualPagination: true,
          manualSorting: true,
          manualFiltering: true,
          rowCount: serverSide.totalRows,
        }
      : {
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          getPaginationRowModel: getPaginationRowModel(),
        }),
    enableColumnResizing,
    columnResizeMode: "onChange",
  });

  return {
    table,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    filterConfigs,
    sorting,
    pagination,
  };
}
