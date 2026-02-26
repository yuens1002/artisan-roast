import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export async function GET() {
  const { authorized, error, userId } = await requireAdminApi();
  if (!authorized || !userId) {
    return NextResponse.json({ error }, { status: 403 });
  }

  try {
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { reviewsLastViewedAt: true },
    });

    const count = await prisma.review.count({
      where: admin?.reviewsLastViewedAt
        ? { createdAt: { gt: admin.reviewsLastViewedAt } }
        : {},
    });

    return NextResponse.json({ count });
  } catch (err) {
    console.error("Failed to get unread reviews count:", err);
    return NextResponse.json(
      { error: "Failed to get unread count" },
      { status: 500 }
    );
  }
}
