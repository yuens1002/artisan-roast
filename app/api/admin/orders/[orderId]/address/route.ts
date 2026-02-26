import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const addressSchema = z.object({
  recipientName: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
});

/**
 * PATCH /api/admin/orders/[orderId]/address
 * Admin: update shipping address for a pending order
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAdmin();

    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending orders can have their address updated" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = addressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid address data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { recipientName, street, city, state, postalCode, country } =
      parsed.data;

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        recipientName,
        shippingStreet: street,
        shippingCity: city,
        shippingState: state,
        shippingPostalCode: postalCode,
        shippingCountry: country,
      },
      include: {
        items: {
          include: {
            purchaseOption: {
              include: {
                variant: {
                  include: { product: true },
                },
              },
            },
          },
        },
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: unknown) {
    console.error("Admin order address update error:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}
