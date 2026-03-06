"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/shared/record-utils";
import type { OrderWithItems, OrderItemWithDetails } from "@/lib/types";

interface OrderItemsCardProps {
  order: OrderWithItems;
  variant: "storefront" | "admin";
}

export function OrderItemsCard({ order, variant }: OrderItemsCardProps) {
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Order Items</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="print:hidden"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Print</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Product
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Price
                </th>
                <th className="text-center py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Qty
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((item: OrderItemWithDetails) => (
                <tr
                  key={item.id}
                  className={
                    isFullRefund ? "line-through text-muted-foreground" : ""
                  }
                >
                  <td className="py-4 px-4">
                    {variant === "storefront" ? (
                      <Link
                        href={`/products/${item.purchaseOption.variant.product.slug}`}
                        className={
                          isFullRefund
                            ? "text-muted-foreground font-medium truncate block max-w-[200px] sm:max-w-none"
                            : "text-primary hover:underline font-medium truncate block max-w-[200px] sm:max-w-none"
                        }
                      >
                        {item.purchaseOption.variant.product.name}
                      </Link>
                    ) : (
                      <span className="font-medium truncate block max-w-[200px] sm:max-w-none">
                        {item.purchaseOption.variant.product.name}
                      </span>
                    )}
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.purchaseOption.variant.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.purchaseOption.type === "SUBSCRIPTION"
                        ? `Subscription${
                            item.purchaseOption.billingInterval
                              ? ` \u00b7 Every ${item.purchaseOption.intervalCount || 1} ${item.purchaseOption.billingInterval}${(item.purchaseOption.intervalCount || 1) > 1 ? "s" : ""}`
                              : ""
                          }`
                        : "One-time purchase"}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {formatPrice(item.purchaseOption.priceInCents)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {item.refundedQuantity > 0 ? (
                      <>
                        <span className="line-through text-muted-foreground">
                          {item.quantity}
                        </span>{" "}
                        <span className="text-red-600">
                          -{item.refundedQuantity}
                        </span>
                      </>
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td className="py-4 px-4 text-right font-semibold">
                    {item.refundedQuantity > 0 ? (
                      <>
                        <span className="line-through text-muted-foreground font-normal">
                          {formatPrice(
                            item.purchaseOption.priceInCents * item.quantity
                          )}
                        </span>
                        <div className="text-sm">
                          {formatPrice(
                            item.purchaseOption.priceInCents *
                              (item.quantity - item.refundedQuantity)
                          )}
                        </div>
                      </>
                    ) : (
                      formatPrice(
                        item.purchaseOption.priceInCents * item.quantity
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 pt-6 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
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
            <span className="text-muted-foreground">
              Shipping (
              {order.deliveryMethod === "DELIVERY"
                ? "Standard"
                : "Store Pickup"}
              )
            </span>
            <span
              className={`font-medium ${isFullRefund ? "line-through text-muted-foreground" : ""}`}
            >
              {formatPrice(shipping)}
            </span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
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
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span>{formatPrice(order.totalInCents)} USD</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
