import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { parsePeriodParam, parseCompareParam } from "@/lib/admin/analytics/time";
import { getUserAnalytics } from "@/lib/admin/analytics/services/get-user-analytics";
import { buildCsvString } from "@/lib/admin/analytics/csv-export";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = parsePeriodParam(searchParams.get("period"));
    const compare = parseCompareParam(searchParams.get("compare"));

    const data = await getUserAnalytics({ period, compare });

    // CSV export
    if (searchParams.get("export") === "csv") {
      const csv = buildCsvString(
        ["Date", "Page Views", "Product Views", "Searches", "Add to Cart", "Remove from Cart", "Total"],
        data.activityByDay.map((d) => [
          d.date,
          String(d.pageView),
          String(d.productView),
          String(d.search),
          String(d.addToCart),
          String(d.removeFromCart),
          String(d.pageView + d.productView + d.search + d.addToCart + d.removeFromCart),
        ])
      );
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="user-analytics-${period}.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Analytics API Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
