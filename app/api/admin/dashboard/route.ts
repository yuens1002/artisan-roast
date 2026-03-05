import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { parsePeriodParam, parseCompareParam, validateCustomDateParams } from "@/lib/admin/analytics/time";
import { getDashboardAnalytics } from "@/lib/admin/analytics/services/get-dashboard-analytics";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const compare = parseCompareParam(searchParams.get("compare"));
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let data;
    if (fromParam && toParam) {
      const error = validateCustomDateParams(fromParam, toParam);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      data = await getDashboardAnalytics({ customFrom: fromParam, customTo: toParam, compare });
    } else {
      data = await getDashboardAnalytics({ period: parsePeriodParam(searchParams.get("period")), compare });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
