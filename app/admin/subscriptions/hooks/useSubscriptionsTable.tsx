"use client";

import type { DataTableColumnMeta } from "@/components/shared/data-table";
import {
  RowActionMenu,
  type RowActionItem,
} from "@/components/shared/data-table/RowActionMenu";
import { useDataTable } from "@/components/shared/data-table/hooks";
import type {
  ActiveFilter,
  FilterConfig,
} from "@/components/shared/data-table/types";
import type { DateRangeFilterValue } from "@/components/shared/data-table/DataTableFilter";
import { ShippingAddressDisplay } from "@/components/shared/ShippingAddressDisplay";
import { formatPrice } from "@/components/shared/record-utils";
import {
  CustomerCell,
  ItemsCell,
  StatusCell,
} from "@/components/shared/data-table/cells";
import type {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
} from "@tanstack/react-table";
import { format, isWithinInterval } from "date-fns";
import { useCallback, useMemo } from "react";

// ── Types ────────────────────────────────────────────────────────────

export type Subscription = {
  id: string;
  stripeSubscriptionId: string;
  status: "ACTIVE" | "PAUSED" | "CANCELED" | "PAST_DUE";
  priceInCents: number;
  deliverySchedule: string | null;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  pausedUntil: Date | null;
  productNames: string[];
  quantities: number[];
  recipientName: string | null;
  recipientPhone: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  createdAt: Date;
  mostRecentOrderId: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
};

// ── Filters ─────────────────────────────────────────────────────────

