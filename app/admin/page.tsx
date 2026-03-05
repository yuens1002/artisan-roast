import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSiteMetadata } from "@/lib/site-metadata";
import { parsePeriodParam, parseCompareParam, validateCustomDateParams } from "@/lib/admin/analytics/time";
import { getDashboardAnalytics } from "@/lib/admin/analytics/services/get-dashboard-analytics";
import AdminDashboardClient from "./AdminDashboardClient";

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
  const data = isCustom
    ? await getDashboardAnalytics({ customFrom: params.from!, customTo: params.to!, compare })
    : await getDashboardAnalytics({ period: parsePeriodParam(params.period), compare });

  return (
    <AdminDashboardClient
      userName={user.name || user.email || "Admin"}
      data={data}
    />
  );
}
