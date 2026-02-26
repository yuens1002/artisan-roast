"use client";

import type { DataTableColumnMeta } from "@/app/admin/_components/data-table";
import {
  RowActionMenu,
  type RowActionItem,
} from "@/app/admin/_components/data-table/RowActionMenu";
import { useDataTable } from "@/app/admin/_components/data-table/hooks";
import type {
  ActiveFilter,
  FilterConfig,
} from "@/app/admin/_components/data-table/types";
import type { DateRangeFilterValue } from "@/app/admin/_components/data-table/DataTableFilter";
import { StarRating } from "@/app/(site)/_components/product/StarRating";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ReviewDetailCard } from "../_components/ReviewDetailCard";
import type { ColumnDef, ColumnFiltersState, FilterFn } from "@tanstack/react-table";
import { formatDistanceToNow, isWithinInterval } from "date-fns";
import { useCallback, useMemo } from "react";
import { Flag, CheckCircle, Trash2, MessageSquare, Pencil } from "lucide-react";

export interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  status: "PUBLISHED" | "FLAGGED" | "PENDING";
  flagReason: string | null;
  adminResponse: string | null;
  brewMethod: string | null;
  grindSize: string | null;
  waterTempF: number | null;
  ratio: string | null;
  tastingNotes: string[];
  createdAt: string;
  product: { name: string; slug: string };
  user: { name: string | null; email: string | null; image: string | null };
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FLAGGED: "bg-amber-50 text-amber-700 border-amber-200",
  PENDING: "bg-blue-50 text-blue-700 border-blue-200",
};

const multiFieldFilter: FilterFn<AdminReview> = (
  row,
  _columnId,
  filterValue
) => {
  if (!filterValue) return true;
  const query = String(filterValue).toLowerCase();
  const review = row.original;
  const searchable = [
    review.product.name,
    review.user.name ?? "",
    review.user.email ?? "",
    review.title ?? "",
    review.content,
  ]
    .join(" ")
    .toLowerCase();
  return searchable.includes(query);
};

interface UseReviewsTableOptions {
  reviews: AdminReview[];
  onFlag: (review: AdminReview) => void;
  onApprove: (review: AdminReview) => void;
  onReply: (review: AdminReview) => void;
  onDelete: (review: AdminReview) => void;
}

function getActionItems(
  review: AdminReview,
  onFlag: (r: AdminReview) => void,
  onApprove: (r: AdminReview) => void,
  onReply: (r: AdminReview) => void,
  onDelete: (r: AdminReview) => void
): RowActionItem[] {
  switch (review.status) {
    case "PUBLISHED":
      return [
        {
          type: "item",
          label: "Flag",
          icon: Flag,
          onClick: () => onFlag(review),
        },
        {
          type: "item",
          label: review.adminResponse ? "Edit Reply" : "Reply",
          icon: MessageSquare,
          onClick: () => onReply(review),
        },
        { type: "separator" },
        {
          type: "item",
          label: "Delete",
          icon: Trash2,
          variant: "destructive",
          onClick: () => onDelete(review),
        },
      ];
    case "FLAGGED":
      return [
        {
          type: "item",
          label: "Approve",
          icon: CheckCircle,
          onClick: () => onApprove(review),
        },
        {
          type: "item",
          label: "Edit Flag",
          icon: Pencil,
          onClick: () => onFlag(review),
        },
        {
          type: "item",
          label: review.adminResponse ? "Edit Reply" : "Reply",
          icon: MessageSquare,
          onClick: () => onReply(review),
        },
        { type: "separator" },
        {
          type: "item",
          label: "Delete",
          icon: Trash2,
          variant: "destructive",
          onClick: () => onDelete(review),
        },
      ];
    case "PENDING":
      return [
        {
          type: "item",
          label: "Approve",
          icon: CheckCircle,
          onClick: () => onApprove(review),
        },
        {
          type: "item",
          label: "Flag",
          icon: Flag,
          onClick: () => onFlag(review),
        },
        { type: "separator" },
        {
          type: "item",
          label: "Delete",
          icon: Trash2,
          variant: "destructive",
          onClick: () => onDelete(review),
        },
      ];
    default:
      return [];
  }
}

