"use client";

import { Check, PenLine } from "lucide-react";
import type { DataTableColumnMeta } from "@/components/shared/data-table";
import {
  RowActionMenu,
  type RowActionItem,
} from "@/components/shared/data-table/RowActionMenu";
import { useDataTable } from "@/components/shared/data-table/hooks";
import type { DateRangeFilterValue } from "@/components/shared/data-table/DataTableFilter";
import {
  getPurchaseType,
  formatCadence,
  ORDER_FILTER_CONFIGS,
  orderFilterToColumnFilters,
} from "@/components/shared/order-utils";
import { ShippingAddressDisplay } from "@/components/shared/ShippingAddressDisplay";
import { formatPrice } from "@/components/shared/record-utils";
import {
  ItemsCell,
  TypeCell,
  StatusCell,
} from "@/components/shared/data-table/cells";
import type {
  ColumnDef,
  FilterFn,
} from "@tanstack/react-table";
import { format, isWithinInterval } from "date-fns";
import { useMemo } from "react";
import type { OrderWithItems } from "@/lib/types";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import { ProductType } from "@prisma/client";

// ── Helpers ──────────────────────────────────────────────────────────

function placeholderCategory(item: OrderWithItems["items"][number]) {
  return item.purchaseOption.variant.product.type === ProductType.MERCH
    ? ("culture" as const)
    : ("beans" as const);
}

// ── Filters ─────────────────────────────────────────────────────────

