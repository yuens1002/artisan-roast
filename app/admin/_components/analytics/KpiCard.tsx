"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DeltaResult } from "@/lib/admin/analytics/contracts";
import { formatByType, formatDelta } from "@/lib/admin/analytics/formatters";

interface KpiCardProps {
  label: string;
  value: number;
  format: "currency" | "number" | "percent";
  /** Label shown after the primary value (e.g. "Total"). */
  valueLabel?: string;
  /** Full text for valueLabel tooltip (e.g. "Total Revenue"). */
  valueLabelTitle?: string;
  delta?: DeltaResult | null;
  deltaLabel?: string;
  /** Comparison delta for the secondary value (shown with "/" separator). */
  secondaryDelta?: DeltaResult | null;
  /** Secondary value shown after a "/" separator. */
  secondaryValue?: number;
  secondaryFormat?: "currency" | "number" | "percent";
  /** Label shown after the secondary value (e.g. "AOV"). */
  secondaryValueLabel?: string;
  /** Full text for secondaryValueLabel tooltip (e.g. "Average Order Value"). */
  secondaryValueLabelTitle?: string;
  /** Tooltip for the card label itself (e.g. full name if abbreviated). */
  labelTitle?: string;
  /** Short description shown below the label. */
  description?: string;
  /** Content rendered in footer area with divider (e.g. breakdown links). */
  footerContent?: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
  /** Footer link text (e.g. "View more"). Only shown when href is set. */
  linkText?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  format,
  valueLabel,
  valueLabelTitle,
  delta,
  deltaLabel,
  secondaryDelta,
  secondaryValue,
  secondaryFormat,
  secondaryValueLabel,
  secondaryValueLabelTitle,
  labelTitle,
  description,
  footerContent,
  icon: Icon,
  href,
  linkText,
  className,
}: KpiCardProps) {
  function renderDelta(d: DeltaResult) {
    return (
      <span
        className={cn(
          "text-sm",
          d.direction === "flat"
            ? "text-muted-foreground"
            : "font-medium",
          d.direction === "up" && "text-emerald-600 dark:text-emerald-400",
          d.direction === "down" && "text-red-600 dark:text-red-400"
        )}
      >
        {formatDelta(d)}
      </span>
    );
  }

  const hasPrimaryDelta = !!delta;
  const hasSecondaryDelta = !!secondaryDelta;
  const deltaEl =
    hasPrimaryDelta || hasSecondaryDelta ? (
      <span className="inline-flex items-center gap-0.5">
        {hasPrimaryDelta && renderDelta(delta)}
        {hasPrimaryDelta && hasSecondaryDelta && (
          <span className="text-sm text-muted-foreground mx-0.5">/</span>
        )}
        {hasSecondaryDelta && renderDelta(secondaryDelta)}
        {deltaLabel && (
          <span className="text-sm font-medium text-muted-foreground ml-0.5">
            {deltaLabel}
          </span>
        )}
      </span>
    ) : null;

  const hasFooterLink = href && linkText;
  const hasFooter = hasFooterLink || footerContent;

  const content = (
    <Card
      className={cn(
        "shadow-none transition-colors h-full py-3 gap-0",
        href && "hover:border-primary/40 cursor-pointer",
        className
      )}
    >
      <CardContent className="flex flex-col px-4 h-full">
        {/* Delta line — space always reserved for consistent alignment */}
        <div className="flex justify-end min-h-5">
          {deltaEl}
        </div>

        {/* Spacer pushes content to bottom-align across cards */}
        <div className="flex-1" />

        {/* Label with icon + description */}
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
          <span
            className={cn(
              "text-sm text-muted-foreground whitespace-nowrap",
              labelTitle && "underline decoration-dotted decoration-current underline-offset-4 cursor-help"
            )}
            title={labelTitle}
          >
            {label}
          </span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground/60 mt-0.5">{description}</p>
        )}

        {/* Value with inline metric labels */}
        <div className="mt-3">
          <span className="text-3xl font-bold tracking-tight">
            {formatByType(value, format)}
          </span>
          {valueLabel && (
            <span
              className={cn(
                "text-xs text-muted-foreground/70 ml-1.5",
                valueLabelTitle && "underline decoration-dotted decoration-current underline-offset-4 cursor-help"
              )}
              title={valueLabelTitle}
            >
              {valueLabel}
            </span>
          )}
          {secondaryValue != null && secondaryFormat && (
            <>
              <span className="text-xl text-muted-foreground font-normal mx-1.5">
                /
              </span>
              <span className="text-3xl font-bold tracking-tight">
                {formatByType(secondaryValue, secondaryFormat)}
              </span>
              {secondaryValueLabel && (
                <span
                  className={cn(
                    "text-xs text-muted-foreground/70 ml-1.5",
                    secondaryValueLabelTitle && "underline decoration-dotted decoration-current underline-offset-4 cursor-help"
                  )}
                  title={secondaryValueLabelTitle}
                >
                  {secondaryValueLabel}
                </span>
              )}
            </>
          )}
        </div>

        {/* Footer — divider + link or breakdown content */}
        {hasFooter && (
          <div className="-mx-4 -mb-3 mt-3 border-t border-border/50 px-4 py-2.5 flex items-center justify-end gap-1 text-sm text-muted-foreground">
            {hasFooterLink ? (
              <>
                {linkText}
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            ) : (
              footerContent
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="h-full">{content}</Link>;
  }

  return content;
}
