"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Hourglass,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { resolveIconComponent } from "@/components/shared/icons/DynamicIcon";
import { IS_DEMO } from "@/lib/demo";
import { Progress } from "@/components/ui/progress";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { refreshLicense } from "../actions";
import { startCheckout } from "./actions";
import { ConfirmActionDialog } from "./_components/ConfirmActionDialog";
import {
  PaymentConfirmModal,
  type PaymentModalState,
} from "./_components/PaymentConfirmModal";
import { PoolCtaMenu } from "./_components/PoolCtaMenu";

import type { LicenseInfo } from "@/lib/license-types";
import type {
  HydratedPlan,
  PlanAction,
  UsagePool as SdkUsagePool,
  FeedbackFormModal,
  PaymentConfirmModal as PaymentConfirmModalConfig,
  PendingState,
} from "artisan-roast-sdk/plans";
import {
  computePoolTotal,
  formatDaysRemaining,
  formatDeactivatedDate,
  formatDeprovisionDate,
  formatIntervalLabel,
  formatPoolCount,
  formatPriceDisplay,
  formatPriceLabel,
  isSaleActive,
} from "./formatters";

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
    config: FeedbackFormModal;
    slug: string;
  } | null>(null);

  // PaymentConfirmModal state — null when modal is closed. Driven by clicks
  // on actions with a paymentConfirm modalSlug, and by transitions observed
  // in the useEffects below.
  const [paymentModal, setPaymentModal] = useState<{
    state: PaymentModalState;
    modal: PaymentConfirmModalConfig;
    action: PlanAction;
    planSlug: string;
    stripeTab: Window | null;
  } | null>(null);

  // Track whether we've observed plan-status === PENDING during this attempt.
  // Without this gate, the plan-state watcher below would fire `error` the
  // instant the modal enters polling — because the platform's synchronous
  // PENDING write may not have propagated to the next router.refresh yet, so
  // the local `plans` prop is still NONE for a brief window. We only treat
  // NONE as failure once we've seen PENDING, i.e. PENDING → NONE = real
  // payment reversion. Resets when a new attempt starts.
  const seenPendingRef = useRef(false);

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

  // Watch plan state for transitions while the modal is in `polling`.
  // The state machine for PaymentConfirmModal is driven entirely from
  // polled plan data — no frontend-only triggers. See seenPendingRef above
  // for why we gate the NONE-as-failure branch.
  useEffect(() => {
    if (paymentModal?.state !== "polling") return;
    const currentPlan = plans.find((p) => p.slug === paymentModal.planSlug);
    if (!currentPlan) return;

    if (currentPlan.state.status === "ACTIVE") {
      // Auto-close on success
      paymentModal.stripeTab?.close();
      seenPendingRef.current = false;
      setPaymentModal(null);
      return;
    }

    if (currentPlan.state.status === "PENDING") {
      // Latch: subsequent NONE for this slug is now treated as failure.
      seenPendingRef.current = true;
      return;
    }

    if (currentPlan.state.status === "NONE" && seenPendingRef.current) {
      // Real failure: plan went PENDING then back to NONE (payment failed /
      // cancelled / session expired).
      paymentModal.stripeTab?.close();
      seenPendingRef.current = false;
      setPaymentModal((prev) => (prev ? { ...prev, state: "error" } : null));
    }
  }, [paymentModal, plans]);

  // Single polling orchestrator — picks the right cadence based on what
  // needs watching:
  //   - 5s   while a payment modal is in `polling` (active payment window;
  //          drives modal state-machine transitions to ACTIVE / NONE)
  //   - 10s  while at least one plan in `plans` is PENDING with no active
  //          modal for it (safety-net for the durable card so it stays alive
  //          when the user closed the modal / refreshed / navigated away)
  //   - off  otherwise
  //
  // Replaces what was previously two independent pollers (one in this
  // component, one in PendingCard). PendingCard is now purely presentational.
  const modalPolling = paymentModal?.state === "polling";
  const hasPendingPlan = plans.some((p) => p.state.status === "PENDING");
  useEffect(() => {
    if (!modalPolling && !hasPendingPlan) return;
    const cadence = modalPolling ? 5_000 : 10_000;
    const id = setInterval(() => router.refresh(), cadence);
    return () => clearInterval(id);
  }, [modalPolling, hasPendingPlan, router]);

  // Tab-closed detection — gives the modal fast feedback when the user closes
  // the Stripe tab without paying (instead of waiting for the session-expired
  // webhook). Routes to the same generic error state — no reason variants.
  useEffect(() => {
    if (paymentModal?.state !== "polling") return;
    if (!paymentModal.stripeTab) return;
    const id = setInterval(() => {
      if (paymentModal.stripeTab?.closed) {
        setPaymentModal((prev) => (prev ? { ...prev, state: "error" } : null));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [paymentModal]);

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

  // Synchronous-blank-tab payment flow. Single code path for both initial
  // action click and Try Again retry — see AC-MODAL-RETRY. Must be called
  // synchronously from a click handler (the window.open below relies on the
  // user-gesture permission that only direct click handlers carry).
  function startPaymentFlow(
    action: PlanAction,
    plan: HydratedPlan,
    modal: PaymentConfirmModalConfig
  ) {
    // Reset the "have we seen PENDING for this attempt" latch — a retry
    // starts a brand-new attempt and shouldn't inherit stale state.
    seenPendingRef.current = false;

    // 1. Synchronously pre-open a blank tab so the eventual navigation to
    //    Stripe survives popup blockers. The tab sits blank until the
    //    endpoint returns a URL.
    const stripeTab =
      typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;

    // Popup blocker denied permission (or embedded-browser context). Without
    // a tab the polling flow has nowhere to redirect — surface the error
    // immediately so the user can re-trigger from a fresh user gesture.
    if (typeof window !== "undefined" && stripeTab === null) {
      setPaymentModal({
        state: "error",
        modal,
        action,
        planSlug: plan.slug,
        stripeTab: null,
      });
      return;
    }

    // 2. Mount modal in `preparing`.
    setPaymentModal({
      state: "preparing",
      modal,
      action,
      planSlug: plan.slug,
      stripeTab,
    });

    // 3. Async — call the platform endpoint. On success: navigate the blank
    //    tab to the returned Stripe URL + transition modal to `polling`. On
    //    failure/timeout: close the blank tab + transition modal to `error`.
    if (!action.endpoint) {
      stripeTab?.close();
      setPaymentModal((prev) => (prev ? { ...prev, state: "error" } : null));
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    fetch(action.endpoint, { method: "POST", signal: controller.signal })
      .then(async (resp) => {
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error(`endpoint returned ${resp.status}`);
        const data = (await resp.json()) as { stripeUrl?: string; url?: string };
        const url = data.stripeUrl ?? data.url;
        if (!url) throw new Error("no stripeUrl in response");
        if (stripeTab) stripeTab.location.href = url;
        setPaymentModal((prev) => (prev ? { ...prev, state: "polling" } : null));
      })
      .catch(() => {
        clearTimeout(timeoutId);
        stripeTab?.close();
        setPaymentModal((prev) => (prev ? { ...prev, state: "error" } : null));
      });
  }

  function handleAction(action: PlanAction, plan: HydratedPlan) {
    if (action.modalSlug) {
      const config = plan.actionModals?.find((m) => m.slug === action.modalSlug);
      if (config?.type === "feedbackForm") {
        setActiveModal({ config, slug: action.modalSlug });
        return;
      }
      if (config?.type === "paymentConfirm") {
        startPaymentFlow(action, plan, config);
        return;
      }
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
      if (IS_DEMO) {
        handleSubscribe(plan.slug);
        return;
      }
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

      <PaymentConfirmModal
        state={paymentModal?.state ?? null}
        modal={paymentModal?.modal ?? null}
        onRetry={() => {
          if (!paymentModal) return;
          const plan = plans.find((p) => p.slug === paymentModal.planSlug);
          if (!plan) return;
          // The prior Stripe session may have been cancelled server-side, so
          // we always re-run the flow from scratch — never reuse the URL.
          paymentModal.stripeTab?.close();
          startPaymentFlow(paymentModal.action, plan, paymentModal.modal);
        }}
        onClose={() => {
          paymentModal?.stripeTab?.close();
          setPaymentModal(null);
        }}
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
    case "PENDING":
      return (
        <PendingCard
          plan={plan}
          state={state}
          detailHref={detailHref}
          onCardClick={onCardClick}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// PoolBar — progress bar for SDK UsagePool
// ---------------------------------------------------------------------------

function PoolBar({ pool }: { pool: SdkUsagePool }) {
  const total = computePoolTotal(pool);
  const pct = total > 0 ? (pool.used / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <PlanBadgeIcon name={pool.icon} className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{pool.label}</span>
        </div>
        <span className="tabular-nums">{formatPoolCount(pool)}</span>
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
  const hasSale = !isFree && isSaleActive(plan);
  const priceDisplay = isFree ? "Free" : formatPriceDisplay(plan.price);
  const salePriceDisplay = hasSale ? formatPriceDisplay(plan.salePrice!) : null;
  const intervalLabel = isFree ? "" : formatIntervalLabel(plan.interval);
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
          <PoolCtaMenu pools={pools} plan={plan} onAction={onAction} />
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
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="secondary" className="gap-1.5">
            <PlanBadgeIcon name={state.badgeIcon} fallback={Clock} className="h-3.5 w-3.5" />
            {state.badge}
          </Badge>
          <PoolCtaMenu pools={pools} plan={plan} onAction={onAction} />
        </div>
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
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className="gap-1.5">
            <PlanBadgeIcon name={state.badgeIcon} fallback={Clock} className="h-3.5 w-3.5" />
            {state.badge}
          </Badge>
          <PoolCtaMenu pools={pools} plan={plan} onAction={onAction} />
        </div>
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
    ? formatDeprovisionDate(state.deprovisionAt)
    : null;
  const daysRemainingText =
    "daysRemaining" in state && typeof state.daysRemaining === "number"
      ? formatDaysRemaining(state.daysRemaining)
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
          {daysRemainingText && (
            <p className="text-sm text-muted-foreground">{daysRemainingText}</p>
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
  const hasSale = isSaleActive(plan);
  const priceDisplay = formatPriceDisplay(plan.price);
  const salePriceDisplay = hasSale ? formatPriceDisplay(plan.salePrice!) : null;
  const intervalLabel = formatIntervalLabel(plan.interval);
  const priceLabel = formatPriceLabel(plan);
  const deactivatedDate = formatDeactivatedDate(state.deactivatedAt);
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

// ---------------------------------------------------------------------------
// PendingCard — durable representation of a plan in `PENDING` state, i.e. the
// payment+provisioning window after a successful subscribe/convert action.
//
// Layout mirrors NoneCard (price section + benefits + CTA row) so the customer
// sees what they paid for. Differences from NoneCard:
//
//   1. Badge in the top-right slot: hard-coded "Pending" + Hourglass icon —
//      universal store-side display (no plan-level variation; no SDK or
//      resolver involvement).
//   2. Description slot is swapped to render `state.statusInfo.descText`
//      instead of `plan.description`. Both PENDING substates render through
//      this same path — the only difference is the resolver-supplied descText
//      ("Confirming your payment…" vs "Setting up your store…"). No frontend
//      branching on substate (AC-PENDING-SUBSTATES).
//   3. CTA row is a single "View Details" ghost — hard-coded (universal
//      store-side display; URL derived from plan.slug).
//
// TODO (PR-PENDING-ACTIONS, platform): when the resolver ships substate-
// aware `state.actions` (Check Status primary in provisioning substate,
// empty during confirming-payment), iterate state.actions in the CTA row
// alongside View Details — same pattern as NoneCard. View Details stays
// hard-coded because it's universal store-side display.
// See docs/features/provider-plan-sdk-alignment/session-2/ACs.md.
//
// Polling is handled by the single orchestrator in PlanPageClient (5s while
// a payment modal is in `polling`, 10s otherwise when any plan is PENDING).
// PendingCard is purely presentational — it doesn't run its own setInterval.
// ---------------------------------------------------------------------------

function PendingCard({
  plan,
  state,
  detailHref,
  onCardClick,
}: {
  plan: HydratedPlan;
  state: PendingState;
  detailHref: string;
  onCardClick: (e: React.MouseEvent) => void;
}) {
  const router = useRouter();

  const isFree = plan.price === 0;
  const hasSale = !isFree && isSaleActive(plan);
  const priceDisplay = isFree ? "Free" : formatPriceDisplay(plan.price);
  const salePriceDisplay = hasSale ? formatPriceDisplay(plan.salePrice!) : null;
  const intervalLabel = isFree ? "" : formatIntervalLabel(plan.interval);
  const priceLabel = formatPriceLabel(plan);

  return (
    <div
      data-testid="pending-card"
      className="flex flex-col rounded-lg border p-6 space-y-5 transition-shadow hover:shadow-lg cursor-pointer"
      onClick={onCardClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          {state.statusInfo?.descText && (
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground mt-1"
            >
              {state.statusInfo.descText}
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className="shrink-0 gap-1.5"
          data-testid="pending-badge"
        >
          <Hourglass className="h-3.5 w-3.5" />
          Pending
        </Badge>
      </div>

      {!isFree && (
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

      <div className="flex items-center gap-2 mt-auto pt-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(detailHref);
          }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View Details
        </button>
        <div className="flex-1" />
        {/* state.actions iteration lands here when PR-PENDING-ACTIONS ships
            (Check Status primary in provisioning substate, etc.). */}
      </div>
    </div>
  );
}