const globalFilterFn: FilterFn<OrderWithItems> = (
  row,
  _columnId,
  filterValue
) => {
  if (!filterValue) return true;
  const query = String(filterValue).toLowerCase();
  const order = row.original;
  const searchable = [
    ...order.items.map(
      (i) =>
        `${i.purchaseOption.variant.product.name} ${i.purchaseOption.variant.name}`
    ),
    order.recipientName ?? "",
    order.shippingCity ?? "",
    order.shippingState ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return searchable.includes(query);
};

// ── Hook ─────────────────────────────────────────────────────────────

interface UseUserOrdersTableOptions {
  orders: OrderWithItems[];
  getActionItems: (order: OrderWithItems) => RowActionItem[];
  reviewedProductIds: Set<string>;
}

export function useUserOrdersTable({
  orders,
  getActionItems,
  reviewedProductIds,
}: UseUserOrdersTableOptions) {
  const columns = useMemo<ColumnDef<OrderWithItems, unknown>[]>(
    () => [
      {
        id: "orderNumber",
        accessorFn: (row) => row.orderNumber || row.id.slice(-8),
        header: "Order #",
        size: 100,
        enableSorting: false,
        enableResizing: false,
        meta: { cellClassName: "font-medium" } satisfies DataTableColumnMeta,
      },
      {
        id: "date",
        accessorFn: (row) => new Date(row.createdAt),
        header: "Date",
        size: 120,
        enableSorting: true,
        enableResizing: false,
        cell: ({ row }) => (
          <div>
            <div>
              {format(new Date(row.original.createdAt), "MMM d, yyyy")}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(row.original.createdAt), "h:mm a")}
            </div>
          </div>
        ),
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
        id: "type",
        accessorFn: (row) => getPurchaseType(row),
        header: "Frequency",
        size: 110,
        enableSorting: true,
        enableResizing: false,
        meta: { align: "center" } satisfies DataTableColumnMeta,
        cell: ({ row }) => (
          <TypeCell type={getPurchaseType(row.original)} />
        ),
        filterFn: (row, _columnId, filterValue: string[]) => {
          if (!filterValue || filterValue.length === 0) return true;
          const type = getPurchaseType(row.original);
          return filterValue.includes(type);
        },
      },
      {
        id: "items",
        accessorFn: (row) =>
          row.items
            .map((i) => i.purchaseOption.variant.product.name)
            .join(", "),
        header: "Items",
        size: 280,
        enableSorting: true,
        enableResizing: true,
        cell: ({ row }) => {
          const order = row.original;
          const isFullRefund =
            order.refundedAmountInCents >= order.totalInCents;
          return (
            <ItemsCell
              strikethrough={isFullRefund}
              items={order.items.map((item) => {
                const product = item.purchaseOption.variant.product;
                const isReviewed = reviewedProductIds.has(product.id);
                const canReview =
                  order.status === "DELIVERED" &&
                  order.deliveredAt &&
                  (Date.now() - new Date(order.deliveredAt).getTime()) /
                    (1000 * 60 * 60 * 24) >=
                    7 &&
                  order.refundedAmountInCents < order.totalInCents;
                return {
                  key: item.id,
                  name: product.name,
                  variant: item.purchaseOption.variant.name,
                  quantity: item.quantity,
                  cadence: formatCadence(
                    item.purchaseOption.billingInterval,
                    item.purchaseOption.billingIntervalCount
                  ),
                  refundedQuantity: item.refundedQuantity,
                  imageUrl:
                    item.purchaseOption.variant.images?.[0]?.url ??
                    getPlaceholderImage(
                      product.name,
                      400,
                      placeholderCategory(item)
                    ),
                  productHref: `/products/${product.slug}`,
                  inlineAction: canReview ? (
                    isReviewed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Check className="h-3 w-3" /> Reviewed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <PenLine className="h-3 w-3" /> Review
                      </span>
                    )
                  ) : undefined,
                };
              })}
            />
          );
        },
      },
      {
        id: "shipTo",
        accessorFn: (row) =>
          row.shippingStreet
            ? `${row.recipientName ?? ""} ${row.shippingCity ?? ""}`
            : "Store Pickup",
        header: "Ship To",
        size: 180,
        enableSorting: false,
        enableResizing: true,
        cell: ({ row }) => {
          const order = row.original;
          return (
            <ShippingAddressDisplay
              recipientName={order.recipientName}
              street={
                order.deliveryMethod === "DELIVERY"
                  ? order.shippingStreet
                  : null
              }
              city={order.shippingCity}
              state={order.shippingState}
              postalCode={order.shippingPostalCode}
              mutedClassName="text-muted-foreground"
              muteAddressLines
              normalPickupFont
            />
          );
        },
      },
      {
        id: "total",
        accessorFn: (row) => row.totalInCents,
        header: "Total",
        size: 110,
        enableSorting: true,
        enableResizing: false,
        meta: { cellClassName: "text-right", align: "right" } satisfies DataTableColumnMeta,
        cell: ({ row }) => {
          const order = row.original;
          if (order.refundedAmountInCents > 0) {
            return (
              <div className="text-right">
                <span className="line-through text-muted-foreground">
                  {formatPrice(order.totalInCents)}
                </span>
                <div className="text-sm font-semibold text-red-600">
                  -{formatPrice(order.refundedAmountInCents)}
                </div>
              </div>
            );
          }
          return (
            <div className="text-right">
              {formatPrice(order.totalInCents)}
            </div>
          );
        },
        filterFn: (
          row,
          _columnId,
          filterValue: { operator: string; num: number } | null
        ) => {
          if (!filterValue || typeof filterValue.num !== "number") return true;
          const val = row.original.totalInCents;
          const centsTarget = filterValue.num * 100;
          switch (filterValue.operator) {
            case "=":
              return val === centsTarget;
            case "\u2265":
              return val >= centsTarget;
            case "\u2264":
              return val <= centsTarget;
            default:
              return true;
          }
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        size: 110,
        enableSorting: true,
        enableResizing: false,
        meta: { align: "center" } satisfies DataTableColumnMeta,
        cell: ({ row }) => <StatusCell status={row.original.status} />,
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
          const items = getActionItems(row.original);
          if (items.length === 0) return null;
          return <RowActionMenu items={items} />;
        },
      },
    ],
    [getActionItems, reviewedProductIds]
  );

  const filterConfigs = ORDER_FILTER_CONFIGS;

  const tableResult = useDataTable({
    data: orders,
    columns,
    filterConfigs,
    globalFilterFn,
    filterToColumnFilters: orderFilterToColumnFilters,
    initialSorting: [{ id: "date", desc: true }],
    storageKey: "user-orders-table",
  });

  return {
    ...tableResult,
    getActionItems,
  };
}
