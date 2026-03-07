"use client";

import { useMemo } from "react";
import { OrderDetail } from "@/components/shared/order-detail/OrderDetail";
import { useBreadcrumb } from "@/app/admin/_components/dashboard/BreadcrumbContext";
import type { OrderWithItems } from "@/lib/types";

interface AdminOrderDetailClientProps {
  order: OrderWithItems;
}

export default function AdminOrderDetailClient({
  order,
}: AdminOrderDetailClientProps) {
  const displayId = order.orderNumber || order.id.slice(-8);
  const breadcrumbs = useMemo(
    () => [{ label: `Order #${displayId}` }],
    [displayId]
  );
  useBreadcrumb(breadcrumbs);

  return (
    <OrderDetail
      order={order}
      variant="admin"
      backLink={{ href: "/admin/orders", label: "Back to Orders" }}
    />
  );
}
