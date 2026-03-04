import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { parsePeriodParam } from "@/lib/admin/analytics/time";
import { getUserAnalytics } from "@/lib/admin/analytics/services/get-user-analytics";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = parsePeriodParam(searchParams.get("period"));

    const data = await getUserAnalytics({ period });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Analytics API Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
