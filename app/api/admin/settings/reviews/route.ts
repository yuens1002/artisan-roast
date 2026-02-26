import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  getReviewsEnabled,
  setReviewsEnabled,
  getReviewEmailDelayDays,
  setReviewEmailDelayDays,
  getNotifyOnNewReview,
  setNotifyOnNewReview,
} from "@/lib/config/app-settings";

export async function GET() {
  try {
    await requireAdmin();
    const enabled = await getReviewsEnabled();
    const emailDelayDays = await getReviewEmailDelayDays();
    const notifyOnNewReview = await getNotifyOnNewReview();
    return NextResponse.json({ enabled, emailDelayDays, notifyOnNewReview });
  } catch (error) {
    console.error("Error fetching reviews settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    if ("enabled" in body) {
      if (typeof body.enabled !== "boolean") {
        return NextResponse.json(
          { error: "Invalid value for enabled" },
          { status: 400 }
        );
      }
      await setReviewsEnabled(body.enabled);
    }

    if ("emailDelayDays" in body) {
      const days = body.emailDelayDays;
      if (typeof days !== "number" || days < 1 || days > 90 || !Number.isInteger(days)) {
        return NextResponse.json(
          { error: "emailDelayDays must be an integer between 1 and 90" },
          { status: 400 }
        );
      }
      await setReviewEmailDelayDays(days);
    }

    if ("notifyOnNewReview" in body) {
      if (typeof body.notifyOnNewReview !== "boolean") {
        return NextResponse.json(
          { error: "Invalid value for notifyOnNewReview" },
          { status: 400 }
        );
      }
      await setNotifyOnNewReview(body.notifyOnNewReview);
    }

    const enabled = await getReviewsEnabled();
    const emailDelayDays = await getReviewEmailDelayDays();
    const notifyOnNewReview = await getNotifyOnNewReview();
    return NextResponse.json({ success: true, enabled, emailDelayDays, notifyOnNewReview });
  } catch (error) {
    console.error("Error updating reviews settings:", error);
    return NextResponse.json(
      { error: "Failed to update reviews settings" },
      { status: 500 }
    );
  }
}
