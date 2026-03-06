"use client";

import { OrderDetail } from "@/components/shared/order-detail/OrderDetail";
import type { OrderWithItems } from "@/lib/types";

interface AdminOrderDetailClientProps {
  order: OrderWithItems;
}

export default function AdminOrderDetailClient({
  order,
}: AdminOrderDetailClientProps) {
  return (
    <OrderDetail
      order={order}
      variant="admin"
      backLink={{ href: "/admin/orders", label: "Back to Orders" }}
    />
  );
}
