"use client";

import { useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { OrderItemsCard } from "./OrderItemsCard";
import { OrderInfoCard } from "./OrderInfoCard";
import { OrderSummaryCard } from "./OrderSummaryCard";
import type { OrderWithItems } from "@/lib/types";

export interface OrderDetailProps {
  order: OrderWithItems;
  variant: "storefront" | "admin";
  backLink?: { href: string; label: string };
}

export function OrderDetail({ order, variant, backLink }: OrderDetailProps) {
  const { settings } = useSiteSettings();
  const displayId = order.orderNumber || order.id.slice(-8);

  useEffect(() => {
    document.body.setAttribute("data-print-page", "");
    return () => document.body.removeAttribute("data-print-page");
  }, []);

  return (
    <>
      {/* Print-only header with shop branding */}
      <div className="hidden mb-6" data-print-show>
        <h1 className="text-xl font-bold">{settings.storeName}</h1>
        <hr className="my-2" />
      </div>

      {/* Header */}
      <div className="mb-6">
        {backLink && (
          <Button variant="ghost" asChild className="mb-4 -ml-2" data-print-hide>
            <Link href={backLink.href} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              {backLink.label}
            </Link>
          </Button>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Order #{displayId}
            </h1>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              data-print-hide
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              <span className="sr-only">Print order</span>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5">
          Placed on{" "}
          {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
        </p>
      </div>

      <div className="space-y-6">
        {/* Two-column grid: Order Info + Order Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <OrderInfoCard order={order} variant={variant} />
          <OrderSummaryCard order={order} />
        </div>

        {/* Full-width items table */}
        <OrderItemsCard order={order} variant={variant} />
      </div>
    </>
  );
}
