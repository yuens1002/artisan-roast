import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export async function POST() {
  const { authorized, error, userId } = await requireAdminApi();
  if (!authorized || !userId) {
    return NextResponse.json({ error }, { status: 403 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { reviewsLastViewedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to mark reviews as read:", err);
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
