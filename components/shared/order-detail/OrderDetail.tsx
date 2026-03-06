"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { OrderItemsCard } from "./OrderItemsCard";
import { OrderInfoCard } from "./OrderInfoCard";
import { ShippingInfoCard } from "./ShippingInfoCard";
import type { OrderWithItems } from "@/lib/types";

export interface OrderDetailProps {
  order: OrderWithItems;
  variant: "storefront" | "admin";
  backLink: { href: string; label: string };
}

export function OrderDetail({ order, variant, backLink }: OrderDetailProps) {
  const { settings } = useSiteSettings();
  const displayId = order.orderNumber || order.id.slice(-8);

  return (
    <>
      {/* Print-only header with shop branding */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">{settings.storeName}</h1>
        <hr className="my-2" />
      </div>

      {/* Header with back button */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 print:hidden">
          <Link href={backLink.href} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {backLink.label}
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Order #{displayId}
          </h1>
          <p className="text-muted-foreground mt-1">
            Placed on{" "}
            {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <OrderItemsCard order={order} variant={variant} />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3">
            <OrderInfoCard order={order} variant={variant} />
          </div>
          <div className="md:col-span-2">
            <ShippingInfoCard order={order} variant={variant} />
          </div>
        </div>
      </div>
    </>
  );
}
