"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  ChevronDown,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { useCallback, useRef, useState, type ComponentType } from "react";
import {
  subDays,
  subMonths,
  startOfMonth,
  format,
} from "date-fns";
import type { DateRange } from "react-day-picker";

import type {
  ActiveFilter,
  ComparisonOperator,
  FilterConfig,
} from "./types";

// --- Filter renderer registry ---

interface FilterRendererProps {
  config: FilterConfig;
  filter: ActiveFilter;
  onFilterChange: (filter: ActiveFilter | null) => void;
}

const OPERATORS: ComparisonOperator[] = ["=", "\u2265", "\u2264"];

function ComparisonFilterContent({
  config: _config,
  filter,
  onFilterChange,
}: FilterRendererProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localValue, setLocalValue] = useState(() =>
    filter.value === "" || filter.value == null ? "" : String(filter.value)
  );

  const handleOperatorSelect = (op: ComparisonOperator) => {
    onFilterChange({ ...filter, operator: op });
  };

  const debouncedFilterChange = useCallback(
    (inputValue: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const num = Number(inputValue);
        if (inputValue === "" || isNaN(num)) {
          onFilterChange({ ...filter, value: "" });
        } else {
          onFilterChange({ ...filter, value: num });
        }
      }, 200);
    },
    [filter, onFilterChange]
  );

  const handleChange = (inputValue: string) => {
    setLocalValue(inputValue);
    debouncedFilterChange(inputValue);
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <InputGroupButton size="xs" variant="secondary">
            {filter.operator || "\u2265"}
          </InputGroupButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {OPERATORS.map((op) => (
            <DropdownMenuItem
              key={op}
              onClick={() => handleOperatorSelect(op)}
            >
              {op}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <InputGroupInput
        ref={inputRef}
        type="number"
        min="0"
        placeholder="enter value"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
      />
    </>
  );
}

function MultiSelectFilterContent({
  config,
  filter,
  onFilterChange,
}: FilterRendererProps) {
  const selectedValues = (filter.value as string[]) || [];

  const handleToggle = (categoryValue: string) => {
    const next = selectedValues.includes(categoryValue)
      ? selectedValues.filter((v) => v !== categoryValue)
      : [...selectedValues, categoryValue];
    onFilterChange({ ...filter, value: next });
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`flex-1 flex items-center justify-between gap-1 px-2 py-1.5 text-sm truncate ${selectedValues.length > 0 ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <span className="truncate">
              {selectedValues.length === 0
                ? "Select..."
                : `${selectedValues.length} selected`}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {config.options?.map((opt) => (
              <Label
                key={opt.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm font-normal"
              >
                <Checkbox
                  checked={selectedValues.includes(opt.value)}
                  onCheckedChange={() => handleToggle(opt.value)}
                />
                {opt.label}
              </Label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

export interface DateRangeFilterValue {
  preset: string;
  from: Date;
  to: Date;
}

const DATE_PRESETS = [
  { label: "Last 7 days", value: "last7" },
  { label: "Current month", value: "currentMonth" },
  { label: "Last 90 days", value: "last90" },
  { label: "Last 6 months", value: "last6mo" },
] as const;

function computePresetRange(preset: string): { from: Date; to: Date } | null {
  const now = new Date();
  switch (preset) {
    case "last7":
      return { from: subDays(now, 7), to: now };
    case "currentMonth":
      return { from: startOfMonth(now), to: now };
    case "last90":
      return { from: subDays(now, 90), to: now };
    case "last6mo":
      return { from: subMonths(now, 6), to: now };
    default:
      return null;
  }
}

function DateRangeFilterContent({
  config: _config,
  filter,
  onFilterChange,
}: FilterRendererProps) {
  const currentValue = filter.value as DateRangeFilterValue | null;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(
    undefined
  );
  const handleOpenChange = (open: boolean) => {
    setCalendarOpen(open);
    if (open) {
      // Restore previous range on reopen
      if (currentValue) {
        setPendingRange({ from: currentValue.from, to: currentValue.to });
      } else {
        setPendingRange(undefined);
      }
    }
  };

  const handlePresetSelect = (preset: string) => {
    const range = computePresetRange(preset);
    if (range) {
      onFilterChange({ ...filter, value: { preset, ...range } });
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setPendingRange(range);
    if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
      onFilterChange({
        ...filter,
        value: { preset: "custom", from: range.from, to: range.to },
      });
      // Calendar stays open — user closes manually or clicks to start new range
    }
  };

  const displayLabel = currentValue
    ? currentValue.preset === "custom"
      ? `${format(currentValue.from, "MMM d")} – ${format(currentValue.to, "MMM d")}`
      : DATE_PRESETS.find((p) => p.value === currentValue.preset)?.label ?? "Select range"
    : "Select range";

  const customRangeLabel = currentValue?.preset === "custom"
    ? `${format(currentValue.from, "MMM d")} – ${format(currentValue.to, "MMM d")}`
    : null;

  return (
    <>
      <Popover open={calendarOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <InputGroupButton
            size="xs"
            variant="ghost"
            className="px-1 text-muted-foreground"
          >
            <CalendarDays className="h-4 w-4" />
          </InputGroupButton>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={pendingRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`flex-1 flex items-center justify-between gap-1 px-2 py-1.5 text-sm truncate ${currentValue ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {currentValue && (
            <DropdownMenuItem onClick={() => onFilterChange({ ...filter, value: null })}>
              Select range
            </DropdownMenuItem>
          )}
          {customRangeLabel && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              {customRangeLabel}
            </DropdownMenuItem>
          )}
          {DATE_PRESETS
            .filter((preset) => preset.value !== currentValue?.preset)
            .map((preset) => (
              <DropdownMenuItem
                key={preset.value}
                onClick={() => handlePresetSelect(preset.value)}
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const FILTER_RENDERERS: Record<string, ComponentType<FilterRendererProps>> = {
  comparison: ComparisonFilterContent,
  multiSelect: MultiSelectFilterContent,
  dateRange: DateRangeFilterContent,
};

// --- Main DataTableFilter ---

interface DataTableFilterProps {
  configs: FilterConfig[];
  activeFilter: ActiveFilter | null;
  onFilterChange: (filter: ActiveFilter | null) => void;
  className?: string;
}

export function DataTableFilter({
  configs,
  activeFilter,
  onFilterChange,
  className,
}: DataTableFilterProps) {
  const activeConfig = activeFilter
    ? configs.find((c) => c.id === activeFilter.configId)
    : null;

  const handleTypeSelect = (configId: string | null) => {
    if (!configId) {
      onFilterChange(null);
      return;
    }
    const config = configs.find((c) => c.id === configId);
    if (!config) return;

    if (config.filterType === "comparison") {
      onFilterChange({ configId, operator: "\u2265", value: "" });
    } else if (config.filterType === "dateRange") {
      onFilterChange({ configId, value: null });
    } else {
      onFilterChange({ configId, value: [] });
    }
  };

  const typeSelector = (
    <InputGroupAddon align="inline-end">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <InputGroupButton size="icon-xs">
            <MoreHorizontal />
          </InputGroupButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {activeFilter && (
            <DropdownMenuItem onClick={() => handleTypeSelect(null)}>
              None
            </DropdownMenuItem>
          )}
          {configs
            .filter((c) => c.id !== activeFilter?.configId)
            .map((c) => (
              <DropdownMenuItem
                key={c.id}
                onClick={() => handleTypeSelect(c.id)}
              >
                {c.label}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </InputGroupAddon>
  );

  if (!activeFilter || !activeConfig) {
    return (
      <InputGroup className={className}>
        <InputGroupAddon align="inline-start">
          <Filter />
        </InputGroupAddon>
        <span className="flex-1 font-mono italic text-muted-foreground px-3 py-1.5 text-sm">
          none
        </span>
        {typeSelector}
      </InputGroup>
    );
  }

  const ContentRenderer = FILTER_RENDERERS[activeConfig.filterType];

  // Compute min-width so the filter accommodates the longest possible content.
  // Base: filter icon (28px) + shell label (~ch) + type-selector button (28px) + padding (24px)
  const longestContentCh = (() => {
    if (activeConfig.filterType === "dateRange") {
      // Longest preset label or "MMM d – MMM d" (≈ 15ch), plus calendar icon
      const longestPreset = DATE_PRESETS.reduce(
        (max, p) => Math.max(max, p.label.length),
        0,
      );
      return Math.max(longestPreset, 15) + 4; // +4 for chevron + calendar icon space
    }
    if (activeConfig.filterType === "multiSelect") {
      // "N selected" (10ch) or longest option label
      const longestOption = (activeConfig.options ?? []).reduce(
        (max, o) => Math.max(max, o.label.length),
        0,
      );
      return Math.max(longestOption, 10) + 3; // +3 for chevron
    }
    // comparison: input field has flexible width
    return 10;
  })();
  const shellLabel = activeConfig.shellLabel ?? activeConfig.label.toLowerCase();
  const minWidthCh = shellLabel.length + longestContentCh;

  return (
    <InputGroup className={className} style={{ minWidth: `${minWidthCh + 8}ch` }}>
      <InputGroupAddon align="inline-start">
        <Filter />
      </InputGroupAddon>
      <span className="font-mono italic text-muted-foreground px-2 py-1.5 text-sm whitespace-nowrap">
        {shellLabel}
      </span>
      <ContentRenderer
        config={activeConfig}
        filter={activeFilter}
        onFilterChange={onFilterChange}
      />
      {typeSelector}
    </InputGroup>
  );
}
