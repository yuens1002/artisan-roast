import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/admin";
import { getCronSecret, setCronSecret } from "@/lib/config/app-settings";

export async function GET() {
  try {
    await requireAdmin();
    const cronSecret = await getCronSecret();
    return NextResponse.json({
      hasSecret: !!cronSecret,
      cronSecret,
    });
  } catch (error) {
    console.error("Error fetching cron secret:", error);
    return NextResponse.json(
      { error: "Failed to fetch cron secret" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await requireAdmin();
    const secret = randomBytes(32).toString("base64url");
    await setCronSecret(secret);
    return NextResponse.json({ cronSecret: secret });
  } catch (error) {
    console.error("Error generating cron secret:", error);
    return NextResponse.json(
      { error: "Failed to generate cron secret" },
      { status: 500 }
    );
  }
}
