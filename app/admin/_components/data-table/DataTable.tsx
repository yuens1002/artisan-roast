"use client";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { flexRender, type Table } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { DataTableHeaderCell } from "./DataTableHeaderCell";
import { DataTableShell } from "./DataTableShell";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import type { DataTableColumnMeta } from "./types";

interface DataTableProps<TData> {
  table: Table<TData>;
  onRowDoubleClick?: (row: TData) => void;
  emptyMessage?: string;
}

const PIN_LEFT_CLASS = "sticky left-0 z-30 bg-background after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border";

const RESPONSIVE_CLASSES: Record<string, string> = {
  desktop: "hidden sm:table-cell",
  mobile: "sm:hidden",
};

function getMetaClasses(meta: DataTableColumnMeta | undefined) {
  const classes: string[] = [];
  if (meta?.pin === "left") classes.push(PIN_LEFT_CLASS);
  if (meta?.responsive && RESPONSIVE_CLASSES[meta.responsive]) {
    classes.push(RESPONSIVE_CLASSES[meta.responsive]);
  }
  return classes.join(" ");
}

export function DataTable<TData>({
  table,
  onRowDoubleClick,
  emptyMessage = "No results found.",
}: DataTableProps<TData>) {
  const isMobile = useMediaQuery("(max-width: 767px)");

  // All filtered+sorted rows (bypasses pagination) for mobile infinite scroll
  const allRows = table.getPrePaginationRowModel().rows;
  const paginatedRows = table.getRowModel().rows;
  const batchSize = table.getState().pagination.pageSize;

  const { visibleCount, sentinelRef, hasMore, reset } = useInfiniteScroll({
    totalCount: allRows.length,
    batchSize,
  });

  // Reset infinite scroll when filters/search/sorting change
  const state = table.getState();
  const resetKey = `${state.globalFilter}|${JSON.stringify(state.columnFilters)}|${JSON.stringify(state.sorting)}`;
  const prevResetKey = useRef(resetKey);
  useEffect(() => {
    if (resetKey !== prevResetKey.current) {
      prevResetKey.current = resetKey;
      reset();
    }
  }, [resetKey, reset]);

  // On resize from mobile→desktop, no action needed — paginatedRows already correct
  const rows = isMobile ? allRows.slice(0, visibleCount) : paginatedRows;

  return (
    <DataTableShell>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="hover:bg-transparent group/hrow border-b-2 border-border">
            {headerGroup.headers.map((header) => {
              if (!header.column.getIsVisible()) return null;
              const meta = header.column.columnDef.meta as
                | DataTableColumnMeta
                | undefined;
              return (
                <DataTableHeaderCell
                  key={header.id}
                  header={header}
                  className={getMetaClasses(meta)}
                />
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={table.getVisibleLeafColumns().length}
              className="text-center py-8 text-muted-foreground"
            >
              {emptyMessage}
            </td>
          </tr>
        ) : (
          <>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "hover:bg-muted/40 border-b last:border-b-0 group/row",
                  onRowDoubleClick && "cursor-pointer"
                )}
                title={onRowDoubleClick ? "Double-click to edit" : undefined}
                onDoubleClick={
                  onRowDoubleClick
                    ? () => onRowDoubleClick(row.original)
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | DataTableColumnMeta
                    | undefined;
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3 py-2 align-top",
                        getMetaClasses(meta),
                        meta?.cellClassName
                      )}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {isMobile && hasMore && (
              <tr>
                <td
                  ref={sentinelRef as React.RefObject<HTMLTableCellElement>}
                  colSpan={table.getVisibleLeafColumns().length}
                  className="text-center py-4"
                >
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            )}
          </>
        )}
      </tbody>
    </DataTableShell>
  );
}
