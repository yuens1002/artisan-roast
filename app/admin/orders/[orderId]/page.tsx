import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { OrderWithItems } from "@/lib/types";
import AdminOrderDetailClient from "./AdminOrderDetailClient";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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

  return <AdminOrderDetailClient order={order as unknown as OrderWithItems} />;
}
