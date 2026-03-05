import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { FilterConfig, ActiveFilter } from "@/app/admin/_components/data-table";
import type { SalesRow } from "@/lib/admin/analytics/contracts";
import { formatCurrency, formatStatus } from "@/lib/admin/analytics/formatters";

// ── Filter configs ───────────────────────────────────────────────────

export const salesFilterConfigs: FilterConfig[] = [
  {
    id: "orderType",
    label: "Type",
    filterType: "multiSelect",
    options: [
      { label: "Subscription", value: "SUBSCRIPTION" },
      { label: "One-time", value: "ONE_TIME" },
    ],
  },
  {
    id: "status",
    label: "Status",
    filterType: "multiSelect",
    options: [
      { label: "Pending", value: "PENDING" },
      { label: "Paid", value: "PAID" },
      { label: "Shipped", value: "SHIPPED" },
      { label: "Delivered", value: "DELIVERED" },
      { label: "Cancelled", value: "CANCELLED" },
      { label: "Refunded", value: "REFUNDED" },
    ],
  },
  { id: "amount", label: "Amount", shellLabel: "amount $", filterType: "comparison" },
];

// ── Column visibility toggle config ──────────────────────────────────

export const SALES_TOGGLABLE_COLUMNS = [
  { id: "createdAt", label: "Date" },
  { id: "customerEmail", label: "Customer" },
  { id: "itemCount", label: "Items" },
  { id: "orderType", label: "Type" },
  { id: "status", label: "Status" },
  { id: "total", label: "Total" },
  { id: "refunded", label: "Refunded" },
  { id: "location", label: "Location" },
];

// ── Column definitions ───────────────────────────────────────────────

export const salesColumns: ColumnDef<SalesRow, unknown>[] = [
  {
    accessorKey: "orderNumber",
    header: "Order #",
    size: 100,
    cell: ({ row }) => row.original.orderNumber,
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    size: 110,
    enableSorting: true,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    accessorKey: "customerEmail",
    header: "Customer",
    size: 180,
    cell: ({ row }) =>
      row.original.customerName ?? row.original.customerEmail ?? "—",
  },
  {
    accessorKey: "itemCount",
    header: "Items",
    size: 70,
    enableSorting: true,
    meta: { align: "center" as const },
    cell: ({ row }) => (
      <div className="text-center">{row.original.itemCount}</div>
    ),
  },
  {
    accessorKey: "orderType",
    header: "Type",
    size: 110,
    meta: { align: "center" as const },
    cell: ({ row }) => (
      <div className="text-center">
        <Badge
          variant={
            row.original.orderType === "SUBSCRIPTION" ? "default" : "secondary"
          }
          className="text-xs font-normal"
        >
          {row.original.orderType === "SUBSCRIPTION" ? "Sub" : "One-time"}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 110,
    enableSorting: true,
    meta: { align: "center" as const },
    cell: ({ row }) => (
      <div className="text-center">
        <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
          {formatStatus(row.original.status)}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    size: 100,
    enableSorting: true,
    meta: { align: "right" as const },
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.original.total)}</div>
    ),
  },
  {
    accessorKey: "refunded",
    header: "Refunded",
    size: 100,
    meta: { align: "right" as const },
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.refunded > 0 ? formatCurrency(row.original.refunded) : "—"}
      </div>
    ),
  },
  {
    id: "location",
    header: "Location",
    size: 140,
    cell: ({ row }) =>
      [row.original.city, row.original.state].filter(Boolean).join(", ") ||
      "—",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

export function buildFilterQueryParams(filter: ActiveFilter | null): string {
  if (!filter) return "";
  const params = new URLSearchParams();

  if (filter.configId === "orderType") {
    const values = filter.value as string[];
    if (values.length > 0) params.set("orderType", values.join(","));
  } else if (filter.configId === "status") {
    const values = filter.value as string[];
    if (values.length > 0) params.set("status", values.join(","));
  } else if (filter.configId === "amount") {
    const num = Number(filter.value);
    if (filter.value !== "" && !isNaN(num)) {
      const opMap: Record<string, string> = { "=": "=", "\u2265": ">=", "\u2264": "<=" };
      params.set("amountOp", opMap[filter.operator ?? "="] ?? "=");
      params.set("amount", String(Math.round(num * 100))); // dollars → cents
    }
  }

  const str = params.toString();
  return str ? `&${str}` : "";
}
