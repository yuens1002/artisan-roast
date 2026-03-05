import type { Table } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface DataTableColumnMeta {
  responsive?: "desktop" | "mobile";
  pin?: "left";
  cellClassName?: string;
  align?: "left" | "center" | "right";
}

export interface CollapseConfig {
  icon: LucideIcon;
}

export type SearchSlot = {
  type: "search";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  collapse?: CollapseConfig;
};

export type ButtonSlot = {
  type: "button";
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  disabled?: boolean;
  iconOnly?: "below-lg";
};

export type CustomSlot = {
  type: "custom";
  content: ReactNode;
};

export type FilterConfig = {
  id: string;
  label: string;
  shellLabel?: string;
  filterType: "comparison" | "multiSelect" | "dateRange";
  options?: { label: string; value: string }[];
};

export type ComparisonOperator = "=" | "\u2265" | "\u2264";

export type ActiveFilter = {
  configId: string;
  operator?: ComparisonOperator;
  value: unknown;
};

export type FilterSlot = {
  type: "filter";
  configs: FilterConfig[];
  activeFilter: ActiveFilter | null;
  onFilterChange: (filter: ActiveFilter | null) => void;
  collapse?: CollapseConfig;
};

export type PaginationSlot = {
  type: "pagination";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: Table<any>;
};

export type PageSizeSelectorSlot = {
  type: "pageSizeSelector";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: Table<any>;
};

export type RecordCountSlot = {
  type: "recordCount";
  count: number;
  label?: string;
};

export type DataTableSlot =
  | SearchSlot
  | ButtonSlot
  | CustomSlot
  | FilterSlot
  | PaginationSlot
  | PageSizeSelectorSlot
  | RecordCountSlot;

export type ActionBarConfig = {
  left: DataTableSlot[];
  right: DataTableSlot[];
};
