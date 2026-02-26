"use client";

import Link from "next/link";
import { OrderWithItems, OrderItemWithDetails } from "@/lib/types";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { PageContainer } from "@/components/shared/PageContainer";
import { getTrackingUrl } from "@/app/(site)/_components/account/tracking-utils";

interface OrderDetailClientProps {
  order: OrderWithItems;
}

export default function OrderDetailClient({ order }: OrderDetailClientProps) {
  const { settings } = useSiteSettings();

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "OUT_FOR_DELIVERY":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "DELIVERED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "SHIPPED":
      case "PICKED_UP":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PICKED_UP":
        return "Picked Up";
      case "OUT_FOR_DELIVERY":
        return "Out for Delivery";
      case "DELIVERED":
        return "Delivered";
      case "CANCELLED":
        return "Canceled";
      default:
        return status.charAt(0) + status.slice(1).toLowerCase();
    }
  };

  // Calculate subtotal (sum of all items)
  const subtotal = order.items.reduce(
    (sum: number, item: OrderItemWithDetails) =>
      sum + item.purchaseOption.priceInCents * item.quantity,
    0
  );

  // Discount applied via promo code (0 when no promo used)
  const discount = order.discountAmountInCents ?? 0;

  // Tax from Stripe (0 for old orders)
  const tax = order.taxAmountInCents ?? 0;

  // Use stored shipping when available; fall back to derived for old orders
  const shipping = order.shippingAmountInCents > 0
    ? order.shippingAmountInCents
    : order.totalInCents + discount - subtotal - tax;

  // Strikethrough on full refund
  const isFullRefund = order.refundedAmountInCents > 0 && order.refundedAmountInCents >= order.totalInCents;

  return (
    <PageContainer>
      {/* Header with back button */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/orders" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Order #{order.id.slice(-8)}
            </h1>
            <p className="text-muted-foreground mt-1">
              Placed on{" "}
              {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <span
            className={`px-3 py-1.5 text-sm font-medium rounded-full ${getStatusColor(
              order.status
            )}`}
          >
            {getStatusLabel(order.status)}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Order Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
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
                      Quantity
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((item: OrderItemWithDetails) => (
                    <tr key={item.id} className={isFullRefund ? "line-through text-muted-foreground" : ""}>
                      <td className="py-4 px-4">
                        <Link
                          href={`/products/${item.purchaseOption.variant.product.slug}`}
                          className={isFullRefund ? "text-muted-foreground font-medium truncate block max-w-[200px] sm:max-w-none" : "text-primary hover:underline font-medium truncate block max-w-[200px] sm:max-w-none"}
                        >
                          {item.purchaseOption.variant.product.name}
                        </Link>
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.purchaseOption.variant.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.purchaseOption.type === "SUBSCRIPTION"
                            ? `Subscription${
                                item.purchaseOption.billingInterval
                                  ? ` • Every ${item.purchaseOption.intervalCount || 1} ${item.purchaseOption.billingInterval}${(item.purchaseOption.intervalCount || 1) > 1 ? "s" : ""}`
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
                            <span className="line-through text-muted-foreground">{item.quantity}</span>
                            {" "}
                            <span className="text-red-600">-{item.refundedQuantity}</span>
                          </>
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold">
                        {item.refundedQuantity > 0 ? (
                          <>
                            <span className="line-through text-muted-foreground font-normal">
                              {formatPrice(item.purchaseOption.priceInCents * item.quantity)}
                            </span>
                            <div className="text-sm">
                              {formatPrice(item.purchaseOption.priceInCents * (item.quantity - item.refundedQuantity))}
                            </div>
                          </>
                        ) : (
                          formatPrice(item.purchaseOption.priceInCents * item.quantity)
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
                <span className={`font-medium ${isFullRefund ? "line-through text-muted-foreground" : ""}`}>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>
                    Discount{order.promoCode ? ` (${order.promoCode})` : ""}
                  </span>
                  <span className="font-medium">
                    -{formatPrice(discount)}
                  </span>
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
                <span className={`font-medium ${isFullRefund ? "line-through text-muted-foreground" : ""}`}>{formatPrice(shipping)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className={`font-medium ${isFullRefund ? "line-through text-muted-foreground" : ""}`}>{formatPrice(tax)}</span>
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

        {/* Shipping Information */}
        {order.deliveryMethod === "DELIVERY" && order.shippingStreet && (
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    Shipping Address
                  </h3>
                  <address className="not-italic text-sm">
                    {order.recipientName && (
                      <>
                        {order.recipientName}
                        <br />
                      </>
                    )}
                    {order.shippingStreet}
                    <br />
                    {order.shippingCity}, {order.shippingState}{" "}
                    {order.shippingPostalCode}
                    <br />
                    {order.shippingCountry}
                  </address>
                </div>

                {/* Tracking timeline */}
                {(order.status === "SHIPPED" || order.status === "OUT_FOR_DELIVERY" || order.status === "DELIVERED") &&
                  order.trackingNumber && (() => {
                    const steps: Array<{
                      label: string;
                      detail?: string;
                      timestamp: string | null;
                      active: boolean;
                      trackingInfo?: { carrier: string; trackingNumber: string; trackingUrl: string | null };
                    }> = [
                      {
                        label: "Order Placed",
                        timestamp: order.createdAt
                          ? format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a")
                          : null,
                        active: true,
                      },
                    ];

                    if (order.shippedAt) {
                      const trackingUrl = order.carrier && order.trackingNumber
                        ? getTrackingUrl(order.carrier, order.trackingNumber)
                        : null;

                      steps.push({
                        label: `Shipped via ${order.carrier || "carrier"}`,
                        detail: order.trackingNumber ? `Tracking: ${order.trackingNumber}` : undefined,
                        timestamp: format(new Date(order.shippedAt), "MMM d, yyyy 'at' h:mm a"),
                        active: true,
                        trackingInfo: order.carrier && order.trackingNumber
                          ? { carrier: order.carrier, trackingNumber: order.trackingNumber, trackingUrl }
                          : undefined,
                      });
                    }

                    const isOfd = order.status === "OUT_FOR_DELIVERY";
                    const isDelivered = order.status === "DELIVERED";

                    steps.push({
                      label: "Out for Delivery",
                      timestamp: null,
                      active: isOfd || isDelivered,
                    });

                    if (isDelivered && order.deliveredAt) {
                      steps.push({
                        label: "Delivered",
                        timestamp: format(new Date(order.deliveredAt), "MMM d, yyyy 'at' h:mm a"),
                        active: true,
                      });
                    } else {
                      steps.push({
                        label: "Delivered",
                        timestamp: null,
                        active: false,
                      });
                    }

                    return (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                          Tracking Information
                        </h3>
                        <div className="relative pl-8">
                          {steps.map((step, i) => (
                            <div key={i} className="relative pb-8 last:pb-0">
                              {i < steps.length - 1 && (
                                <div
                                  className={`absolute left-[-20px] top-3 w-0.5 h-full ${
                                    step.active && steps[i + 1]?.active
                                      ? "bg-primary"
                                      : "bg-muted-foreground/20"
                                  }`}
                                />
                              )}
                              <div
                                className={`absolute left-[-24px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                                  step.active
                                    ? "bg-primary border-primary"
                                    : "bg-background border-muted-foreground/30"
                                }`}
                              />
                              <div>
                                <p
                                  className={`text-sm font-medium ${
                                    step.active ? "text-foreground" : "text-muted-foreground"
                                  }`}
                                >
                                  {step.label}
                                </p>
                                {step.timestamp && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {step.timestamp}
                                  </p>
                                )}
                                {step.detail && (
                                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                                    {step.detail}
                                  </p>
                                )}
                                {step.trackingInfo?.trackingUrl && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 mt-1 text-xs"
                                    asChild
                                  >
                                    <a
                                      href={step.trackingInfo.trackingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Track Package →
                                    </a>
                                  </Button>
                                )}
                                {!step.active && (
                                  <p className="text-xs text-muted-foreground mt-0.5 italic">
                                    Pending
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Store Pickup Information */}
        {order.deliveryMethod === "PICKUP" && (
          <Card>
            <CardHeader>
              <CardTitle>Pickup Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your order is ready for pickup at:
                </p>
                <address className="not-italic text-sm">
                  <strong>{settings.storeName}</strong>
                  <br />
                  123 Coffee Street
                  <br />
                  San Francisco, CA 94102
                  <br />
                  United States
                </address>
                <p className="text-sm text-muted-foreground mt-4">
                  Store hours: Monday - Friday, 8am - 6pm
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Information */}
        {order.paymentCardLast4 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <span>💳</span>
                <span>{order.paymentCardLast4}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

    </PageContainer>
  );
}
