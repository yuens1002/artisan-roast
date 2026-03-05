import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { parsePeriodParam, parseCompareParam } from "@/lib/admin/analytics/time";
import { getDashboardAnalytics } from "@/lib/admin/analytics/services/get-dashboard-analytics";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = parsePeriodParam(searchParams.get("period"));
    const compare = parseCompareParam(searchParams.get("compare"));

    const data = await getDashboardAnalytics({ period, compare });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
