import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getInstanceId,
  sendHeartbeatEvent,
  isTelemetryEnabled,
} from "@/lib/telemetry";

export const dynamic = "force-dynamic";

/**
 * Heartbeat cron endpoint — PLATFORM-LEVEL
 * Called periodically (e.g., daily via Vercel cron) to send anonymous usage stats.
 * This is a platform concern, not per-store — uses only the env var CRON_SECRET
 * (not the admin-managed DB secret).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const telemetryEnabled = await isTelemetryEnabled(prisma);
  if (!telemetryEnabled) {
    return NextResponse.json({
      success: true,
      message: "Telemetry disabled",
      sent: false,
    });
  }

  try {
    const instanceId = await getInstanceId(prisma);

    if (!instanceId) {
      return NextResponse.json({
        success: false,
        error: "Instance ID not found",
      });
    }

    // Gather anonymous stats
    const [productCount, userCount, orderCount] = await Promise.all([
      prisma.product.count(),
      prisma.user.count(),
      prisma.order.count(),
    ]);

    const sent = await sendHeartbeatEvent(
      instanceId,
      {
        productCount,
        userCount,
        orderCount,
      },
      prisma
    );

    return NextResponse.json({
      success: true,
      sent,
      stats: { productCount, userCount, orderCount },
    });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
