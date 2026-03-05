"use client";

import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { flexRender, type Header } from "@tanstack/react-table";

import type { DataTableColumnMeta } from "./types";

// Custom col-resize cursor — simple line drawing, no outline
const COL_RESIZE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'><path d='M11 4v16M13 4v16' stroke='%23333' stroke-width='1.5' stroke-linecap='round'/><path d='M7 8 3 12l4 4M17 8l4 4-4 4' stroke='%23333' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
const COL_RESIZE_CURSOR = `url("data:image/svg+xml,${COL_RESIZE_SVG}") 12 12, col-resize`;

interface DataTableHeaderCellProps<TData> {
  header: Header<TData, unknown>;
  /** Use minWidth instead of width (for fitContainer tables). */
  useMinWidth?: boolean;
  className?: string;
}

export function DataTableHeaderCell<TData>({
  header,
  useMinWidth,
  className,
}: DataTableHeaderCellProps<TData>) {
  const canSort = header.column.getCanSort();
  const sortState = header.column.getIsSorted();
  const canResize = header.column.getCanResize();
  const meta = header.column.columnDef.meta as
    | DataTableColumnMeta
    | undefined;

  const SortStateIcon =
    sortState === "asc" ? ArrowUp : sortState === "desc" ? ArrowDown : null;

  const handleSortClick = () => {
    if (!canSort) return;
    // 3-state cycling: unsorted → asc → desc → unsorted
    if (!sortState) {
      header.column.toggleSorting(false); // asc
    } else if (sortState === "asc") {
      header.column.toggleSorting(true); // desc
    } else {
      header.column.clearSorting(); // unsorted
    }
  };

  return (
    <th
      className={cn(
        "h-10 px-3 font-medium text-foreground border-b-2 align-middle",
        meta?.align === "center" ? "text-center" : meta?.align === "right" ? "text-right" : "text-left",
        "group/header relative select-none",
        // no static border-r — resize handle provides the visual separator
        sortState
          ? "border-b-foreground"
          : "border-b-border",
        meta?.pin === "left" &&
          "sticky left-0 z-30 bg-background after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border",
        className
      )}
      style={useMinWidth
        ? { minWidth: header.getSize() }
        : { width: header.getSize() }
      }
    >
      <div className={cn(
        "flex items-center",
        meta?.align === "center" && "justify-center",
        meta?.align === "right" && "justify-end"
      )}>
        {canSort ? (
          <button
            type="button"
            className="group/sort relative inline-flex items-center min-w-0 rounded-md outline-none cursor-pointer focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            onClick={handleSortClick}
          >
            {SortStateIcon && (
              <SortStateIcon className="mr-1 h-3.5 w-3.5 flex-shrink-0 text-foreground" />
            )}
            <span className="min-w-0 truncate">
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </span>
            <ArrowUpDown
              className={cn(
                "ml-1.5 h-3.5 w-3.5 flex-shrink-0 transition-opacity text-muted-foreground",
                "opacity-100 md:opacity-0 md:group-hover/hrow:opacity-100 md:group-focus-visible/sort:opacity-100"
              )}
            />
          </button>
        ) : (
          <span className="min-w-0 truncate">
            {header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext())}
          </span>
        )}

        {/* Resize handle — px-2 each side of cell boundary */}
        {canResize && (
          <div
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            style={{ cursor: COL_RESIZE_CURSOR }}
            className={cn(
              "absolute -right-2 top-0 h-full w-4 select-none touch-none z-20",
              "after:absolute after:left-1/2 after:-translate-x-1/2 after:top-0 after:h-full after:w-px",
              "after:bg-border after:opacity-0 sm:after:opacity-100 md:after:opacity-0 md:group-hover/hrow:after:opacity-100",
              "hover:after:!bg-foreground hover:after:opacity-100 active:after:!bg-foreground",
              header.column.getIsResizing() && "after:!bg-foreground after:!opacity-100"
            )}
          />
        )}
      </div>
    </th>
  );
}
