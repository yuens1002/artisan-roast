"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MoreVertical,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { resolveIconComponent } from "@/components/shared/icons/DynamicIcon";
import { IS_DEMO } from "@/lib/demo";
import { Progress } from "@/components/ui/progress";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { refreshLicense } from "../actions";
import { startCheckout } from "./actions";
import { ConfirmActionDialog } from "./_components/ConfirmActionDialog";

import type { LicenseInfo } from "@/lib/license-types";
import type {
  HydratedPlan,
  PlanAction,
  UsagePool as SdkUsagePool,
  ConfirmActionConfig,
} from "artisan-roast-sdk/plans";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveIcon(icon: string, fallback: LucideIcon = ExternalLink): LucideIcon {
  return resolveIconComponent(icon, fallback);
}

function PlanBadgeIcon({
  name,
  fallback: Fallback,
  className,
}: {
  name?: string;
  fallback?: LucideIcon;
  className?: string;
}) {
  const Icon = name ? resolveIcon(name, Fallback) : Fallback;
  if (!Icon) return null;
  return React.createElement(Icon, { className });
}

function formatPriceLabel(plan: HydratedPlan): string | null {
  if (!plan.saleLabel && !plan.saleEndsAt) return null;
  if (plan.saleEndsAt && new Date(plan.saleEndsAt) <= new Date()) return null;
  const parts: string[] = [];
  if (plan.saleLabel) parts.push(plan.saleLabel);
  if (plan.saleEndsAt) {
    const ends = new Date(plan.saleEndsAt).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    parts.push(`offer ends ${ends}`);
  }
  return parts.join(", ");
}

function actionVariant(
  v: PlanAction["variant"]
): "default" | "outline" | "ghost" | "destructive" | "secondary" {
  if (v === "primary") return "default";
  if (v === "secondary") return "outline";
  return v ?? "default";
}

// ---------------------------------------------------------------------------
// State type aliases (discriminated union variants)
// ---------------------------------------------------------------------------