export function useReviewsTable({
  reviews,
  onFlag,
  onApprove,
  onReply,
  onDelete,
}: UseReviewsTableOptions) {
  const columns = useMemo<ColumnDef<AdminReview, unknown>[]>(
    () => [
      {
        id: "date",
        accessorFn: (row) => new Date(row.createdAt),
        header: "Date",
        size: 120,
        enableSorting: true,
        enableResizing: true,
        cell: ({ row }) =>
          formatDistanceToNow(new Date(row.original.createdAt), {
            addSuffix: true,
          }),
        filterFn: (row, _columnId, filterValue: DateRangeFilterValue) => {
          if (!filterValue?.from || !filterValue?.to) return true;
          const date = new Date(row.original.createdAt);
          return isWithinInterval(date, {
            start: filterValue.from,
            end: filterValue.to,
          });
        },
      },
      {
        id: "customer",
        accessorFn: (row) =>
          row.user.name ?? row.user.email?.split("@")[0] ?? "Unknown",
        header: "Customer",
        size: 140,
        enableSorting: true,
        enableResizing: true,
      },
      {
        id: "product",
        accessorFn: (row) => row.product.name,
        header: "Product",
        size: 180,
        enableSorting: true,
        enableResizing: true,
        meta: { cellClassName: "font-medium" } satisfies DataTableColumnMeta,
      },
      {
        id: "content",
        header: "Content",
        size: 280,
        enableSorting: false,
        enableResizing: true,
        cell: ({ row }) => {
          const review = row.original;
          return (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="line-clamp-2 cursor-pointer">
                  {review.title && (
                    <span className="font-medium">{review.title} </span>
                  )}
                  <span className="text-muted-foreground">
                    {review.content}
                  </span>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 max-w-md">
                <ReviewDetailCard review={review} />
              </HoverCardContent>
            </HoverCard>
          );
        },
      },
      {
        id: "rating",
        accessorKey: "rating",
        header: "\u2605",
        size: 80,
        enableSorting: true,
        enableResizing: false,
        cell: ({ row }) => (
          <StarRating rating={row.original.rating} size="sm" />
        ),
        filterFn: (row, _columnId, filterValue: string[]) => {
          if (!filterValue || filterValue.length === 0) return true;
          return filterValue.includes(String(row.original.rating));
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        size: 100,
        enableSorting: true,
        enableResizing: false,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <span
              className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_BADGE_CLASSES[status] ?? ""}`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        enableResizing: false,
        meta: {
          cellClassName: "align-middle text-center",
        } satisfies DataTableColumnMeta,
        cell: ({ row }) => {
          const items = getActionItems(
            row.original,
            onFlag,
            onApprove,
            onReply,
            onDelete
          );
          return <RowActionMenu items={items} />;
        },
      },
    ],
    [onFlag, onApprove, onReply, onDelete]
  );

  const filterConfigs = useMemo<FilterConfig[]>(
    () => [
      {
        id: "date",
        label: "Dates",
        shellLabel: "dates",
        filterType: "dateRange",
      },
      {
        id: "rating",
        label: "Rating",
        filterType: "multiSelect",
        options: [
          { label: "\u2605\u2605\u2605\u2605\u2605", value: "5" },
          { label: "\u2605\u2605\u2605\u2605\u2606", value: "4" },
          { label: "\u2605\u2605\u2605\u2606\u2606", value: "3" },
          { label: "\u2605\u2605\u2606\u2606\u2606", value: "2" },
          { label: "\u2605\u2606\u2606\u2606\u2606", value: "1" },
        ],
      },
    ],
    []
  );

  const filterToColumnFilters = useCallback(
    (filter: ActiveFilter): ColumnFiltersState => {
      if (filter.configId === "date" && filter.value) {
        const dateRange = filter.value as DateRangeFilterValue;
        return [{ id: "date", value: dateRange }];
      }
      if (filter.configId === "rating" && Array.isArray(filter.value)) {
        return filter.value.length > 0
          ? [{ id: "rating", value: filter.value }]
          : [];
      }
      return [];
    },
    []
  );

  const tableResult = useDataTable({
    data: reviews,
    columns,
    filterConfigs,
    globalFilterFn: multiFieldFilter,
    filterToColumnFilters,
    initialSorting: [{ id: "date", desc: true }],
  });

  return {
    ...tableResult,
    getActionItems: (review: AdminReview) =>
      getActionItems(review, onFlag, onApprove, onReply, onDelete),
  };
}
