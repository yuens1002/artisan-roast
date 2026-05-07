"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Check,
  Clock,
  X,
} from "lucide-react";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { Separator } from "@/components/ui/separator";
import { useBreadcrumb } from "@/app/admin/_components/dashboard/BreadcrumbContext";
import type { Plan } from "artisan-roast-sdk/plans";
import type { LicenseInfo } from "@/lib/license-types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlanDetailClientProps {
  plan: Plan;
  license: LicenseInfo;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanDetailClient({ plan, license }: PlanDetailClientProps) {
  const breadcrumbs = useMemo(() => [{ label: plan.name }], [plan.name]);
  useBreadcrumb(breadcrumbs);

  // Plan versioning:
  // - Active plan: shows the plan version at time of purchase (snapshotAt)
  //   — updates on subscription renewal
  // - Available/lapsed plan: shows current version from platform catalog
  const isActivePlan = license.plan?.slug === plan.slug;

  const { details } = plan;
  const isFree = plan.price === 0;
  const hasSale = !isFree && plan.salePrice != null;
  const priceDisplay = isFree ? "Free" : `$${(plan.price / 100).toFixed(0)}`;
  const salePriceDisplay = hasSale ? `$${(plan.salePrice! / 100).toFixed(0)}` : null;
  const intervalLabel = isFree ? "" : plan.interval === "year" ? "/yr" : "/mo";

  const hasSlaOrQuotas =
    details.sla || (details.quotas && details.quotas.length > 0);

  // Subtitle: "Your plan since {date}" for active subscribers, description otherwise
  const planSince = isActivePlan && license.plan?.snapshotAt
    ? new Date(license.plan.snapshotAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const subtitle = planSince ? `Your plan since ${planSince}` : plan.description;

  // Sale label (e.g. "Launch Special, offer ends 04/25/2026")
  const saleLabel = (() => {
    if (!plan.saleLabel && !plan.saleEndsAt) return null;
    const parts: string[] = [];
    if (plan.saleLabel) parts.push(plan.saleLabel);
    if (plan.saleEndsAt) {
      const ends = new Date(plan.saleEndsAt).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
      parts.push(`offer ends ${ends}`);
    }
    return parts.join(", ");
  })();

  return (
    <div className="max-w-5xl space-y-8">
      <PageTitle title={plan.name} subtitle={subtitle} />

      {/* Two-column: Pricing+Benefits left, SLA+Quotas right */}
      <div className={hasSlaOrQuotas ? "grid gap-8 lg:grid-cols-[1fr_340px]" : ""}>
        {/* Left: Pricing + Benefits */}
        <div className="rounded-lg border p-6 space-y-5">
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
            {saleLabel && (
              <p className="text-xs text-muted-foreground mt-1">{saleLabel}</p>
            )}
          </div>

          {details.benefits?.activeItems && details.benefits.activeItems.length > 0 && (
            <>
              <Separator />
              <ul className="space-y-2 text-sm">
                {details.benefits.activeItems.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Right: SLA + Quotas */}
        {hasSlaOrQuotas && (
          <div className="rounded-lg border p-6 space-y-5">
              {details.sla && (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Service Level
                  </p>
                  <dl className="space-y-2.5 text-sm">
                    {details.sla.responseTime && (
                      <div className="flex justify-between">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Response time
                        </dt>
                        <dd className="font-medium">
                          {details.sla.responseTime}
                        </dd>
                      </div>
                    )}
                    {details.sla.availability && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Availability</dt>
                        <dd className="font-medium">
                          {details.sla.availability}
                        </dd>
                      </div>
                    )}
                    {details.sla.sessionDuration && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Session length</dt>
                        <dd className="font-medium">
                          {details.sla.sessionDuration}
                        </dd>
                      </div>
                    )}
                    {details.sla.sessionBooking && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Booking</dt>
                        <dd className="font-medium">
                          {details.sla.sessionBooking}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {details.sla && details.quotas && details.quotas.length > 0 && <Separator />}

              {details.quotas && details.quotas.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Monthly Quotas
                  </p>
                  <div className="space-y-2.5 text-sm">
                    {details.quotas.map((quota) => (
                      <div key={quota.slug} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {quota.label}
                        </span>
                        <span className="font-medium">
                          {quota.limit === -1 ? "Unlimited" : `${quota.limit} / month`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Scope + Excludes side by side */}
      {((details.scope && details.scope.length > 0) ||
        (details.excludes && details.excludes.length > 0)) && (
        <div className="grid gap-6 md:grid-cols-2">
          {details.scope && details.scope.length > 0 && (
            <div className="rounded-lg border p-6">
              <p className="pb-3 text-sm font-semibold">What&apos;s Covered</p>
              <ul className="space-y-2 text-sm">
                {details.scope.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {details.excludes && details.excludes.length > 0 && (
            <div className="rounded-lg border p-6">
              <p className="pb-3 text-sm font-semibold">Not Included</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {details.excludes.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Plan Terms */}
      {details.terms && details.terms.length > 0 && (
        <div className="rounded-lg border p-6 space-y-4">
          <p className="text-sm font-semibold">Plan Terms</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {details.terms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
          <Link
            href="/admin/terms/support-terms"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            View Support Service Terms &rarr;
          </Link>
        </div>
      )}

    </div>
  );
}
