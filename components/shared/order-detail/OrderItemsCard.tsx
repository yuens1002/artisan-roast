"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Loader2, Check, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductType } from "@prisma/client";
import { formatPrice } from "@/components/shared/record-utils";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import { useAddToCartWithFeedback } from "@/hooks/useAddToCartWithFeedback";
import type { OrderWithItems, OrderItemWithDetails } from "@/lib/types";

interface OrderItemsCardProps {
  order: OrderWithItems;
  variant: "storefront" | "admin";
}

function placeholderCategory(item: OrderItemWithDetails) {
  return item.purchaseOption.variant.product.type === ProductType.MERCH
    ? "culture" as const
    : "beans" as const;
}

function BuyAgainButton({ item }: { item: OrderItemWithDetails }) {
  const { buttonState, handleAddToCart, handleActionClick } =
    useAddToCartWithFeedback();

  const po = item.purchaseOption;
  const cartItem = {
    productId: po.variant.product.id,
    productName: po.variant.product.name,
    productSlug: po.variant.product.slug,
    variantId: po.variant.id,
    variantName: po.variant.name,
    purchaseOptionId: po.id,
    purchaseType: po.type as "ONE_TIME" | "SUBSCRIPTION",
    priceInCents: po.priceInCents,
    imageUrl: po.variant.images?.[0]?.url ?? getPlaceholderImage(po.variant.product.name, 400, placeholderCategory(item)),
    billingInterval: po.billingInterval ?? undefined,
    billingIntervalCount: po.intervalCount ?? undefined,
  };

  const isAction = buttonState === "buy-now" || buttonState === "checkout-now";

  const config = {
    idle: { text: "Buy Again", Icon: ShoppingCart, className: "" },
    adding: { text: "Adding...", Icon: Loader2, className: "" },
    added: { text: "Added!", Icon: Check, className: "text-green-600 hover:text-green-700" },
    "buy-now": { text: "Buy Now", Icon: Zap, className: "text-amber-600 hover:text-amber-700 animate-pulse" },
    "checkout-now": { text: "View Cart", Icon: ShoppingCart, className: "text-amber-600 hover:text-amber-700" },
  }[buttonState];

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-6 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0 ${config.className}`}
      disabled={buttonState === "adding"}
      onClick={() =>
        isAction ? handleActionClick() : handleAddToCart(cartItem)
      }
    >
      <config.Icon
        className={`h-3 w-3 mr-1 ${buttonState === "adding" ? "animate-spin" : ""}`}
      />
      {config.text}
    </Button>
  );
}

export function OrderItemsCard({ order, variant }: OrderItemsCardProps) {
  const isFullRefund =
    order.refundedAmountInCents > 0 &&
    order.refundedAmountInCents >= order.totalInCents;

  const productHref = (item: OrderItemWithDetails) =>
    variant === "admin"
      ? `/admin/products/${item.purchaseOption.variant.product.id}`
      : `/products/${item.purchaseOption.variant.product.slug}`;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Order Items</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Product</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right pr-6">Total</TableHead>
            </TableRow>
            <tr>
              <td colSpan={4} className="p-0">
                <div className="px-6">
                  <Separator />
                </div>
              </td>
            </tr>
          </TableHeader>
          <TableBody>
            {order.items.map((item: OrderItemWithDetails) => (
              <TableRow
                key={item.id}
                className={
                  isFullRefund
                    ? "line-through text-muted-foreground hover:bg-transparent border-b-0"
                    : "hover:bg-transparent border-b-0"
                }
              >
                <TableCell className="pl-6 py-4 whitespace-normal">
                  <div className="flex items-center gap-3">
                    <Image
                      src={
                        item.purchaseOption.variant.images?.[0]?.url ??
                        getPlaceholderImage(item.purchaseOption.variant.product.name, 400, placeholderCategory(item))
                      }
                      alt={
                        item.purchaseOption.variant.images?.[0]?.altText ??
                        item.purchaseOption.variant.product.name
                      }
                      width={56}
                      height={56}
                      className="rounded-md object-cover shrink-0 size-14"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={productHref(item)}
                          className={
                            isFullRefund
                              ? "text-muted-foreground font-medium truncate block max-w-50 sm:max-w-none"
                              : "text-primary hover:underline font-medium truncate block max-w-50 sm:max-w-none"
                          }
                        >
                          {item.purchaseOption.variant.product.name}
                        </Link>
                        {variant === "storefront" && !isFullRefund && (
                          <BuyAgainButton item={item} />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {item.purchaseOption.variant.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.purchaseOption.type === "SUBSCRIPTION"
                          ? `Subscription${
                              item.purchaseOption.billingInterval
                                ? ` \u00b7 Every ${item.purchaseOption.intervalCount || 1} ${item.purchaseOption.billingInterval?.toLowerCase()}${(item.purchaseOption.intervalCount || 1) > 1 ? "s" : ""}`
                                : ""
                            }`
                          : "One-time purchase"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right py-4">
                  {formatPrice(item.purchaseOption.priceInCents)}
                </TableCell>
                <TableCell className="text-center py-4">
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
                </TableCell>
                <TableCell className="text-right pr-6 py-4 font-semibold">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
