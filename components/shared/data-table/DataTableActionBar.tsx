"use client";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTableFilter } from "./DataTableFilter";
import { DataTablePageSizeSelector } from "./DataTablePageSizeSelector";
import { DataTablePagination } from "./DataTablePagination";
import type {
  ActionBarConfig,
  ButtonSlot,
  CollapseConfig,
  CustomSlot,
  DataTableSlot,
  FilterSlot,
  PageSizeSelectorSlot,
  PaginationSlot,
  RecordCountSlot,
  SearchSlot,
} from "./types";

// ── Dynamic collapse calculation ───────────────────────────────────────

/** Minimum usable width (px) for each expanded collapsible slot (search input / filter) */
export const EXPANDED_SLOT_MIN_WIDTH = 200;
/** Width (px) of a collapsed icon button (icon-sm ≈ 36px) */
export const COLLAPSED_SLOT_WIDTH = 36;
/** Gap between items in the left section (gap-2 = 8px) */
export const SLOT_GAP = 8;
/** Gap between left and right sections (gap-4 = 16px) */
export const SECTION_GAP = 16;

/**
 * Collapse levels — applied in order of priority:
 *   0 = everything expanded (tabs + search input + filter input)
 *   1 = search/filter collapsed to icons, tabs stay full  ← first thing to go
 *   2 = tabs also collapsed to dropdown                   ← last resort
 */
export type CollapseLevel = 0 | 1 | 2;

/**
 * Pure function: compute collapse level from declared widths.
 *
 * All inputs are stable values that do NOT depend on the current collapse level,
 * eliminating feedback loops.
 *
 * @param leftAvailable     - available width for the left section (bar - right - gap)
 * @param tabNaturalWidth   - declared natural width of the full tab bar
 * @param collapsibleCount  - number of collapsible slots (search + filter)
 * @param otherFixedWidth   - width of other non-collapsible left slots (e.g. col-vis icon)
 *
 * @internal exported for testing
 */
export function computeCollapseLevel(
  leftAvailable: number,
  tabNaturalWidth: number,
  collapsibleCount: number,
  otherFixedWidth: number = 0,
): CollapseLevel {
  if (collapsibleCount === 0) return 0;

  // Count gaps between items: tabs + collapsibles + other fixed slots
  const itemCount = 1 + collapsibleCount + (otherFixedWidth > 0 ? 1 : 0);
  const gaps = (itemCount - 1) * SLOT_GAP;

  // Level 0: tabs full + search/filter expanded
  const expandedNeeded =
    tabNaturalWidth + collapsibleCount * EXPANDED_SLOT_MIN_WIDTH + otherFixedWidth + gaps;
  if (leftAvailable >= expandedNeeded) return 0;

  // Level 1: tabs full + search/filter collapsed to icons
  const collapsedNeeded =
    tabNaturalWidth + collapsibleCount * COLLAPSED_SLOT_WIDTH + otherFixedWidth + gaps;
  if (leftAvailable >= collapsedNeeded) return 1;

  // Level 2: tabs also collapse to dropdown (last resort)
  return 2;
}

// ── Slot renderers ─────────────────────────────────────────────────────

function SearchSlotRenderer({ slot }: { slot: SearchSlot }) {
  return (
    <InputGroup className={slot.className ?? "max-w-sm"}>
      <InputGroupAddon align="inline-start">
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        placeholder={slot.placeholder}
        value={slot.value}
        onChange={(e) => slot.onChange(e.target.value)}
      />
    </InputGroup>
  );
}

