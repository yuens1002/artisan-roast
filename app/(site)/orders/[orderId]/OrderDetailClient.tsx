"use client";

import { OrderDetail } from "@/components/shared/order-detail/OrderDetail";
import { PageContainer } from "@/components/shared/PageContainer";
import type { OrderWithItems } from "@/lib/types";

interface OrderDetailClientProps {
  order: OrderWithItems;
}

export default function OrderDetailClient({ order }: OrderDetailClientProps) {
  return (
    <PageContainer>
      <OrderDetail
        order={order}
        variant="storefront"
        backLink={{ href: "/orders", label: "Back to Orders" }}
      />
    </PageContainer>
  );
}
