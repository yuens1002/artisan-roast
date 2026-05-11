/**
 * Test-only route: clears the in-memory license/plans cache and removes
 * the license key from DB so tests start from a clean FREE state.
 *
 * Blocked on the live production deployment (VERCEL_ENV=production).
 * Available in local dev, CI e2e runners, and Vercel Preview deployments.
 */

import { NextResponse } from "next/server";
import { forceFreeTierForTest } from "@/lib/license";
import { prisma } from "@/lib/prisma";

export async function POST() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  forceFreeTierForTest();
  // Also remove the license key from DB so getLicenseKey() returns ""
  // and validateLicense() returns FREE without calling the platform API.
  try {
    await prisma.siteSettings.deleteMany({ where: { key: "license.key" } });
  } catch {
    // Non-fatal — cache is already cleared
  }
  return NextResponse.json({ ok: true });
}
