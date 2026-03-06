"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, subDays, addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PeriodPreset, CompareMode } from "@/lib/admin/analytics/contracts";
import { PERIOD_PRESETS, getDateRange, parsePeriodParam, parseCompareParam } from "@/lib/admin/analytics/time";
import type { DateRange as DayPickerRange } from "react-day-picker";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DateRangePickerBaseProps {
  className?: string;
  /** Hide the inline compare selector outside the popover. */
  hideCompare?: boolean;
}

interface UrlModeDateRangePickerProps extends DateRangePickerBaseProps {
  mode: "url";
  period?: never;
  compare?: never;
  onPeriodChange?: never;
  onCompareChange?: never;
  customFrom?: never;
  customTo?: never;
  onCustomRangeChange?: never;
}

interface StateModeDateRangePickerProps extends DateRangePickerBaseProps {
  mode: "state";
  period: PeriodPreset;
  compare: CompareMode;
  onPeriodChange: (preset: PeriodPreset) => void;
  onCompareChange: (mode: CompareMode) => void;
  /** ISO date string when a custom range is active. */
  customFrom?: string;
  /** ISO date string when a custom range is active. */
  customTo?: string;
  /** Called when user selects a custom date range via the calendar. */
  onCustomRangeChange?: (from: string, to: string) => void;
}

type DateRangePickerProps =
  | UrlModeDateRangePickerProps
  | StateModeDateRangePickerProps;

