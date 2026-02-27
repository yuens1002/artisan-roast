"use client";

import type { DataTableColumnMeta } from "@/app/admin/_components/data-table";
import { RowActionMenu, type RowActionItem } from "@/app/admin/_components/data-table/RowActionMenu";
import {
  useColumnVisibility,
  useDataTable,
} from "@/app/admin/_components/data-table/hooks";
import type { ActiveFilter, FilterConfig } from "@/app/admin/_components/data-table/types";
import type {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
} from "@tanstack/react-table";
import { Pencil, SquarePen, Trash } from "lucide-react";
import { useCallback, useMemo } from "react";

import { VariantCell } from "../_components/VariantCell";

interface PurchaseOption {
  id: string;
  type: "ONE_TIME" | "SUBSCRIPTION";
  priceInCents: number;
  salePriceInCents?: number | null;
  billingInterval?: string | null;
  billingIntervalCount?: number | null;
}

interface Variant {
  id: string;
  name: string;
  stock: number;
  options: PurchaseOption[];
}

interface CategoryDetailed {
  id: string;
  name: string;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  isDisabled?: boolean;
  stock: number;
  price: number;
  categories: string;
  categoriesDetailed: CategoryDetailed[];
  variants: Variant[];
  addOns: string[];
}

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

const multiFieldFilter: FilterFn<Product> = (row, _columnId, filterValue) => {
  if (!filterValue) return true;
  const query = String(filterValue).toLowerCase();
  const product = row.original;
  const searchable = [
    product.name,
    product.categories,
    ...product.addOns,
  ]
    .join(" ")
    .toLowerCase();
  return searchable.includes(query);
};

const COLUMN_VISIBILITY_KEY = "products-table-column-visibility";

// Columns that are always hidden (used for filtering only)
const ALWAYS_HIDDEN = { price: false, stock: false };

// Togglable columns exposed to the action bar's column visibility toggle
export const TOGGLABLE_COLUMNS = [
  { id: "categories", label: "Categories" },
  { id: "addOns", label: "Add-ons" },
  { id: "variants", label: "Variants" },
];

export function productFilterToColumnFilters(filter: ActiveFilter): ColumnFiltersState {
  if (filter.configId === "price" && typeof filter.value === "number") {
    return [
      {
        id: "price",
        value: { operator: filter.operator ?? "=", num: filter.value * 100 },
      },
    ];
  }
  if (filter.configId === "stock" && typeof filter.value === "number") {
    return [
      {
        id: "stock",
        value: { operator: filter.operator ?? "=", num: filter.value },
      },
    ];
  }
  if (filter.configId === "categories" && Array.isArray(filter.value)) {
    return filter.value.length > 0
      ? [{ id: "categories", value: filter.value }]
      : [];
  }
  return [];
}

/** Pure filter: comparison on a numeric value */
export function comparisonFilter(
  val: number,
  filterValue: { operator: string; num: number } | null | undefined
): boolean {
  if (!filterValue || typeof filterValue.num !== "number") return true;
  switch (filterValue.operator) {
    case "=": return val === filterValue.num;
    case "\u2265": return val >= filterValue.num;
    case "\u2264": return val <= filterValue.num;
    default: return true;
  }
}

/** Pure filter: multi-select on categories */
export function categoriesFilter(
  categoriesDetailed: CategoryDetailed[],
  filterValue: string[] | null | undefined
): boolean {
  if (!filterValue || filterValue.length === 0) return true;
  const catIds = categoriesDetailed.map((c) => c.id);
  const hasUncategorized = filterValue.includes("__uncategorized__");
  const otherIds = filterValue.filter((v) => v !== "__uncategorized__");
  if (hasUncategorized && categoriesDetailed.length === 0) return true;
  if (otherIds.length > 0 && otherIds.some((id) => catIds.includes(id))) return true;
  return false;
}

interface UseProductsTableOptions {
  products: Product[];
  onStockUpdate: (variantId: string, stock: number) => Promise<void>;
  onPriceUpdate: (optionId: string, cents: number, field?: "priceInCents" | "salePriceInCents") => Promise<void>;
  onEditProduct: (product: Product) => void;
  onEditVariants: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
}