type NoneState = Extract<HydratedPlan["state"], { status: "NONE" }>;
type ActiveState = Extract<HydratedPlan["state"], { status: "ACTIVE" }>;
type TrialState = Extract<HydratedPlan["state"], { status: "TRIAL" }>;
type ExpiredState = Extract<HydratedPlan["state"], { status: "EXPIRED" }>;
type CancelledState = Extract<HydratedPlan["state"], { status: "CANCELLED" }>;
type InactiveState = Extract<HydratedPlan["state"], { status: "INACTIVE" }>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlanPageClientProps {
  license: LicenseInfo;
  plans: HydratedPlan[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanPageClient({ license, plans }: PlanPageClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [activeModal, setActiveModal] = useState<{
    config: ConfirmActionConfig;
    slug: string;
  } | null>(null);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      startTransition(async () => {
        const result = await refreshLicense();
        if (result.success) {
          toast({ title: "Plan activated — you now have priority support!" });
        }
      });
    }
    if (searchParams.get("demo") === "success") {
      toast({ title: "Purchase complete — Demo mode, no charge made." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubscribe(planSlug: string) {
    const formData = new FormData();
    formData.set("planSlug", planSlug);

    startTransition(async () => {
      const result = await startCheckout(formData);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast({
          title: "Checkout failed",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  function handleAction(action: PlanAction, plan: HydratedPlan) {
    if (action.modalSlug) {
      const config = plan.actionModals?.find((m) => m.slug === action.modalSlug);
      if (config) setActiveModal({ config, slug: action.modalSlug });
      return;
    }
    if (action.url) {
      if (action.url.startsWith("/")) {
        router.push(action.url);
      } else if (IS_DEMO) {
        handleSubscribe(plan.slug);
      } else {
        window.open(action.url, "_blank", "noopener,noreferrer");
      }
      return;
    }
    if (action.endpoint) {
      startTransition(async () => {
        try {
          const resp = await fetch(action.endpoint!, { method: "POST" });
          if (resp.ok) {
            const data = (await resp.json()) as { url?: string };
            if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
          } else {
            toast({ title: "Action failed", variant: "destructive" });
          }
        } catch {
          toast({ title: "Action failed", variant: "destructive" });
        }
      });
      return;
    }
    handleSubscribe(plan.slug);
  }

  return (
    <div className="max-w-5xl space-y-8">
      <PageTitle title="Plans" subtitle="Browse and manage your support plan" />

      {license.warnings.length > 0 && (
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Compatibility Notice
          </div>
          <ul className="list-disc pl-6 text-sm text-amber-700 dark:text-amber-300">
            {license.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {plans.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              isPending={isPending}
              onAction={handleAction}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Plans could not be loaded. If you&apos;re a subscriber, your
            existing plan remains active. Please check your connection or try
            again.
          </p>
        </div>
      )}

      <ConfirmActionDialog
        open={activeModal !== null}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
        cardAdded={activeModal?.slug === "cancel-stripe"}
        config={activeModal?.config}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanCard — dispatches to status-specific card
// ---------------------------------------------------------------------------

interface PlanCardBaseProps {
  plan: HydratedPlan;
  isPending: boolean;
  onAction: (action: PlanAction, plan: HydratedPlan) => void;
}

function PlanCard({ plan, isPending, onAction }: PlanCardBaseProps) {
  const router = useRouter();
  const isFree = plan.price === 0;
  const detailHref = isFree
    ? "/admin/terms/terms-of-service"
    : `/admin/support/plans/${plan.slug}`;

  function onCardClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [role=menuitem]")) return;
    router.push(detailHref);
  }

  const { state } = plan;

  switch (state.status) {
    case "NONE":
      return (
        <NoneCard
          plan={plan}
          state={state}
          isPending={isPending}
          onAction={onAction}
          onCardClick={onCardClick}
        />
      );
    case "ACTIVE":
      return (
        <ActiveCard
          plan={plan}
          state={state}
          isPending={isPending}
          onAction={onAction}
          onCardClick={onCardClick}
        />
      );
    case "TRIAL":
      return (
        <TrialCard
          plan={plan}
          state={state}
          onAction={onAction}
          onCardClick={onCardClick}
        />
      );
    case "EXPIRED":
      return (
        <ExpiredCard
          plan={plan}
          state={state}
          onAction={onAction}
          onCardClick={onCardClick}
        />
      );
    case "CANCELLED":
      return (
        <CancelledCard
          plan={plan}
          state={state}
          onAction={onAction}
          onCardClick={onCardClick}
        />
      );
    case "INACTIVE":
      return (
        <InactiveCard
          plan={plan}
          state={state}
          onAction={onAction}
          onCardClick={onCardClick}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// PoolBar — progress bar for SDK UsagePool
// ---------------------------------------------------------------------------

function PoolBar({ pool }: { pool: SdkUsagePool }) {
  const total = pool.limit + (pool.purchased ?? 0);
  const pct = total > 0 ? (pool.used / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <PlanBadgeIcon name={pool.icon} className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{pool.label}</span>
        </div>
        <span className="tabular-nums">
          {pool.used} / {total} {pool.countLabel}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// NoneCard — available plan, not subscribed
// ---------------------------------------------------------------------------

function NoneCard({
  plan,
  state,
  isPending,
  onAction,
  onCardClick,
}: {
  plan: HydratedPlan;
  state: NoneState;
  isPending: boolean;
  onAction: (action: PlanAction, plan: HydratedPlan) => void;
  onCardClick: (e: React.MouseEvent) => void;
}) {
  const isFree = plan.price === 0;
  const ghostAction = state.actions.find((a) => a.variant === "ghost");
  const primaryActions = state.actions.filter((a) => a.variant !== "ghost");
  const hasSale = !isFree && plan.salePrice != null;
  const priceDisplay = isFree ? "Free" : `$${(plan.price / 100).toFixed(0)}`;
  const salePriceDisplay = hasSale ? `$${(plan.salePrice! / 100).toFixed(0)}` : null;
  const intervalLabel = isFree ? "" : plan.interval === "year" ? "/yr" : "/mo";
  const priceLabel = formatPriceLabel(plan);

  return (
    <div
      className="flex flex-col rounded-lg border p-6 space-y-5 transition-shadow hover:shadow-lg cursor-pointer"
      onClick={onCardClick}
    >
      <div>
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
      </div>

      <div>
        {hasSale ? (
          <>
            <span className="text-3xl font-bold">{salePriceDisplay}</span>
            <span className="text-muted-foreground">{intervalLabel}</span>
            <span className="ml-2 text-lg text-muted-foreground line-through">
              {priceDisplay}
            </span>
          </>
        ) : (
          <>
            <span className="text-3xl font-bold">{priceDisplay}</span>
            <span className="text-muted-foreground">{intervalLabel}</span>
          </>
        )}
        {priceLabel && (
          <p className="text-xs text-muted-foreground mt-1">{priceLabel}</p>
        )}
      </div>

      {plan.details.benefits?.activeItems && plan.details.benefits.activeItems.length > 0 && (
        <>
          {plan.details.benefits.activeHeader && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {plan.details.benefits.activeHeader}
            </p>
          )}
          <ul className="space-y-2 text-sm">
            {plan.details.benefits.activeItems.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                {benefit}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex items-center gap-2 mt-auto pt-0">
        {ghostAction && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction(ghostAction, plan);
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {ghostAction.label}
          </button>
        )}
        {primaryActions.length > 0 && <div className="flex-1" />}
        {primaryActions.map((action) => {
          const Icon = action.iconAfter ? resolveIcon(action.iconAfter) : null;
          const IconBefore = action.iconBefore ? resolveIcon(action.iconBefore) : null;
          return (
            <Button
              key={action.slug}
              variant={actionVariant(action.variant)}
              size="sm"
              disabled={isPending}
              onClick={(e) => {
                e.stopPropagation();
                onAction(action, plan);
              }}
            >
              {isPending && action.variant === "primary" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {IconBefore && <IconBefore className="mr-1.5 h-3.5 w-3.5" />}
              {action.label}
              {Icon && <Icon className="ml-1.5 h-3.5 w-3.5" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActiveCard — active subscription or current free plan
// ---------------------------------------------------------------------------

function ActiveCard({
  plan,
  state,
  isPending,
  onAction,
  onCardClick,
}: {
  plan: HydratedPlan;
  state: ActiveState;
  isPending: boolean;
  onAction: (action: PlanAction, plan: HydratedPlan) => void;
  onCardClick: (e: React.MouseEvent) => void;
}) {
  const pools = state.pools ?? [];
  const poolCtaActions = pools.flatMap((p) => (p.cta ? [p.cta] : []));
  const ghostActions = state.actions.filter((a) => a.variant === "ghost");
  const menuActions = state.actions.filter((a) => a.variant !== "ghost");

  return (
    <div
      className="flex flex-col rounded-lg border border-primary p-6 transition-shadow hover:shadow-lg cursor-pointer"
      onClick={onCardClick}
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="secondary" className="gap-1.5">
            <PlanBadgeIcon name={state.badgeIcon} fallback={CheckCircle2} className="h-3.5 w-3.5" />
            {state.badge}
          </Badge>
          {poolCtaActions.length > 0 && (
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
                {poolCtaActions.map((action) => {
                  const Icon = action.iconAfter ? resolveIcon(action.iconAfter) : null;
                  const IconBefore = action.iconBefore ? resolveIcon(action.iconBefore) : null;
                  return (
                    <DropdownMenuItem
                      key={action.slug}
                      onClick={(e) => { e.stopPropagation(); onAction(action, plan); }}
                    >
                      {IconBefore && <IconBefore className="mr-2 h-3.5 w-3.5" />}
                      {action.label}
                      {Icon && <Icon className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="space-y-5 flex-1">
        {pools.length > 0 ? (
          pools.map((pool) => <PoolBar key={pool.slug} pool={pool} />)
        ) : (
          plan.details.benefits?.activeItems &&
          plan.details.benefits.activeItems.length > 0 && (
            <ul className="space-y-2 text-sm">
              {plan.details.benefits.activeItems.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  {benefit}
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {/* Bottom CTA: management actions — ghost left, primary/secondary right */}
      <div className="flex items-center gap-2 mt-auto pt-5">
        {ghostActions.map((action) => (
          <button
            key={action.slug}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction(action, plan);
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {action.label}
          </button>
        ))}
        {menuActions.length > 0 && <div className="flex-1" />}
        {menuActions.map((action) => {
          const Icon = action.iconAfter ? resolveIcon(action.iconAfter) : null;
          const IconBefore = action.iconBefore ? resolveIcon(action.iconBefore) : null;
          return (
            <Button
              key={action.slug}
              variant={actionVariant(action.variant)}
              size="sm"
              disabled={isPending}
              onClick={(e) => {
                e.stopPropagation();
                onAction(action, plan);
              }}
            >
              {IconBefore && <IconBefore className="mr-1.5 h-3.5 w-3.5" />}
              {action.label}
              {Icon && <Icon className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrialCard — active trial
// ---------------------------------------------------------------------------

function TrialCard({
  plan,
  state,
  onAction,
  onCardClick,
}: {
  plan: HydratedPlan;
  state: TrialState;
  onAction: (action: PlanAction, plan: HydratedPlan) => void;
  onCardClick: (e: React.MouseEvent) => void;
}) {
  const pools = state.pools ?? [];
  const ghostActions = state.actions.filter((a) => a.variant === "ghost");
  const primaryActions = state.actions.filter((a) => a.variant !== "ghost");

  return (
    <div
      className="flex flex-col rounded-lg border border-primary p-6 transition-shadow hover:shadow-lg cursor-pointer"
      onClick={onCardClick}
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 gap-1.5">
          <PlanBadgeIcon name={state.badgeIcon} fallback={Clock} className="h-3.5 w-3.5" />
          {state.badge}
        </Badge>
      </div>

      <div className="space-y-5 flex-1">
        {pools.map((pool) => <PoolBar key={pool.slug} pool={pool} />)}

        {state.statusInfo && (
          <p className="text-sm text-muted-foreground">
            {state.statusInfo.descText}
          </p>
        )}

        {plan.details.benefits?.activeItems && plan.details.benefits.activeItems.length > 0 && (
          <>
            {plan.details.benefits.activeHeader && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {plan.details.benefits.activeHeader}
              </p>
            )}
            <ul className="space-y-2 text-sm">
              {plan.details.benefits.activeItems.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  {benefit}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 mt-auto pt-5">
        {ghostActions.map((action) => (
          <button
            key={action.slug}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction(action, plan);
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {action.label}
          </button>
        ))}
        {primaryActions.length > 0 && <div className="flex-1" />}
        {primaryActions.map((action) => {
          const Icon = action.iconAfter ? resolveIcon(action.iconAfter) : null;
          const IconBefore = action.iconBefore ? resolveIcon(action.iconBefore) : null;
          return (
            <Button
              key={action.slug}
              variant={actionVariant(action.variant)}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAction(action, plan);
              }}
            >
              {IconBefore && <IconBefore className="mr-1.5 h-3.5 w-3.5" />}
              {action.label}
              {Icon && <Icon className="ml-1.5 h-3.5 w-3.5" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExpiredCard — trial expired
// ---------------------------------------------------------------------------

function ExpiredCard({
  plan,
  state,
  onAction,
  onCardClick,
}: {
  plan: HydratedPlan;
  state: ExpiredState;
  onAction: (action: PlanAction, plan: HydratedPlan) => void;
  onCardClick: (e: React.MouseEvent) => void;
}) {
  const pools = state.pools ?? [];
  const ghostActions = state.actions.filter((a) => a.variant === "ghost");
  const primaryActions = state.actions.filter((a) => a.variant !== "ghost");

  return (
    <div
      className="flex flex-col rounded-lg border p-6 transition-shadow hover:shadow-lg cursor-pointer"
      onClick={onCardClick}
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
        </div>
        <Badge variant="outline" className="shrink-0 gap-1.5">
          <PlanBadgeIcon name={state.badgeIcon} fallback={Clock} className="h-3.5 w-3.5" />
          {state.badge}
        </Badge>
      </div>

      <div className="space-y-5 flex-1">
        {pools.map((pool) => <PoolBar key={pool.slug} pool={pool} />)}

        {state.statusInfo && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {state.statusInfo.descText}
          </p>
        )}

        {plan.details.benefits?.activeItems && plan.details.benefits.activeItems.length > 0 && (
          <>
            {plan.details.benefits.activeHeader && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {plan.details.benefits.activeHeader}
              </p>
            )}
            <ul className="space-y-2 text-sm">
              {plan.details.benefits.activeItems.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  {benefit}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 mt-auto pt-5">
        {ghostActions.map((action) => (
          <button
            key={action.slug}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction(action, plan);
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {action.label}
          </button>
        ))}
        {primaryActions.length > 0 && <div className="flex-1" />}
        {primaryActions.map((action) => {
          const Icon = action.iconAfter ? resolveIcon(action.iconAfter) : null;
          const IconBefore = action.iconBefore ? resolveIcon(action.iconBefore) : null;
          return (
            <Button
              key={action.slug}
              variant={actionVariant(action.variant)}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAction(action, plan);
              }}
            >
              {IconBefore && <IconBefore className="mr-1.5 h-3.5 w-3.5" />}
              {action.label}
              {Icon && <Icon className="ml-1.5 h-3.5 w-3.5" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CancelledCard — trial cancelled, awaiting deprovision
// ---------------------------------------------------------------------------

function CancelledCard({
  plan,
  state,
  onAction,
  onCardClick,
}: {
  plan: HydratedPlan;
  state: CancelledState;
  onAction: (action: PlanAction, plan: HydratedPlan) => void;
  onCardClick: (e: React.MouseEvent) => void;
}) {
  const deprovisionDate = state.deprovisionAt
    ? new Date(state.deprovisionAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className="flex flex-col rounded-lg border p-6 transition-shadow hover:shadow-lg cursor-pointer"
      onClick={onCardClick}
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          {deprovisionDate && (
            <p className="text-sm text-muted-foreground mt-1">
              Store will be removed on {deprovisionDate}.
            </p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0">
          {state.badge}
        </Badge>
      </div>

      {state.actions.length > 0 && (
        <div className="flex items-center gap-2 mt-auto pt-5">
          <div className="flex-1" />
          {state.actions.map((action) => {
            const Icon = action.iconAfter ? resolveIcon(action.iconAfter) : null;
            const IconBefore = action.iconBefore ? resolveIcon(action.iconBefore) : null;
            return (
              <Button
                key={action.slug}
                variant={actionVariant(action.variant)}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(action, plan);
                }}
              >
                {IconBefore && <IconBefore className="mr-1.5 h-3.5 w-3.5" />}
                {action.label}
                {Icon && <Icon className="ml-1.5 h-3.5 w-3.5" />}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InactiveCard — lapsed subscription
// ---------------------------------------------------------------------------

function InactiveCard({
  plan,
  state,
  onAction,
  onCardClick,
}: {
  plan: HydratedPlan;
  state: InactiveState;
  onAction: (action: PlanAction, plan: HydratedPlan) => void;
  onCardClick: (e: React.MouseEvent) => void;
}) {
  const hasSale = plan.salePrice != null;
  const priceDisplay = `$${(plan.price / 100).toFixed(0)}`;
  const salePriceDisplay = hasSale ? `$${(plan.salePrice! / 100).toFixed(0)}` : null;
  const intervalLabel = plan.interval === "year" ? "/yr" : "/mo";
  const priceLabel = formatPriceLabel(plan);
  const deactivatedDate = new Date(state.deactivatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const benefits =
    plan.details.benefits?.inactiveItems ??
    plan.details.benefits?.activeItems ??
    [];
  const benefitsHeader = plan.details.benefits?.inactiveItems
    ? plan.details.benefits?.inactiveHeader
    : plan.details.benefits?.activeHeader;
  const ghostAction = state.actions.find((a) => a.variant === "ghost");
  const primaryActions = state.actions.filter((a) => a.variant !== "ghost");
  return (
    <div
      className="flex flex-col rounded-lg border p-6 space-y-4 transition-shadow hover:shadow-lg cursor-pointer"
      onClick={onCardClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ended on {deactivatedDate}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 gap-1.5">
          <PlanBadgeIcon name={state.badgeIcon} className="h-3.5 w-3.5" />
          {state.badge}
        </Badge>
      </div>

      <div>
        {hasSale ? (
          <>
            <span className="text-3xl font-bold">{salePriceDisplay}</span>
            <span className="text-muted-foreground">{intervalLabel}</span>
            <span className="ml-2 text-lg text-muted-foreground line-through">
              {priceDisplay}
            </span>
          </>
        ) : (
          <>
            <span className="text-3xl font-bold">{priceDisplay}</span>
            <span className="text-muted-foreground">{intervalLabel}</span>
          </>
        )}
        {priceLabel && (
          <p className="text-xs text-muted-foreground mt-1">{priceLabel}</p>
        )}
      </div>

      {benefits.length > 0 && (
        <>
          {benefitsHeader && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {benefitsHeader}
            </p>
          )}
          <ul className="space-y-1.5 text-sm">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                {benefit}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1">
        {ghostAction && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction(ghostAction, plan);
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {ghostAction.label}
          </button>
        )}
        {primaryActions.length > 0 && <div className="flex-1" />}
        {primaryActions.map((action) => {
          const Icon = action.iconAfter ? resolveIcon(action.iconAfter) : null;
          const IconBefore = action.iconBefore ? resolveIcon(action.iconBefore) : null;
          return (
            <Button
              key={action.slug}
              variant={actionVariant(action.variant)}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAction(action, plan);
              }}
            >
              {IconBefore && <IconBefore className="mr-1.5 h-3.5 w-3.5" />}
              {action.label}
              {Icon && <Icon className="ml-1.5 h-3.5 w-3.5" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
