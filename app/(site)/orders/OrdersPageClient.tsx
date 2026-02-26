"use client";

import { useEffect, useState, useCallback } from "react";
import { OrderWithItems } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, PenLine } from "lucide-react";
import { MobileRecordCard } from "@/components/shared/MobileRecordCard";
import { formatPrice } from "@/components/shared/record-utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RecordActionMenu } from "@/components/shared/RecordActionMenu";
import { ShippingAddressDisplay } from "@/components/shared/ShippingAddressDisplay";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DialogShell } from "@/app/admin/_components/dialogs/DialogShell";
import { useToast } from "@/hooks/use-toast";
import { useEditAddress } from "@/app/(site)/_hooks/useEditAddress";
import { EditAddressDialog } from "@/app/(site)/_components/account/EditAddressDialog";
import { ShipmentStatusDialog } from "@/app/(site)/_components/account/ShipmentStatusDialog";
import { PageContainer } from "@/components/shared/PageContainer";
import { BrewReportForm, CompletenessBar } from "@/app/(site)/_components/review/BrewReportForm";

interface OrdersPageClientProps {
  statusFilter?: string;
}

interface ReviewFormTarget {
  productId: string;
  productName: string;
  productTastingNotes: string[];
  productType: string;
}

export default function OrdersPageClient({
  statusFilter,
}: OrdersPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null
  );
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelOrder, setCancelOrder] = useState<OrderWithItems | null>(null);
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());
  const [reviewFormTarget, setReviewFormTarget] = useState<ReviewFormTarget | null>(null);
  const [reviewScore, setReviewScore] = useState(0);
  const [shipmentStatusOrder, setShipmentStatusOrder] =
    useState<OrderWithItems | null>(null);
  const editAddress = useEditAddress({
    getEndpointUrl: (id) => `/api/user/orders/${id}/address`,
    successMessage: "Shipping address updated.",
    onSuccess: (id, form) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                recipientName: form.recipientName,
                shippingStreet: form.street,
                shippingCity: form.city,
                shippingState: form.state,
                shippingPostalCode: form.postalCode,
                shippingCountry: form.country,
              }
            : o
        )
      );
    },
  });
  const activeTab = statusFilter || "all";

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = statusFilter
        ? `/api/user/orders?status=${statusFilter}`
        : "/api/user/orders";
      const ordersRes = await fetch(url);
      if (!ordersRes.ok) {
        if (ordersRes.status === 401) {
          setOrders([]);
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to fetch orders");
      }
      const data = await ordersRes.json();
      setOrders(data.orders);

      // Fetch reviewed products separately (non-blocking)
      try {
        const reviewedRes = await fetch("/api/user/reviewed-products");
        if (reviewedRes.ok) {
          const reviewedData = await reviewedRes.json();
          setReviewedProductIds(new Set(reviewedData.productIds));
        }
      } catch { /* silent — reviewed products are supplemental */ }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleTabChange = (value: string) => {
    if (value === "all") {
      router.push("/orders");
    } else {
      router.push(`/orders?status=${value}`);
    }
  };

  // --- Cancel Order ---

  const openCancelDialog = (order: OrderWithItems) => {
    setCancelOrder(order);
    setCancelDialogOpen(true);
  };

  const handleCancelOrder = async () => {
    if (!cancelOrder) return;
    const orderId = cancelOrder.id;
    setCancellingOrderId(orderId);
    try {
      const response = await fetch(`/api/user/orders/${orderId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel order");
      }

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: "CANCELLED" } : order
        )
      );
      setCancelDialogOpen(false);
      setCancelOrder(null);
      toast({
        title: "Order Canceled",
        description: `Order #${orderId.slice(-8)} has been canceled and refunded.`,
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  // --- Helpers ---

  const canEditAddress = (order: OrderWithItems) =>
    order.status === "PENDING" && order.deliveryMethod === "DELIVERY";

  const canCancelOrder = (order: OrderWithItems) =>
    order.status === "PENDING";

  const isCompletedOrder = (status: string) =>
    status === "SHIPPED" || status === "PICKED_UP";

  const canTrackOrViewStatus = (order: OrderWithItems) =>
    order.status === "SHIPPED" || order.status === "OUT_FOR_DELIVERY" || order.status === "DELIVERED";

  const hasActions = (order: OrderWithItems) =>
    canEditAddress(order) || canCancelOrder(order) || canTrackOrViewStatus(order);

  const hasReviewActions = (order: OrderWithItems) =>
    isCompletedOrder(order.status) &&
    order.items.some((item) => !reviewedProductIds.has(item.purchaseOption.variant.product.id));

  const getReviewSubMenu = (order: OrderWithItems) => {
    if (!hasReviewActions(order)) return [];
    const subItems = order.items
      .filter((item) => !reviewedProductIds.has(item.purchaseOption.variant.product.id))
      .map((item) => ({
        label: item.purchaseOption.variant.product.name,
        onClick: () =>
          setReviewFormTarget({
            productId: item.purchaseOption.variant.product.id,
            productName: item.purchaseOption.variant.product.name,
            productTastingNotes: item.purchaseOption.variant.product.tastingNotes,
            productType: item.purchaseOption.variant.product.type,
          }),
      }));
    if (subItems.length === 0) return [];
    return [{
      label: "Write a Review",
      icon: <PenLine className="h-4 w-4 mr-2" />,
      subItems,
    }];
  };

  const handleReviewSuccess = () => {
    if (reviewFormTarget) {
      setReviewedProductIds((prev) => new Set([...prev, reviewFormTarget.productId]));
    }
    setReviewFormTarget(null);
  };

  const getOrderCount = (status?: string) => {
    if (!status || status === "all") return orders.length;
    if (status === "completed") {
      return orders.filter(
        (o) => o.status === "SHIPPED" || o.status === "OUT_FOR_DELIVERY" || o.status === "DELIVERED" || o.status === "PICKED_UP"
      ).length;
    }
    return orders.filter((o) => o.status === status.toUpperCase()).length;
  };

  const filteredOrders = orders.filter((order) => {
    if (!statusFilter || statusFilter === "all") return true;
    if (statusFilter === "completed") {
      return order.status === "SHIPPED" || order.status === "OUT_FOR_DELIVERY" || order.status === "DELIVERED" || order.status === "PICKED_UP";
    }
    return order.status === statusFilter.toUpperCase();
  });

  // --- Render ---

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Order History
        </h1>
        <p className="text-muted-foreground">View and manage your past orders</p>
      </div>

      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="all">All Orders ({getOrderCount("all")})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({getOrderCount("pending")})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({getOrderCount("completed")})</TabsTrigger>
            <TabsTrigger value="failed">Unfulfilled ({getOrderCount("failed")})</TabsTrigger>
            <TabsTrigger value="cancelled">Canceled ({getOrderCount("cancelled")})</TabsTrigger>
          </TabsList>
        </Tabs>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No orders found</p>
            <Button asChild>
              <Link href="/products">Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          {/* Mobile/Tablet Card Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:hidden">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="py-0 gap-0">
                <MobileRecordCard
                  type="order"
                  status={order.status}
                  date={order.createdAt}
                  displayId={`#${order.id.slice(-8)}`}
                  detailHref={`/orders/${order.id}`}
                  items={order.items.map((item) => ({
                    id: item.id,
                    name: item.purchaseOption.variant.product.name,
                    variant: item.purchaseOption.variant.name,
                    purchaseType:
                      item.purchaseOption.type === "SUBSCRIPTION"
                        ? "Subscription"
                        : "One-time",
                    quantity: item.quantity,
                    refundedQuantity: item.refundedQuantity,
                  }))}
                  price={`$${(order.totalInCents / 100).toFixed(2)}`}
                  priceExtra={order.refundedAmountInCents > 0 ? (
                    <p className="text-sm font-semibold text-red-600">-{formatPrice(order.refundedAmountInCents)}</p>
                  ) : undefined}
                  itemsClassName={order.refundedAmountInCents >= order.totalInCents ? "line-through text-muted-foreground" : undefined}
                  detailsSectionHeader="Total"
                  shipping={
                    order.shippingStreet
                      ? {
                          recipientName: order.recipientName,
                          street: order.shippingStreet,
                          city: order.shippingCity,
                          state: order.shippingState,
                          postalCode: order.shippingPostalCode,
                        }
                      : undefined
                  }
                  deliveryMethod={order.deliveryMethod}
                  actions={
                    hasActions(order) || hasReviewActions(order)
                      ? [
                          ...(canTrackOrViewStatus(order)
                            ? [
                                {
                                  label: "Shipment Status",
                                  onClick: () => setShipmentStatusOrder(order),
                                },
                              ]
                            : []),
                          ...(canEditAddress(order)
                            ? [
                                {
                                  label: "Edit Address",
                                  onClick: () => editAddress.openDialog(order),
                                },
                              ]
                            : []),
                          ...(canCancelOrder(order)
                            ? [
                                {
                                  label: "Cancel Order",
                                  onClick: () => openCancelDialog(order),
                                  variant: "destructive" as const,
                                },
                              ]
                            : []),
                          ...getReviewSubMenu(order),
                        ]
                      : undefined
                  }
                  actionsLoading={cancellingOrderId === order.id}
                />
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden xl:block border rounded-md">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Order</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Item(s)</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Ship To</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Total</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30">
                      <td className="py-4 px-4">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/orders/${order.id}`}>
                            #{order.id.slice(-8)}
                          </Link>
                        </Button>
                      </td>
                      <td className="py-4 px-4 text-sm text-foreground">
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="py-4 px-4">
                        <div className={`space-y-2 ${order.refundedAmountInCents >= order.totalInCents ? "line-through text-muted-foreground" : ""}`}>
                          {order.items.map((item, idx) => {
                            const product = item.purchaseOption.variant.product;
                            const canReview = isCompletedOrder(order.status);
                            const isReviewed = reviewedProductIds.has(product.id);
                            return (
                              <div key={item.id}>
                                <div className="flex items-center gap-2 text-sm">
                                  <Link
                                    href={`/products/${product.slug}`}
                                    className="text-text-base hover:text-primary"
                                  >
                                    {product.name}
                                  </Link>
                                  {canReview && isReviewed && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground flex-shrink-0">
                                      <CheckCircle className="h-3 w-3" />
                                      Reported
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {[
                                    item.purchaseOption.variant.name,
                                    item.purchaseOption.type === "SUBSCRIPTION" ? "Subscription" : "One-time",
                                    `Qty: ${item.quantity}`,
                                  ].filter(Boolean).join(" · ")}
                                </div>
                                {idx < order.items.length - 1 && (
                                  <div className="border-t border-border mt-2" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <ShippingAddressDisplay
                          recipientName={order.recipientName}
                          phone={order.customerPhone}
                          street={order.deliveryMethod === "DELIVERY" ? order.shippingStreet : null}
                          city={order.shippingCity}
                          state={order.shippingState}
                          postalCode={order.shippingPostalCode}
                          mutedClassName="text-muted-foreground"
                          muteAddressLines
                        />
                      </td>
                      <td className="py-4 px-4 text-right">
                        {order.refundedAmountInCents > 0 ? (
                          <>
                            <span className="font-semibold line-through text-muted-foreground">{formatPrice(order.totalInCents)}</span>
                            <div className="text-sm font-semibold text-red-600">-{formatPrice(order.refundedAmountInCents)}</div>
                          </>
                        ) : (
                          <span className="font-semibold">{formatPrice(order.totalInCents)}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-4 px-4 text-center">
                        {(hasActions(order) || hasReviewActions(order)) && (
                          <RecordActionMenu
                            actions={[
                              ...(canTrackOrViewStatus(order)
                                ? [{ label: "Shipment Status", onClick: () => setShipmentStatusOrder(order) }]
                                : []),
                              ...(canEditAddress(order)
                                ? [{ label: "Edit Address", onClick: () => editAddress.openDialog(order) }]
                                : []),
                              ...(canCancelOrder(order)
                                ? [{ label: "Cancel Order", onClick: () => openCancelDialog(order), variant: "destructive" as const }]
                                : []),
                              ...getReviewSubMenu(order),
                            ]}
                            loading={cancellingOrderId === order.id}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Cancel Order Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancel Order #{cancelOrder?.id.slice(-8)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately cancel your order and process a full refund
              to your original payment method. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Order & Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Brew Report Dialog */}
      <DialogShell
        open={reviewFormTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReviewFormTarget(null);
            setReviewScore(0);
          }
        }}
        title="Write a Review"
        description={reviewFormTarget?.productName}
        headerExtra={<CompletenessBar score={reviewScore} />}
        size="sm"
      >
        {reviewFormTarget && (
          <BrewReportForm
            productId={reviewFormTarget.productId}
            productName={reviewFormTarget.productName}
            productTastingNotes={reviewFormTarget.productTastingNotes}
            isCoffee={reviewFormTarget.productType === "COFFEE"}
            onSuccess={handleReviewSuccess}
            onScoreChange={setReviewScore}
            stickySubmit
          />
        )}
      </DialogShell>

      {/* Shipment Status Dialog */}
      {shipmentStatusOrder && (
        <ShipmentStatusDialog
          order={shipmentStatusOrder}
          open={!!shipmentStatusOrder}
          onOpenChange={(open) => {
            if (!open) setShipmentStatusOrder(null);
          }}
        />
      )}

      {/* Edit Address Dialog */}
      <EditAddressDialog
        open={editAddress.dialogOpen}
        onOpenChange={editAddress.setDialogOpen}
        title="Edit Shipping Information"
        description="Choose from address book or edit ship to information below."
        savedAddresses={editAddress.savedAddresses}
        addressForm={editAddress.addressForm}
        formLoading={editAddress.formLoading}
        formErrors={editAddress.formErrors}
        onAddressSelect={editAddress.handleSelect}
        onFieldChange={(field, value) => {
          editAddress.setAddressForm((prev) => ({ ...prev, [field]: value }));
          editAddress.setFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }}
        onSubmit={editAddress.handleSubmit}
      />
    </PageContainer>
  );
}