function ButtonSlotRenderer({
  slot,
  forceIconOnly,
}: {
  slot: ButtonSlot;
  forceIconOnly?: boolean;
}) {
  const Icon = slot.icon;
  const isResponsiveIconOnly = slot.iconOnly === "below-lg";

  if (!forceIconOnly && isResponsiveIconOnly && Icon) {
    if (!slot.href && slot.onClick) {
      return (
        <>
          <Button size="icon-sm" variant={slot.variant} disabled={slot.disabled} className="lg:hidden" onClick={slot.onClick}>
            <Icon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={slot.variant} disabled={slot.disabled} className="hidden lg:inline-flex" onClick={slot.onClick}>
            <Icon className="h-4 w-4" />{slot.label}
          </Button>
        </>
      );
    }

    return (
      <>
        <Button size="icon-sm" variant={slot.variant} disabled={slot.disabled} className="lg:hidden" asChild={!!slot.href}>
          {slot.href ? (
            <Link href={slot.href}><Icon className="h-4 w-4" /></Link>
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </Button>
        <Button size="sm" variant={slot.variant} disabled={slot.disabled} className="hidden lg:inline-flex" asChild={!!slot.href}>
          {slot.href ? (
            <Link href={slot.href}><Icon className="h-4 w-4" />{slot.label}</Link>
          ) : (
            <><Icon className="h-4 w-4" />{slot.label}</>
          )}
        </Button>
      </>
    );
  }

  const content = (
    <>
      {Icon && <Icon className="h-4 w-4" />}
      {forceIconOnly ? null : slot.label}
    </>
  );

  if (slot.href) {
    return (
      <Button size="sm" variant={slot.variant} disabled={slot.disabled} asChild>
        <Link href={slot.href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant={slot.variant}
      disabled={slot.disabled}
      onClick={slot.onClick}
    >
      {content}
    </Button>
  );
}

function CustomSlotRenderer({
  slot,
  forceMobile,
}: {
  slot: CustomSlot;
  forceMobile?: boolean;
}) {
  if (slot.mobileContent) {
    return forceMobile
      ? <>{slot.mobileContent}</>
      : <>{slot.content}</>;
  }
  return <>{slot.content}</>;
}

function FilterSlotRenderer({ slot }: { slot: FilterSlot }) {
  return (
    <DataTableFilter
      configs={slot.configs}
      activeFilter={slot.activeFilter}
      onFilterChange={slot.onFilterChange}
      className="max-w-xs"
    />
  );
}

function PaginationSlotRenderer({ slot }: { slot: PaginationSlot }) {
  return <DataTablePagination table={slot.table} />;
}

function PageSizeSelectorSlotRenderer({
  slot,
}: {
  slot: PageSizeSelectorSlot;
}) {
  return <DataTablePageSizeSelector table={slot.table} />;
}

function RecordCountSlotRenderer({ slot }: { slot: RecordCountSlot }) {
  return (
    <span className="text-sm text-muted-foreground whitespace-nowrap">
      {slot.label ? `${slot.count} ${slot.label}` : slot.count}
    </span>
  );
}

function SlotRenderer({
  slot,
  forceMobile,
}: {
  slot: DataTableSlot;
  forceMobile?: boolean;
}) {
  switch (slot.type) {
    case "search":
      return <SearchSlotRenderer slot={slot} />;
    case "button":
      return <ButtonSlotRenderer slot={slot} />;
    case "custom":
      return <CustomSlotRenderer slot={slot} forceMobile={forceMobile} />;
    case "filter":
      return <FilterSlotRenderer slot={slot} />;
    case "pagination":
      return <PaginationSlotRenderer slot={slot} />;
    case "pageSizeSelector":
      return <PageSizeSelectorSlotRenderer slot={slot} />;
    case "recordCount":
      return <RecordCountSlotRenderer slot={slot} />;
  }
}

/** @internal exported for testing */
export function getCollapseConfig(slot: DataTableSlot): CollapseConfig | undefined {
  if ("collapse" in slot) return slot.collapse;
  return undefined;
}

/** Whether a collapsible slot has an active value (search text or filter applied)
 *  @internal exported for testing */
export function isSlotActive(slot: DataTableSlot): boolean {
  if (slot.type === "search") return !!slot.value;
  if (slot.type === "filter") return slot.activeFilter != null && slot.activeFilter.value != null && slot.activeFilter.value !== "" && !(Array.isArray(slot.activeFilter.value) && slot.activeFilter.value.length === 0);
  return false;
}

// ── Main component ─────────────────────────────────────────────────────

interface DataTableActionBarProps {
  config: ActionBarConfig;
  className?: string;
  /** When true, action bar adjusts its sticky top when the site header hides on scroll */
  headerAware?: boolean;
}

export function DataTableActionBar({
  config,
  className,
  headerAware = false,
}: DataTableActionBarProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const collapsibleCount = useMemo(
    () => config.left.filter((s) => getCollapseConfig(s)).length,
    [config.left],
  );

  const otherFixedWidth = useMemo(
    () => {
      let width = 0;
      for (const slot of config.left) {
        const isCollapsible = !!getCollapseConfig(slot);
        const isTab = slot.type === "custom" && slot.mobileContent;
        if (!isCollapsible && !isTab) {
          width += COLLAPSED_SLOT_WIDTH;
        }
      }
      return width;
    },
    [config.left],
  );

  // Extract declared tab natural width from config (first custom slot with mobileContent)
  const tabNaturalWidth = useMemo(() => {
    for (const slot of config.left) {
      if (slot.type === "custom" && slot.mobileContent && slot.naturalWidth) {
        return slot.naturalWidth;
      }
    }
    return 0;
  }, [config.left]);

  // Start at level 0 (everything expanded) — the ResizeObserver will adjust
  // to the correct level on the first frame after layout.
  const [collapseLevel, setCollapseLevel] = useState<CollapseLevel>(0);

  // Guard against observer callbacks firing before mount (React 19 strict mode)
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Sticky detection
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (mountedRef.current) setIsStuck(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Watch site header show/hide to adjust sticky top position
  useEffect(() => {
    if (!headerAware) return;

    const header = document.querySelector("header.sticky");
    if (!header) return;

    const observer = new MutationObserver(() => {
      if (mountedRef.current) setIsHeaderVisible(!header.classList.contains("-translate-y-full"));
    });
    observer.observe(header, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, [headerAware]);

  // Dynamic collapse via ResizeObserver on the outer bar ONLY.
  // We measure rightRef inside the callback but don't observe it — this prevents
  // collapse recalculation when pagination changes (filtering 608→16 orders changes
  // page count, shrinking the right section, which would flip collapse level).
  useEffect(() => {
    const barEl = barRef.current;
    const rightEl = rightRef.current;
    if (!barEl || !rightEl || collapsibleCount === 0) return;

    function measure() {
      if (!mountedRef.current) return;
      const barWidth = Math.round(barEl!.getBoundingClientRect().width);
      const rightWidth = Math.round(rightEl!.getBoundingClientRect().width);
      const leftAvailable = barWidth - rightWidth - SECTION_GAP;
      setCollapseLevel(computeCollapseLevel(leftAvailable, tabNaturalWidth, collapsibleCount, otherFixedWidth));
    }

    const observer = new ResizeObserver(measure);
    observer.observe(barEl);

    return () => observer.disconnect();
  }, [collapsibleCount, tabNaturalWidth, otherFixedWidth]);

  const expandedSlot = expandedIndex !== null ? config.left[expandedIndex] ?? null : null;

  const slotsCollapsed = collapseLevel >= 1;
  const tabsCompact = collapseLevel >= 2;

  return (
    <>
      <div ref={sentinelRef} className="h-0" />
      <div ref={barRef} className={cn(
        "sticky z-40 flex items-center gap-4 min-h-9 transition-[top] duration-300",
        headerAware && !isHeaderVisible ? "top-0" : "top-[calc(4rem-1px)]",
        isStuck && "p-4 bg-background/95 backdrop-blur-sm border border-t-0 border-border rounded-b-lg",
        "mb-8",
        className
      )}>
        {expandedSlot ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setExpandedIndex(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <SlotRenderer slot={expandedSlot} />
            </div>
          </>
        ) : (
          <>
            {/* Left section — takes remaining space, never overlaps right */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {config.left.map((slot, i) => {
                const collapse = getCollapseConfig(slot);
                if (collapse) {
                  const CollapseIcon = collapse.icon;
                  const active = isSlotActive(slot);

                  return slotsCollapsed ? (
                    <div key={i} className="flex-shrink-0" data-collapsible="">
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => setExpandedIndex(i)}
                        >
                          <CollapseIcon className="h-4 w-4" />
                        </Button>
                        {active && (
                          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 pointer-events-none" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={i} data-collapsible="">
                      <SlotRenderer slot={slot} />
                    </div>
                  );
                }
                return (
                  <SlotRenderer
                    key={i}
                    slot={slot}
                    forceMobile={tabsCompact}
                  />
                );
              })}
            </div>
            {/* Right section — fixed width, never shrinks */}
            <div ref={rightRef} className="flex items-center gap-2 flex-shrink-0">
              {config.right.map((slot, i) => (
                <SlotRenderer key={i} slot={slot} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