const COMPARE_OPTIONS: { value: CompareMode; label: string }[] = [
  { value: "previous", label: "vs previous period" },
  { value: "lastYear", label: "vs last year" },
  { value: "none", label: "No comparison" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DateRangePicker(props: DateRangePickerProps) {
  if (props.mode === "url") {
    return <UrlSyncedDateRangePicker className={props.className} hideCompare={props.hideCompare} />;
  }

  return (
    <DateRangePickerView
      period={props.period}
      compare={props.compare}
      onPeriodChange={props.onPeriodChange}
      onCompareChange={props.onCompareChange}
      customFrom={props.customFrom}
      customTo={props.customTo}
      onCustomRangeChange={props.onCustomRangeChange}
      className={props.className}
      hideCompare={props.hideCompare}
    />
  );
}

// ---------------------------------------------------------------------------
// URL-synced variant
// ---------------------------------------------------------------------------

function UrlSyncedDateRangePicker({ className, hideCompare }: { className?: string; hideCompare?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = parsePeriodParam(searchParams.get("period"));
  const currentCompare = parseCompareParam(searchParams.get("compare"));
  const customFrom = searchParams.get("from") ?? undefined;
  const customTo = searchParams.get("to") ?? undefined;

  const handlePeriodChange = useCallback(
    (preset: PeriodPreset) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", preset);
      params.delete("from");
      params.delete("to");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleCompareChange = useCallback(
    (mode: CompareMode) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("compare", mode);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleCustomRangeChange = useCallback(
    (from: string, to: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", from);
      params.set("to", to);
      params.delete("period");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <DateRangePickerView
      period={currentPeriod}
      compare={currentCompare}
      onPeriodChange={handlePeriodChange}
      onCompareChange={handleCompareChange}
      customFrom={customFrom}
      customTo={customTo}
      onCustomRangeChange={handleCustomRangeChange}
      className={className}
      hideCompare={hideCompare}
    />
  );
}

// ---------------------------------------------------------------------------
// Presentational view
// ---------------------------------------------------------------------------

interface DateRangePickerViewProps {
  period: PeriodPreset;
  compare: CompareMode;
  onPeriodChange: (preset: PeriodPreset) => void;
  onCompareChange: (mode: CompareMode) => void;
  customFrom?: string;
  customTo?: string;
  onCustomRangeChange?: (from: string, to: string) => void;
  className?: string;
  hideCompare?: boolean;
}

function DateRangePickerView({
  period,
  compare,
  onPeriodChange,
  onCompareChange,
  customFrom,
  customTo,
  onCustomRangeChange,
  className,
  hideCompare,
}: DateRangePickerViewProps) {
  const [open, setOpen] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<PeriodPreset | null>(period);
  const [pendingCompare, setPendingCompare] = useState<CompareMode>(compare);
  const [pendingCustomFrom, setPendingCustomFrom] = useState<Date | undefined>();
  const [pendingCustomTo, setPendingCustomTo] = useState<Date | undefined>();

  // Determine if currently showing a custom range
  const isCustom = !!(customFrom && customTo);

  // Compute the displayed date range
  const displayFrom = isCustom ? new Date(customFrom) : getDateRange(period).from;
  const displayTo = isCustom ? new Date(customTo) : getDateRange(period).to;
  const presetLabel = !isCustom ? PERIOD_PRESETS.find((p) => p.key === period)?.label : null;
  const triggerPreset = presetLabel ? `Last ${presetLabel}` : "Custom";
  // displayTo is always exclusive (start-of-next-day); show the inclusive end date
  const displayToInclusive = subDays(displayTo, 1);
  const triggerDates = `${format(displayFrom, "MMM d")} – ${format(displayToInclusive, "MMM d, yyyy")}`;

  // Calendar selection — show pending custom range or pending preset range
  const calendarRange: DayPickerRange = pendingCustomFrom
    ? { from: pendingCustomFrom, to: pendingCustomTo }
    : pendingPreset
      ? (() => { const r = getDateRange(pendingPreset); return { from: r.from, to: r.to }; })()
      : { from: displayFrom, to: displayTo };

  const calendarDefaultMonth = pendingCustomFrom ?? calendarRange.from;

  const handlePresetClick = (preset: PeriodPreset) => {
    setPendingPreset(preset);
    // Clear custom selection when a preset is clicked
    setPendingCustomFrom(undefined);
    setPendingCustomTo(undefined);
  };

  const handleCalendarSelect = (range: DayPickerRange | undefined) => {
    if (range?.from) {
      setPendingCustomFrom(range.from);
      setPendingCustomTo(range.to);
      // Clear preset selection when calendar is used
      setPendingPreset(null);
    }
  };

  const handleApply = () => {
    if (pendingCompare !== compare) {
      onCompareChange(pendingCompare);
    }

    if (pendingPreset) {
      // Apply a preset
      onPeriodChange(pendingPreset);
      // Clear custom range if there was one
      if (isCustom && onCustomRangeChange) {
        // Signal to parent that we're back on a preset
        // (parent should clear customFrom/customTo when onPeriodChange is called)
      }
    } else if (pendingCustomFrom && pendingCustomTo && onCustomRangeChange) {
      // Normalize to [fromInclusive, toExclusive) — start-of-day and start-of-next-day
      const normalizedFrom = new Date(pendingCustomFrom);
      normalizedFrom.setUTCHours(0, 0, 0, 0);
      const normalizedTo = addDays(new Date(pendingCustomTo), 1);
      normalizedTo.setUTCHours(0, 0, 0, 0);
      onCustomRangeChange(
        normalizedFrom.toISOString(),
        normalizedTo.toISOString()
      );
    }

    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Reset pending state to current values when opening
      if (isCustom) {
        setPendingPreset(null);
        setPendingCustomFrom(new Date(customFrom));
        setPendingCustomTo(new Date(customTo));
      } else {
        setPendingPreset(period);
        setPendingCustomFrom(undefined);
        setPendingCustomTo(undefined);
      }
      setPendingCompare(compare);
    }
  };

  // Determine which preset is visually selected in sidebar
  const activePresetKey = pendingPreset;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 text-xs font-normal"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="text-muted-foreground">{triggerPreset}</span>
            <span className="hidden sm:inline">{triggerDates}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Preset sidebar */}
            <div className="flex flex-col gap-1 border-r p-3 min-w-[100px]">
              {PERIOD_PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  variant={activePresetKey === preset.key ? "default" : "ghost"}
                  size="sm"
                  className="justify-start h-7 text-xs"
                  onClick={() => handlePresetClick(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Calendar + footer */}
            <div className="flex flex-col">
              <Calendar
                mode="range"
                selected={calendarRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                defaultMonth={calendarDefaultMonth}
                disabled={{ after: new Date() }}
              />

              {/* Footer: compare + apply */}
              <div className="flex items-center justify-between border-t px-3 py-2">
                <Select
                  value={pendingCompare}
                  onValueChange={(v) => setPendingCompare(v as CompareMode)}
                >
                  <SelectTrigger className="h-7 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPARE_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-7 text-xs" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Inline compare select for quick access */}
      {!hideCompare && (
        <Select value={compare} onValueChange={(v) => onCompareChange(v as CompareMode)}>
          <SelectTrigger className="h-8 w-42.5 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPARE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
