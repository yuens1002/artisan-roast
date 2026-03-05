"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PeriodPreset, CompareMode } from "@/lib/admin/analytics/contracts";
import { PERIOD_PRESETS, parsePeriodParam, parseCompareParam } from "@/lib/admin/analytics/time";

interface PeriodSelectorBaseProps {
  className?: string;
}

interface UrlModePeriodSelectorProps extends PeriodSelectorBaseProps {
  mode: "url";
  value?: never;
  compare?: never;
  onChange?: never;
  onCompareChange?: never;
}

interface StateModePeriodSelectorProps extends PeriodSelectorBaseProps {
  mode: "state";
  value: PeriodPreset;
  compare: CompareMode;
  onChange: (preset: PeriodPreset) => void;
  onCompareChange: (mode: CompareMode) => void;
}

type PeriodSelectorProps =
  | UrlModePeriodSelectorProps
  | StateModePeriodSelectorProps;

const COMPARE_OPTIONS: { value: CompareMode; label: string }[] = [
  { value: "previous", label: "vs previous period" },
  { value: "lastYear", label: "vs last year" },
  { value: "none", label: "No comparison" },
];

export function PeriodSelector(props: PeriodSelectorProps) {
  if (props.mode === "url") {
    return <UrlSyncedPeriodSelector className={props.className} />;
  }

  return (
    <PeriodSelectorView
      value={props.value}
      compare={props.compare}
      onPeriodChange={props.onChange}
      onCompareChange={props.onCompareChange}
      className={props.className}
    />
  );
}

// ---------------------------------------------------------------------------
// URL-synced variant (reads/writes search params)
// ---------------------------------------------------------------------------

function UrlSyncedPeriodSelector({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = parsePeriodParam(searchParams.get("period"));
  const currentCompare = parseCompareParam(searchParams.get("compare"));

  const handlePeriodChange = useCallback(
    (preset: PeriodPreset) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", preset);
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

  return (
    <PeriodSelectorView
      value={currentPeriod}
      compare={currentCompare}
      onPeriodChange={handlePeriodChange}
      onCompareChange={handleCompareChange}
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// Presentational view
// ---------------------------------------------------------------------------

interface PeriodSelectorViewProps {
  value: PeriodPreset;
  compare: CompareMode;
  onPeriodChange: (preset: PeriodPreset) => void;
  onCompareChange: (mode: CompareMode) => void;
  className?: string;
}

function PeriodSelectorView({
  value,
  compare,
  onPeriodChange,
  onCompareChange,
  className,
}: PeriodSelectorViewProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex gap-1" role="group" aria-label="Period selection">
        {PERIOD_PRESETS.map((preset) => (
          <Button
            key={preset.key}
            variant={value === preset.key ? "default" : "outline"}
            size="sm"
            onClick={() => onPeriodChange(preset.key)}
            className="h-8 text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Select value={compare} onValueChange={(v) => onCompareChange(v as CompareMode)}>
        <SelectTrigger className="h-8 w-[170px] text-xs">
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
    </div>
  );
}
