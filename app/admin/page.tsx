import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSiteMetadata } from "@/lib/site-metadata";
import { parsePeriodParam, parseCompareParam, validateCustomDateParams } from "@/lib/admin/analytics/time";
import { getDashboardAnalytics } from "@/lib/admin/analytics/services/get-dashboard-analytics";
import { isStripeConfigured } from "@/lib/services/stripe";
import { isResendConfigured } from "@/lib/services/resend";
import AdminDashboardClient from "./AdminDashboardClient";
import type { SetupStatus } from "./_components/dashboard/SetupChecklist";

export async function generateMetadata() {
  const { storeName } = await getSiteMetadata();
  return {
    title: `Admin Dashboard | ${storeName}`,
    description: "Manage users, orders, and site settings",
  };
}

interface AdminDashboardPageProps {
  searchParams: Promise<{ period?: string; compare?: string; from?: string; to?: string }>;
}

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, isAdmin: true },
  });

  if (!user?.isAdmin) {
    redirect("/");
  }

  const params = await searchParams;
  const compare = parseCompareParam(params.compare);

  const isCustom = !!(params.from && params.to && !validateCustomDateParams(params.from, params.to));
  const [data, productCount] = await Promise.all([
    isCustom
      ? getDashboardAnalytics({ customFrom: params.from!, customTo: params.to!, compare })
      : getDashboardAnalytics({ period: parsePeriodParam(params.period), compare }),
    prisma.product.count(),
  ]);

  const isDemoMode = process.env.NEXT_PUBLIC_BUILD_VARIANT === "demo" || process.env.NEXT_PUBLIC_BUILD_VARIANT === "DEMO";
  const setupStatus: SetupStatus = {
    hasProducts: isDemoMode || productCount > 0,
    hasPayments: isDemoMode || await isStripeConfigured(),
    hasEmail: isDemoMode || isResendConfigured(),
  };

  return (
    <AdminDashboardClient
      userName={user.name || user.email || "Admin"}
      data={data}
      setupStatus={setupStatus}
      isDemoMode={isDemoMode}
    />
  );
}
