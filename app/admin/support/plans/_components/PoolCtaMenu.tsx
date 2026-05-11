/**
 * PoolCtaMenu — shared 3-dot dropdown for pool.cta actions.
 *
 * Used by ActiveCard, TrialCard, and ExpiredCard — any card whose state
 * carries `pools[]` that may have a `.cta` per pool. Renders nothing if
 * no pool has a cta. Respects `action.disabled` (greys out the item) and
 * `action.disabledReason` (tooltip).
 *
 * Closes the gap where TrialCard / ExpiredCard previously ignored
 * pool.cta entirely — see architecture.md §2 (renderer responsibility:
 * render whatever the provider sends, including pool.cta on any state
 * the SDK admits pools in).
 */
"use client";

import React from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { resolveIconComponent } from "@/components/shared/icons/DynamicIcon";
import type { HydratedPlan, PlanAction, UsagePool } from "artisan-roast-sdk/plans";

interface PoolCtaMenuProps {
  pools: UsagePool[];
  plan: HydratedPlan;
  onAction: (action: PlanAction, plan: HydratedPlan) => void;
}

export function PoolCtaMenu({ pools, plan, onAction }: PoolCtaMenuProps) {
  const ctas = pools.flatMap((p) => (p.cta ? [p.cta] : []));
  if (ctas.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Pool actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ctas.map((action) => (
          <PoolCtaItem key={action.slug} action={action} plan={plan} onAction={onAction} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PoolCtaItem({
  action,
  plan,
  onAction,
}: {
  action: PlanAction;
  plan: HydratedPlan;
  onAction: (action: PlanAction, plan: HydratedPlan) => void;
}) {
  const iconAfter = action.iconAfter ? resolveIconComponent(action.iconAfter) : null;
  const iconBefore = action.iconBefore ? resolveIconComponent(action.iconBefore) : null;
  const isDisabled = action.disabled === true;

  const item = (
    <DropdownMenuItem
      key={action.slug}
      disabled={isDisabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDisabled) onAction(action, plan);
      }}
    >
      {iconBefore && React.createElement(iconBefore, { className: "mr-2 h-3.5 w-3.5" })}
      {action.label}
      {iconAfter && React.createElement(iconAfter, { className: "ml-auto h-3.5 w-3.5 text-muted-foreground" })}
    </DropdownMenuItem>
  );

  if (isDisabled && action.disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block">{item}</span>
          </TooltipTrigger>
          <TooltipContent>{action.disabledReason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return item;
}