export function useProductsTable({
  products,
  onStockUpdate,
  onPriceUpdate,
  onEditProduct,
  onEditVariants,
  onDeleteProduct,
}: UseProductsTableOptions) {
  const { columnVisibility, handleVisibilityChange } = useColumnVisibility(
    COLUMN_VISIBILITY_KEY,
    ALWAYS_HIDDEN
  );

  // Extract unique categories for filter options
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      p.categoriesDetailed?.forEach((c) => {
        map.set(c.id, c.name);
      });
    });
    const opts = Array.from(map.entries()).map(([id, name]) => ({
      label: name,
      value: id,
    }));
    opts.sort((a, b) => a.label.localeCompare(b.label));
    opts.push({ label: "Uncategorized", value: "__uncategorized__" });
    return opts;
  }, [products]);

  // Column definitions with meta
  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      // Desktop columns
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        size: 220,
        enableSorting: true,
        enableResizing: true,
        meta: { pin: "left", cellClassName: "font-medium" } satisfies DataTableColumnMeta,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span>{row.original.name}</span>
            {row.original.isDisabled ? (
              <span className="text-xs rounded bg-destructive/10 text-destructive px-2 py-0.5">
                Disabled
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "categories",
        accessorKey: "categories",
        header: "Categories",
        size: 160,
        enableSorting: false,
        enableResizing: true,
        meta: { responsive: "desktop" } satisfies DataTableColumnMeta,
        cell: ({ row }) => row.original.categories || "-",
        filterFn: (row, _columnId, filterValue: string[]) =>
          categoriesFilter(row.original.categoriesDetailed || [], filterValue),
      },
      {
        id: "addOns",
        accessorKey: "addOns",
        header: "Add-ons",
        size: 160,
        enableSorting: false,
        enableResizing: true,
        meta: { responsive: "desktop" } satisfies DataTableColumnMeta,
        cell: ({ row }) => {
          const addOns = row.original.addOns;
          return addOns && addOns.length > 0 ? addOns.join(", ") : "-";
        },
      },
      {
        id: "variants",
        header: "Variants",
        size: 260,
        minSize: 220,
        enableSorting: false,
        enableResizing: true,
        meta: { responsive: "desktop" } satisfies DataTableColumnMeta,
        cell: ({ row }) => (
          <VariantCell
            variants={row.original.variants}
            onStockUpdate={onStockUpdate}
            onPriceUpdate={onPriceUpdate}
          />
        ),
      },
      // Hidden columns for column filters (price/stock)
      {
        id: "price",
        accessorKey: "price",
        header: "Price",
        enableHiding: true,
        filterFn: (row, _columnId, filterValue) => comparisonFilter(row.original.price, filterValue),
      },
      {
        id: "stock",
        accessorKey: "stock",
        header: "Stock",
        enableHiding: true,
        filterFn: (row, _columnId, filterValue) => comparisonFilter(row.original.stock, filterValue),
      },
      // Mobile columns
      {
        id: "priceRange",
        header: "Price",
        size: 100,
        enableSorting: false,
        enableResizing: false,
        meta: { responsive: "mobile" } satisfies DataTableColumnMeta,
        cell: ({ row }) => {
          const allPrices = row.original.variants.flatMap((v) =>
            v.options
              .filter((o) => o.type === "ONE_TIME")
              .map((o) => o.salePriceInCents ?? o.priceInCents)
          );
          if (allPrices.length === 0) return "-";
          const min = Math.min(...allPrices);
          const max = Math.max(...allPrices);
          return min === max
            ? formatPrice(min)
            : `${formatPrice(min)} – ${formatPrice(max)}`;
        },
      },
      {
        id: "stockTotal",
        header: "Stock",
        size: 80,
        enableSorting: false,
        enableResizing: false,
        meta: { responsive: "mobile" } satisfies DataTableColumnMeta,
        cell: ({ row }) => row.original.stock,
      },
      {
        id: "mobileActions",
        header: "",
        size: 48,
        enableSorting: false,
        enableResizing: false,
        meta: { responsive: "mobile" } satisfies DataTableColumnMeta,
        cell: ({ row }) => {
          const product = row.original;
          const items: RowActionItem[] = [
            {
              type: "item",
              label: "Edit Product",
              icon: SquarePen,
              onClick: () => onEditProduct(product),
            },
            {
              type: "item",
              label: "Edit Variants",
              icon: Pencil,
              onClick: () => onEditVariants(product),
            },
            { type: "separator" },
            {
              type: "item",
              label: "Delete",
              icon: Trash,
              variant: "destructive",
              onClick: () => onDeleteProduct(product),
            },
          ];
          return <RowActionMenu items={items} />;
        },
      },
      // Row action column (desktop only)
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        enableResizing: false,
        meta: { responsive: "desktop", cellClassName: "align-middle text-center" } satisfies DataTableColumnMeta,
        cell: ({ row }) => {
          const product = row.original;
          const items: RowActionItem[] = [
            {
              type: "item",
              label: "Edit Product",
              icon: SquarePen,
              onClick: () => onEditProduct(product),
            },
            {
              type: "item",
              label: "Edit Variants",
              icon: Pencil,
              onClick: () => onEditVariants(product),
            },
            { type: "separator" },
            {
              type: "item",
              label: "Delete",
              icon: Trash,
              variant: "destructive",
              onClick: () => onDeleteProduct(product),
            },
          ];
          return <RowActionMenu items={items} />;
        },
      },
    ],
    [onStockUpdate, onPriceUpdate, onEditProduct, onEditVariants, onDeleteProduct]
  );

  const filterConfigs = useMemo<FilterConfig[]>(
    () => [
      { id: "price", label: "Price", shellLabel: "price $", filterType: "comparison" },
      { id: "stock", label: "Stock", filterType: "comparison" },
      {
        id: "categories",
        label: "Categories",
        filterType: "multiSelect",
        options: categoryOptions,
      },
    ],
    [categoryOptions]
  );

  const stableFilterToColumnFilters = useCallback(
    (filter: ActiveFilter) => productFilterToColumnFilters(filter),
    []
  );

  const dataTable = useDataTable({
    data: products,
    columns,
    filterConfigs,
    columnVisibility,
    globalFilterFn: multiFieldFilter,
    filterToColumnFilters: stableFilterToColumnFilters,
    storageKey: "products-table-state",
  });

  return {
    ...dataTable,
    columnVisibility,
    handleVisibilityChange,
  };
}
