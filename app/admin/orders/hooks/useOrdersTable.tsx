"use client";

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
  CustomerCell,
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

// ── Types ────────────────────────────────────────────────────────────

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalInCents: number;
  deliveryMethod: string;
  customerEmail: string;
  customerPhone: string | null;
  recipientName: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  stripeSubscriptionId: string | null;
  taxAmountInCents: number;
  shippingAmountInCents: number;
  refundedAmountInCents: number;
  refundedAt: string | null;
  refundReason: string | null;
  createdAt: string;
  trackingNumber: string | null;
  carrier: string | null;
  user: {
    name: string | null;
    email: string;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    priceInCents: number;
    refundedQuantity: number;
    purchaseOption: {
      type: "ONE_TIME" | "SUBSCRIPTION";
      priceInCents: number;
      billingInterval?: string | null;
      billingIntervalCount?: number | null;
      variant: {
        name: string;
        product: {
          id: string;
          name: string;
        };
      };
    };
  }>;
};

// ── Filters ─────────────────────────────────────────────────────────

const globalFilterFn: FilterFn<Order> = (row, _columnId, filterValue) => {
  if (!filterValue) return true;
  const query = String(filterValue).toLowerCase();
  const order = row.original;
  const searchable = [
    order.orderNumber ?? order.id.slice(-8),
    order.user?.name ?? "",
    order.customerEmail,
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

interface UseOrdersTableOptions {
  orders: Order[];
  getActionItems: (order: Order) => RowActionItem[];
  columnVisibility?: Record<string, boolean>;
}

export function useOrdersTable({
  orders,
  getActionItems,
  columnVisibility,
}: UseOrdersTableOptions) {
  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        id: "orderNumber",
        accessorFn: (row) => row.orderNumber || row.id.slice(-8),
        header: "Order #",
        size: 110,
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
            <div>{format(new Date(row.original.createdAt), "MMM d, yyyy")}</div>
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
        id: "customer",
        accessorFn: (row) =>
          row.user?.name || row.recipientName || "Guest",
        header: "Customer",
        size: 180,
        enableSorting: true,
        enableResizing: false,
        cell: ({ row }) => (
          <CustomerCell
            name={row.original.user?.name || row.original.recipientName}
            email={row.original.customerEmail}
            phone={row.original.customerPhone}
          />
        ),
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
        size: 220,
        enableSorting: true,
        enableResizing: true,
        cell: ({ row }) => (
          <ItemsCell
            items={row.original.items.map((item) => ({
              key: item.id,
              name: item.purchaseOption.variant.product.name,
              variant: item.purchaseOption.variant.name,
              quantity: item.quantity,
              cadence: formatCadence(
                item.purchaseOption.billingInterval,
                item.purchaseOption.billingIntervalCount
              ),
              refundedQuantity: item.refundedQuantity,
              productHref: `/admin/products/${item.purchaseOption.variant.product.id}`,
            }))}
          />
        ),
      },
      {
        id: "shipTo",
        accessorFn: (row) =>
          row.shippingStreet
            ? `${row.recipientName ?? ""} ${row.shippingCity ?? ""}`
            : "Store Pickup",
        header: "Ship To",
        size: 200,
        enableSorting: false,
        enableResizing: true,
        cell: ({ row }) => {
          const order = row.original;
          return (
            <ShippingAddressDisplay
              recipientName={order.recipientName}
              phone={order.customerPhone}
              street={
                order.deliveryMethod === "DELIVERY"
                  ? order.shippingStreet
                  : null
              }
              city={order.shippingCity}
              state={order.shippingState}
              postalCode={order.shippingPostalCode}
              country={order.shippingCountry}
              showCountry
              countryDisplayFormat="full"
              muteAddressLines
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
        cell: ({ row }) => (
          <StatusCell
            status={row.original.status}
            colorClassName={
              row.original.status === "PICKED_UP"
                ? "bg-purple-100 text-purple-800"
                : undefined
            }
          />
        ),
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
          return <RowActionMenu items={items} />;
        },
      },
    ],
    [getActionItems]
  );

  const filterConfigs = ORDER_FILTER_CONFIGS;

  const tableResult = useDataTable({
    data: orders,
    columns,
    filterConfigs,
    columnVisibility,
    globalFilterFn,
    filterToColumnFilters: orderFilterToColumnFilters,
    initialSorting: [{ id: "date", desc: true }],
    storageKey: "admin-orders-table",
  });

  return {
    ...tableResult,
    getActionItems,
  };
}
