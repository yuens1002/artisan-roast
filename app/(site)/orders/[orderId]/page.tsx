import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OrderWithItems } from "@/lib/types";
import OrderDetailClient from "./OrderDetailClient";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  const { orderId } = await params;

  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/orders");
  }

  // Fetch order with all related data
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          purchaseOption: {
            include: {
              variant: {
                include: {
                  images: {
                    select: { url: true, altText: true },
                    orderBy: { order: "asc" },
                    take: 1,
                  },
                  product: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Verify order belongs to user
  if (order.userId !== session.user.id) {
    redirect("/orders");
  }

  return <OrderDetailClient order={order as unknown as OrderWithItems} />;
}