const globalFilterFn: FilterFn<Subscription> = (
  row,
  _columnId,
  filterValue
) => {
  if (!filterValue) return true;
  const query = String(filterValue).toLowerCase();
  const sub = row.original;
  const searchable = [
    sub.user?.name ?? "",
    sub.user?.email ?? "",
    ...sub.productNames,
    sub.recipientName ?? "",
    sub.shippingCity ?? "",
    sub.shippingState ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return searchable.includes(query);
};

function getNextDateDisplay(sub: Subscription): string {
  if (sub.status === "CANCELED") return "---";
  if (sub.status === "PAUSED") {
    if (sub.pausedUntil)
      return format(new Date(sub.pausedUntil), "MMM d, yyyy");
    return "---";
  }
  return format(new Date(sub.currentPeriodEnd), "MMM d, yyyy");
}

// ── Hook ─────────────────────────────────────────────────────────────

interface UseSubscriptionsTableOptions {
  subscriptions: Subscription[];
  getActionItems: (sub: Subscription) => RowActionItem[];
}

export function useSubscriptionsTable({
  subscriptions,
  getActionItems,
}: UseSubscriptionsTableOptions) {
  const columns = useMemo<ColumnDef<Subscription, unknown>[]>(
    () => [
      {
        id: "orderNumber",
        accessorFn: (row) => row.id.slice(-8),
        header: "Order #",
        size: 100,
        enableSorting: false,
        enableResizing: true,
        meta: { cellClassName: "font-medium" } satisfies DataTableColumnMeta,
      },
      {
        id: "schedule",
        accessorFn: (row) => row.deliverySchedule ?? "",
        header: "Schedule",
        size: 140,
        enableSorting: true,
        enableResizing: true,
        cell: ({ row }) => row.original.deliverySchedule || "---",
      },
      {
        id: "nextDate",
        accessorFn: (row) => {
          if (row.status === "CANCELED") return 0;
          if (row.status === "PAUSED" && row.pausedUntil)
            return new Date(row.pausedUntil).getTime();
          if (row.status === "PAUSED") return 0;
          return new Date(row.currentPeriodEnd).getTime();
        },
        header: "Next / Resumes",
        size: 130,
        enableSorting: true,
        enableResizing: true,
        cell: ({ row }) => getNextDateDisplay(row.original),
        filterFn: (row, _columnId, filterValue: DateRangeFilterValue) => {
          if (!filterValue?.from || !filterValue?.to) return true;
          const sub = row.original;
          if (sub.status === "CANCELED") return false;
          const date =
            sub.status === "PAUSED" && sub.pausedUntil
              ? new Date(sub.pausedUntil)
              : new Date(sub.currentPeriodEnd);
          return isWithinInterval(date, {
            start: filterValue.from,
            end: filterValue.to,
          });
        },
      },
      {
        id: "customer",
        accessorFn: (row) =>
          row.user?.name || row.recipientName || "---",
        header: "Customer",
        size: 180,
        enableSorting: true,
        enableResizing: true,
        cell: ({ row }) => (
          <CustomerCell
            name={row.original.user?.name || row.original.recipientName}
            email={row.original.user?.email}
            phone={row.original.recipientPhone}
            fallback="---"
          />
        ),
      },
      {
        id: "items",
        accessorFn: (row) => row.productNames.join(", "),
        header: "Items",
        size: 200,
        enableSorting: true,
        enableResizing: true,
        cell: ({ row }) => {
          const { productNames, quantities } = row.original;
          if (productNames.length === 0) return "---";
          return (
            <ItemsCell
              items={productNames.map((name, idx) => {
                const dashIdx = name.lastIndexOf(" - ");
                const productName = dashIdx > 0 ? name.slice(0, dashIdx) : name;
                const variant = dashIdx > 0 ? name.slice(dashIdx + 3) : undefined;
                return {
                  key: String(idx),
                  name: productName,
                  variant,
                  quantity: quantities[idx] ?? 1,
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
            : "No address",
        header: "Ship To",
        size: 200,
        enableSorting: false,
        enableResizing: true,
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <ShippingAddressDisplay
              recipientName={sub.recipientName}
              phone={sub.recipientPhone}
              street={sub.shippingStreet}
              city={sub.shippingCity}
              state={sub.shippingState}
              postalCode={sub.shippingPostalCode}
              country={sub.shippingCountry}
              showCountry
              countryDisplayFormat="full"
              fallbackText="No address"
            />
          );
        },
      },
      {
        id: "total",
        accessorFn: (row) => row.priceInCents,
        header: "Total",
        size: 100,
        enableSorting: true,
        enableResizing: false,
        meta: { cellClassName: "text-right", align: "right" } satisfies DataTableColumnMeta,
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {formatPrice(row.original.priceInCents)}
          </div>
        ),
        filterFn: (
          row,
          _columnId,
          filterValue: { operator: string; num: number } | null
        ) => {
          if (!filterValue || typeof filterValue.num !== "number") return true;
          const val = row.original.priceInCents;
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
        accessorFn: (row) =>
          row.cancelAtPeriodEnd ? "Canceling" : row.status,
        header: "Status",
        size: 110,
        enableSorting: true,
        enableResizing: false,
        meta: { align: "center" } satisfies DataTableColumnMeta,
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <StatusCell
              status={sub.status}
              label={sub.cancelAtPeriodEnd ? "Canceling" : undefined}
              colorClassName={
                sub.cancelAtPeriodEnd
                  ? "bg-orange-100 text-orange-800"
                  : sub.status === "CANCELED"
                    ? "bg-gray-100 text-gray-800"
                    : undefined
              }
            />
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
          const items = getActionItems(row.original);
          if (items.length === 0) return null;
          return <RowActionMenu items={items} />;
        },
      },
    ],
    [getActionItems]
  );

  const filterConfigs = useMemo<FilterConfig[]>(
    () => [
      {
        id: "nextDate",
        label: "Date",
        shellLabel: "dates",
        filterType: "dateRange",
      },
      {
        id: "total",
        label: "Total",
        shellLabel: "total $",
        filterType: "comparison",
      },
    ],
    []
  );

  const filterToColumnFilters = useCallback(
    (filter: ActiveFilter): ColumnFiltersState => {
      if (filter.configId === "nextDate" && filter.value) {
        return [
          { id: "nextDate", value: filter.value as DateRangeFilterValue },
        ];
      }
      if (filter.configId === "total" && typeof filter.value === "number") {
        return [
          {
            id: "total",
            value: { operator: filter.operator ?? "=", num: filter.value },
          },
        ];
      }
      return [];
    },
    []
  );

  const tableResult = useDataTable({
    data: subscriptions,
    columns,
    filterConfigs,
    globalFilterFn,
    filterToColumnFilters,
    initialSorting: [{ id: "nextDate", desc: false }],
    storageKey: "admin-subs-table",
  });

  return {
    ...tableResult,
    getActionItems,
  };
}
