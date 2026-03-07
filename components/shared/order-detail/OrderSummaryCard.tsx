"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/components/shared/record-utils";
import type { OrderWithItems, OrderItemWithDetails } from "@/lib/types";

interface OrderSummaryCardProps {
  order: OrderWithItems;
}

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const subtotal = order.items.reduce(
    (sum: number, item: OrderItemWithDetails) =>
      sum + item.purchaseOption.priceInCents * item.quantity,
    0
  );

  const discount = order.discountAmountInCents ?? 0;
  const tax = order.taxAmountInCents ?? 0;
  const shipping =
    order.shippingAmountInCents > 0
      ? order.shippingAmountInCents
      : order.totalInCents + discount - subtotal - tax;

  const isFullRefund =
    order.refundedAmountInCents > 0 &&
    order.refundedAmountInCents >= order.totalInCents;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span
            className={`font-medium ${isFullRefund ? "line-through text-muted-foreground" : ""}`}
          >
            {formatPrice(subtotal)}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
            <span>
              Discount{order.promoCode ? ` (${order.promoCode})` : ""}
            </span>
            <span className="font-medium">-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span>
            Shipping (
            {order.deliveryMethod === "DELIVERY" ? "Standard" : "Store Pickup"})
          </span>
          <span
            className={`font-medium ${isFullRefund ? "line-through text-muted-foreground" : ""}`}
          >
            {formatPrice(shipping)}
          </span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span
              className={`font-medium ${isFullRefund ? "line-through text-muted-foreground" : ""}`}
            >
              {formatPrice(tax)}
            </span>
          </div>
        )}
        {order.refundedAmountInCents > 0 && (
          <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
            <span>
              Refunded
              {order.refundedAmountInCents >= order.totalInCents
                ? " (Full)"
                : " (Partial)"}
            </span>
            <span className="font-medium">
              -{formatPrice(order.refundedAmountInCents)}
            </span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between text-base font-bold pt-1">
          <span>Total</span>
          <span>{formatPrice(order.totalInCents)} USD</span>
        </div>
      </CardContent>
    </Card>
  );
}
