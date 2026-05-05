"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { resolveIconComponent } from "@/components/shared/icons/DynamicIcon";
import Link from "next/link";
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
import { UsageBar, getNextRenewalDate } from "../UsageBar";
import { refreshLicense } from "../actions";
import { startCheckout } from "./actions";
import { ConfirmActionDialog } from "./_components/ConfirmActionDialog";

import type {
  LicenseInfo,
  UsagePool,
  AvailableAction,
  CreditPool,
} from "@/lib/license-types";
import type { Plan } from "@/lib/plan-types";
import type {
  TrialStatus,
  TrialStatusActive,
  TrialStatusExpired,
} from "@/lib/hosted";

// ---------------------------------------------------------------------------
// Icon resolution — delegates to shared DynamicIcon utility
// ---------------------------------------------------------------------------

function resolveIcon(icon: string, fallback: LucideIcon = ExternalLink): LucideIcon {
  return resolveIconComponent(icon, fallback);
}

/** Build price label text, appending "offer ends {date}" when saleEndsAt is set. */
function formatPriceLabel(plan: Plan): string | null {
  if (!plan.saleLabel && !plan.saleEndsAt) return null;
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

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface PlanCardConfig {
  type: "plan";
  plan: Plan;
  status: "active" | "inactive" | "none";
  badge: { label: string; variant: "secondary" | "destructive" | "outline" } | null;
  pools: UsagePool[];
  actions: AvailableAction[];
  renewalDate: string | null;
  inactiveInfo: {
    deactivatedAt: string;
    renewUrl: string;
    previousFeatures: string[];
  } | null;
}

interface TrialCardConfig {
  type: "trial";
  plan: Plan;
  trialStatus: TrialStatusActive | TrialStatusExpired;
  extendUrl: string;
}

type CardConfig = TrialCardConfig | PlanCardConfig;

function computePlanCardConfig(
  plan: Plan,
  license: LicenseInfo
): PlanCardConfig {
  if (license.plan?.slug === plan.slug) {
    return {
      type: "plan",
      plan,
      status: "active",
      badge: { label: "Active", variant: "secondary" },
      pools: license.support.pools.filter(
        (p) => p.limit > 0 || p.purchased > 0
      ),
      actions: license.availableActions.filter(
        (a) => a.slug !== "upgrade-pro" && a.slug !== "add-features"
      ),
      renewalDate: license.plan.snapshotAt
        ? getNextRenewalDate(license.plan.snapshotAt, plan.interval)
        : null,
      inactiveInfo: null,
    };
  }

  if (license.lapsed?.planSlug === plan.slug) {
    return {
      type: "plan",
      plan,
      status: "inactive",
      badge: { label: "Inactive", variant: "outline" },
      pools: [],
      actions: [],
      renewalDate: null,
      inactiveInfo: {
        deactivatedAt: license.lapsed.deactivatedAt,
        renewUrl: license.lapsed.renewUrl,
        previousFeatures: license.lapsed.previousFeatures,
      },
    };
  }

  // Free plan: show "Current Plan" when user has no active paid plan
  if (plan.price === 0 && !license.plan) {
    return {
      type: "plan",
      plan,
      status: "active",
      badge: { label: "Current Plan", variant: "secondary" },
      pools: license.support.pools.filter((p) => p.purchased > 0),
      actions: license.availableActions.filter(
        (a) => a.slug !== "upgrade-pro" && a.slug !== "add-features"
      ),
      renewalDate: null,
      inactiveInfo: null,
    };
  }

  return {
    type: "plan",
    plan,
    status: "none",
    badge: null,
    pools: [],
    actions: [],
    renewalDate: null,
    inactiveInfo: null,
  };
}

function computeCardConfig(
  plan: Plan,
  license: LicenseInfo,
  trialStatus: TrialStatus | null | undefined,
  extendUrl: string,
): CardConfig {
  if (
    plan.slug === "house-blend-trial" &&
    trialStatus &&
    (trialStatus.status === "ACTIVE" || trialStatus.status === "EXPIRED")
  ) {
    return { type: "trial", plan, trialStatus, extendUrl };
  }
  return computePlanCardConfig(plan, license);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlanPageClientProps {
  license: LicenseInfo;
  plans: Plan[];
  trialStatus?: TrialStatus | null;
  extendUrl?: string;
  subscribeUrl?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanPageClient({
  license,
  plans,
  trialStatus,
  extendUrl,
  subscribeUrl,
}: PlanPageClientProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);

  const cardConfigs = plans.map((plan) =>
    computeCardConfig(plan, license, trialStatus, extendUrl ?? "")
  );

  const trialConfig = cardConfigs.find((c): c is TrialCardConfig => c.type === "trial");

  // Modal copy comes directly from the trial plan's payload — no slug lookup.
  const actionModalConfig = trialConfig?.plan.actionModal;

  // ACTIVE and CANCELLED both have cardAdded on the status object.
  const cardAdded =
    trialStatus?.status === "ACTIVE" || trialStatus?.status === "CANCELLED"
      ? trialStatus.cardAdded
      : false;

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      startTransition(async () => {
        const result = await refreshLicense();
        if (result.success) {
          toast({
            title: "Plan activated — you now have priority support!",
          });
        }
      });
    }
    if (searchParams.get("demo") === "success") {
      toast({ title: "Purchase complete — Demo mode, no charge made." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubscribe(planSlug: string) {
    // Hosted-mode House Blend uses a Stripe Payment Link directly — opens in new tab.
    if (planSlug === "house-blend" && subscribeUrl) {
      window.open(subscribeUrl, "_blank", "noopener,noreferrer");
      return;
    }

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

  const hasPlans = plans.length > 0;

  return (
    <div className="max-w-5xl space-y-8">
      <PageTitle
        title="Plans"
        subtitle="Browse and manage your support plan"
      />

      {/* Compatibility warnings */}
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

      {hasPlans ? (
        <div className="grid gap-4 md:grid-cols-2">
          {cardConfigs.map((config) =>
            config.type === "trial" ? (
              <TrialCard
                key={config.plan.slug}
                config={config}
                onCancelTrial={() => setCancelOpen(true)}
              />
            ) : (
              <PlanCard
                key={config.plan.slug}
                config={config}
                isPending={isPending}
                onSubscribe={handleSubscribe}
              />
            )
          )}
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

      {trialStatus && (
        <ConfirmActionDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          cardAdded={cardAdded}
          config={actionModalConfig}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanCard — shared card driven by config
// ---------------------------------------------------------------------------

interface PlanCardProps {
  config: PlanCardConfig;
  isPending: boolean;
  onSubscribe: (slug: string) => void;
}

function PlanCard({
  config,
  isPending,
  onSubscribe,
}: PlanCardProps) {
  const router = useRouter();
  const { plan, status } = config;
  const isFree = plan.price === 0;
  const detailHref = isFree ? "/admin/terms/terms-of-service" : `/admin/support/plans/${plan.slug}`;

  function handleCardClick(e: React.MouseEvent) {
    // Don't navigate if clicking interactive elements
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [role=menuitem]")) return;
    router.push(detailHref);
  }

  // ── Active: compact status-focused, 60/40 layout ──
  if (status === "active") {
    const isPaidActive = plan.price > 0;
    return (
      <div className="flex flex-col rounded-lg border border-primary p-6 transition-shadow hover:shadow-lg cursor-pointer" onClick={handleCardClick}>
          {/* Mobile: badge left + dropdown right (only when actions exist) */}
          {config.actions.length > 0 && (
            <div className="flex items-center justify-between lg:hidden mb-3">
              <Badge variant={config.badge!.variant} className="gap-1.5">
                {isPaidActive && <CheckCircle2 className="h-3.5 w-3.5" />}
                {config.badge!.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {config.actions.map((action) => {
                    const Icon = resolveIcon(action.icon);
                    return (
                      <DropdownMenuItem key={action.slug} asChild>
                        <a
                          href={action.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {action.label}
                          <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                        </a>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuItem asChild>
                    <Link href={detailHref}>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="space-y-5">
            {/* Title + badge inline (desktop always, mobile only when no actions) */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
              </div>
              <Badge
                variant={config.badge!.variant}
                className={`shrink-0 gap-1.5 ${config.actions.length > 0 ? "hidden lg:inline-flex" : ""}`}
              >
                {isPaidActive && <CheckCircle2 className="h-3.5 w-3.5" />}
                {config.badge!.label}
              </Badge>
            </div>

            {!isPaidActive && (
              <div>
                <span className="text-3xl font-bold">Free</span>
                {formatPriceLabel(plan) && (
                  <p className="text-xs text-muted-foreground mt-1">{formatPriceLabel(plan)}</p>
                )}
              </div>
            )}

            {config.renewalDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
                Renews on {config.renewalDate}
              </div>
            )}

            {!isPaidActive && config.pools.length === 0 && plan.details.benefits && plan.details.benefits.length > 0 && (
              <ul className="space-y-2 text-sm">
                {plan.details.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {benefit}
                  </li>
                ))}
              </ul>
            )}

            {config.pools.map((pool) => {
              const PoolIcon = resolveIcon(pool.icon);
              return (
                <UsageBar
                  key={pool.slug}
                  icon={
                    <PoolIcon className="h-4 w-4 text-muted-foreground" />
                  }
                  label={pool.label}
                  pool={pool}
                  showBreakdown={false}
                />
              );
            })}
          </div>

          {/* Desktop: inline buttons — always bottom-aligned */}
          <div className="hidden lg:flex items-center gap-2 mt-auto pt-5">
            <Link
              href={detailHref}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isPaidActive ? "View Details" : "View Terms"}
            </Link>
            <div className="flex-1" />
            {config.actions.map((action) => {
              const Icon = resolveIcon(action.icon);
              return (
                <Button
                  key={action.slug}
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={action.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {action.label}
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </Button>
              );
            })}
          </div>
      </div>
    );
  }

  // ── Inactive (lapsed): renewal CTA ──
  if (status === "inactive" && config.inactiveInfo) {
    const inactiveHasSale = plan.salePrice != null;
    const inactivePrice = `$${(plan.price / 100).toFixed(0)}`;
    const inactiveSalePrice = inactiveHasSale ? `$${(plan.salePrice! / 100).toFixed(0)}` : null;
    const inactiveInterval = plan.interval === "year" ? "/yr" : "/mo";

    return (
      <div className="flex flex-col rounded-lg border p-6 space-y-4 transition-shadow hover:shadow-lg cursor-pointer" onClick={handleCardClick}>
          {/* Title + badge inline */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ended on{" "}
                {new Date(
                  config.inactiveInfo.deactivatedAt
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <Badge variant={config.badge!.variant} className="shrink-0">
              {config.badge!.label}
            </Badge>
          </div>

          <div>
            {inactiveHasSale ? (
              <>
                <span className="text-3xl font-bold">{inactiveSalePrice}</span>
                <span className="text-muted-foreground">{inactiveInterval}</span>
                <span className="ml-2 text-lg text-muted-foreground line-through">{inactivePrice}</span>
              </>
            ) : (
              <>
                <span className="text-3xl font-bold">{inactivePrice}</span>
                <span className="text-muted-foreground">{inactiveInterval}</span>
              </>
            )}
            {formatPriceLabel(plan) && (
              <p className="text-xs text-muted-foreground mt-1">{formatPriceLabel(plan)}</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Renew to get back:
            </p>
            <ul className="space-y-1.5 text-sm">
              {config.inactiveInfo.previousFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 mt-auto pt-1">
            <Link
              href={detailHref}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View Details
            </Link>
            <div className="flex-1" />
            <Button size="sm" asChild>
              <a
                href={config.inactiveInfo.renewUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Renew
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
      </div>
    );
  }

  // ── None: full details to sell ──
  const hasSale = !isFree && plan.salePrice != null;
  const priceDisplay = isFree ? "Free" : `$${(plan.price / 100).toFixed(0)}`;
  const salePriceDisplay = hasSale ? `$${(plan.salePrice! / 100).toFixed(0)}` : null;
  const intervalLabel = isFree ? "" : plan.interval === "year" ? "/yr" : "/mo";

  return (
    <div className="flex flex-col rounded-lg border p-6 space-y-5 transition-shadow hover:shadow-lg cursor-pointer" onClick={handleCardClick}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {plan.description}
            </p>
          </div>
        </div>

        <div>
          {hasSale ? (
            <>
              <span className="text-3xl font-bold">{salePriceDisplay}</span>
              <span className="text-muted-foreground">{intervalLabel}</span>
              <span className="ml-2 text-lg text-muted-foreground line-through">{priceDisplay}</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold">{priceDisplay}</span>
              <span className="text-muted-foreground">{intervalLabel}</span>
            </>
          )}
          {formatPriceLabel(plan) && (
            <p className="text-xs text-muted-foreground mt-1">{formatPriceLabel(plan)}</p>
          )}
        </div>

        {plan.details.benefits && plan.details.benefits.length > 0 && (
          <ul className="space-y-2 text-sm">
            {plan.details.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                {benefit}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2 mt-auto pt-0">
          <Link
            href={detailHref}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isFree ? "View Terms" : "View Details"}
          </Link>
          {!isFree && (
            <>
              <div className="flex-1" />
              <Button
                size="sm"
                onClick={() => onSubscribe(plan.slug)}
                disabled={isPending}
              >
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Subscribe
              </Button>
            </>
          )}
        </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrialCard — hosted-mode House Blend Trial card
// ---------------------------------------------------------------------------

interface TrialCardProps {
  config: TrialCardConfig;
  onCancelTrial: () => void;
}

function TrialCard({ config, onCancelTrial }: TrialCardProps) {
  const { plan, trialStatus, extendUrl } = config;
  // Sub-state badge label
  const badgeLabel =
    trialStatus.status === "EXPIRED"
      ? "Expired"
      : trialStatus.cardAdded
        ? "Extended Trial"
        : "Active Trial";

  // Trial-days pool — UsageBar consumes the standard CreditPool shape with a
  // formatter override so it reads "X / Y remaining" instead of "X / Y used".
  const trialDaysPool: CreditPool = {
    limit: trialStatus.daysLimit,
    purchased: 0,
    used: trialStatus.daysLimit - trialStatus.daysRemaining,
    remaining: trialStatus.daysRemaining,
  };

  const formatTrialDays = (pool: CreditPool) =>
    `${pool.remaining} / ${pool.limit} remaining`;

  const cardAdded =
    trialStatus.status === "ACTIVE" && trialStatus.cardAdded;

  const tagline =
    "Risk-free for 14 days — full hosting, no card, no commitment.";

  return (
    <div className="flex flex-col rounded-lg border border-primary p-6 transition-shadow hover:shadow-lg">
      {/* Title + Clock badge inline */}
      <div className="flex items-start gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{tagline}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {badgeLabel}
        </Badge>
      </div>

      <div className="space-y-5">
        <UsageBar
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          label="Trial days"
          pool={trialDaysPool}
          showBreakdown={false}
          formatter={formatTrialDays}
        />

        {trialStatus.status === "EXPIRED" && trialStatus.deprovisionAt && (
          <p className="text-xs text-muted-foreground">
            Trial ended. Store will be removed on{" "}
            {new Date(trialStatus.deprovisionAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            .
          </p>
        )}

        {plan.details.benefits && plan.details.benefits.length > 0 && (
          <ul className="space-y-2 text-sm">
            {plan.details.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                {benefit}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions — No Details (Trial card has no detail page, per AC-UI-18).
          cardAdded=false: Cancel text-link + Add Billing.
          cardAdded=true:  Manage Billing only — cancellation goes through Stripe. */}
      <div className="flex items-center gap-2 mt-auto pt-5">
        {!cardAdded && plan.actionModal && (
          <>
            <button
              type="button"
              onClick={onCancelTrial}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <div className="flex-1" />
            <Button size="sm" asChild disabled={!extendUrl}>
              <a
                href={extendUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                Add Billing
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </>
        )}
        {cardAdded && (
          <>
            <div className="flex-1" />
            {/* URL interim: replace with billing portal URL from provider payload */}
            <Button size="sm" variant="outline" asChild disabled={!extendUrl}>
              <a
                href={extendUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                Manage Billing
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
