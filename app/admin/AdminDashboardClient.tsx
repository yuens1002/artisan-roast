"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign,
  Mail,
  Package,
  ShoppingCart,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import {
  DashboardPageTemplate,
  DashboardToolbar,
  DateRangePicker,
  KpiCard,
  KpiChipBar,
  AlertStrip,
  ChartCard,
  ChartCardLinkAction,
  RankedList,
} from "@/app/admin/_components/analytics";
import {
  RevenueTrendSection,
  OrdersStatusSection,
  ReviewsSummarySection,
  ConversionFunnelSection,
  MixRetentionSection,
  TopMoversSection,
} from "@/app/admin/_components/overview";
import { formatByType } from "@/lib/admin/analytics/formatters";
import type { DashboardResponse } from "@/lib/admin/analytics/contracts";
import { computeDelta } from "@/lib/admin/analytics/metrics-registry";

interface AdminDashboardClientProps {
  userName: string;
  data: DashboardResponse;
}

export default function AdminDashboardClient({
  userName,
  data,
}: AdminDashboardClientProps) {
  const { kpis, comparisonKpis } = data;

  const newsletterChurned = kpis.newsletterTotal - kpis.newsletterActive;

  const handleExportCsv = useCallback(() => {
    const headers = ["Metric", "Value"];
    const rows = [
      ["Revenue", formatByType(kpis.revenue, "currency")],
      ["Orders", formatByType(kpis.orders, "number")],
      ["Products", formatByType(kpis.products, "number")],
      ["Reviews", formatByType(kpis.reviews, "number")],
      ["Users", formatByType(kpis.users, "number")],
      ["New Users", formatByType(kpis.newUsers, "number")],
      ["Newsletter Total", formatByType(kpis.newsletterTotal, "number")],
      ["Newsletter Active", formatByType(kpis.newsletterActive, "number")],
    ];
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dashboard-overview.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [kpis]);

  return (
    <DashboardPageTemplate
      title="Admin Dashboard"
      subtitle={`Welcome back, ${userName}`}
    >
      {/* Period selector + Export */}
      <DashboardToolbar onExport={handleExportCsv}>
        <Suspense fallback={null}>
          <DateRangePicker mode="url" hideCompare />
        </Suspense>
      </DashboardToolbar>

      {/* Alerts */}
      <AlertStrip alerts={data.alerts} />

      {/* KPI cards — Row 1: Revenue (1.5x) + Orders + Products */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr_2fr] gap-4">
        <KpiCard
          label="Revenue"
          description="Gross sales for the period"
          value={kpis.revenue}
          format="currency"
          valueLabel="Total"
          secondaryValue={kpis.aov}
          secondaryFormat="currency"
          secondaryValueLabel="AOV"
          secondaryValueLabelTitle="Average Order Value"
          delta={
            comparisonKpis
              ? computeDelta(kpis.revenue, comparisonKpis.revenue)
              : undefined
          }
          secondaryDelta={
            comparisonKpis
              ? computeDelta(kpis.aov, comparisonKpis.aov)
              : undefined
          }
          icon={DollarSign}
          href="/admin/sales"
          linkText="View Sales"
        />
        <KpiCard
          label="Orders"
          description="Completed & pending orders"
          value={kpis.orders}
          format="number"
          delta={
            comparisonKpis
              ? computeDelta(kpis.orders, comparisonKpis.orders)
              : undefined
          }
          icon={ShoppingCart}
          href="/admin/orders"
          linkText="View Orders"
        />
        <KpiCard
          label="Products"
          description="Active catalog items"
          value={kpis.products}
          format="number"
          icon={Package}
          footerContent={
            <span>
              <Link href="/admin/products?type=COFFEE" className="hover:underline">
                {kpis.coffeeProducts} Coffee
              </Link>
              {" \u2022 "}
              <Link href="/admin/products?type=MERCH" className="hover:underline">
                {kpis.merchProducts} Merch
              </Link>
            </span>
          }
        />
      </div>

      {/* KPI cards — Row 2: Reviews, Users, Newsletter (equal thirds) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Reviews"
          description="Customer product reviews"
          value={kpis.reviews}
          format="number"
          delta={
            comparisonKpis
              ? computeDelta(kpis.reviews, comparisonKpis.reviews)
              : undefined
          }
          icon={Star}
          href="/admin/reviews"
          linkText="View Reviews"
        />
        <KpiCard
          label="Users"
          description="Registered accounts"
          value={kpis.users}
          format="number"
          valueLabel="Total"
          secondaryValue={kpis.newUsers}
          secondaryFormat="number"
          secondaryValueLabel="New"
          delta={
            comparisonKpis
              ? computeDelta(kpis.newUsers, comparisonKpis.newUsers)
              : undefined
          }
          icon={Users}
          href="/admin/users"
          linkText="View Users"
        />
        <KpiCard
          label="Newsletter"
          description="Email subscribers"
          value={kpis.newsletterTotal}
          format="number"
          delta={
            comparisonKpis
              ? computeDelta(kpis.newsletterTotal, comparisonKpis.newsletterTotal)
              : undefined
          }
          icon={Mail}
          footerContent={
            <span>
              {kpis.newsletterActive} active {"\u2022"} {newsletterChurned} churned
            </span>
          }
        />
      </div>

      {/* Supporting chips */}
      <KpiChipBar chips={data.chips} />

      {/* Row 1: Revenue trend + Orders by status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueTrendSection
            data={data.revenueByDay}
            comparisonData={data.comparisonRevenueByDay}
          />
        </div>
        <OrdersStatusSection data={data.ordersByStatus} />
      </div>

      {/* Row 2: Conversion funnel + Mix & retention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConversionFunnelSection steps={data.behaviorFunnel} />
        <MixRetentionSection
          subscriptionSplit={data.subscriptionSplit}
          customerSplit={data.customerSplit}
        />
      </div>

      {/* Row 3: Reviews (half) + Top Products (half) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReviewsSummarySection data={data.reviewsSummary} />
        <ChartCard
          title="Top Products"
          titleIcon={Trophy}
          description="Best sellers by revenue"
          action={<ChartCardLinkAction href="/admin/sales" />}
        >
          <RankedList
            items={data.topProducts}
            valueLabel="Revenue"
            limit={5}
          />
        </ChartCard>
      </div>

      {/* Row 4: Top Locations + Top Searches + Top Customers */}
      <TopMoversSection
        topLocations={data.topLocations}
        topSearches={data.topSearches}
        topCustomers={data.topCustomers}
      />
    </DashboardPageTemplate>
  );
}
