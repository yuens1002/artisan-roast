"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { OrderWithItems } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2, Search, Filter } from "lucide-react";
import { createStatusTabsSlot } from "@/components/shared/data-table/StatusTabsSlot";
import { formatCadence, getPurchaseType } from "@/components/shared/order-utils";
import { MobileRecordCard } from "@/components/shared/MobileRecordCard";
import { formatPrice } from "@/components/shared/record-utils";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import { ProductType } from "@prisma/client";
import {
  DataTable,
  DataTableActionBar,
  DataTablePagination,
} from "@/components/shared/data-table";
import { useInfiniteScroll } from "@/components/shared/data-table/hooks";
import { transformToMobileActions } from "@/components/shared/data-table/mobile-actions";
import type { RowActionItem } from "@/components/shared/data-table/RowActionMenu";
import { resolveRowActions } from "@/components/shared/data-table/row-action-config";
import type {
  RowActionHandlers,
  RowActionSubMenuHandlers,
} from "@/components/shared/data-table/row-action-config";
import type { ActionBarConfig } from "@/components/shared/data-table/types";
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
import {
  BrewReportForm,
  CompletenessBar,
} from "@/app/(site)/_components/review/BrewReportForm";
import { useUserOrdersTable } from "./hooks/useUserOrdersTable";
import { getUserOrderRowActions } from "./constants/row-actions";

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
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(
    new Set()
  );
  const [reviewFormTarget, setReviewFormTarget] =
    useState<ReviewFormTarget | null>(null);
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
      const ordersRes = await fetch("/api/user/orders");
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

      try {
        const reviewedRes = await fetch("/api/user/reviewed-products");
        if (reviewedRes.ok) {
          const reviewedData = await reviewedRes.json();
          setReviewedProductIds(new Set(reviewedData.productIds));
        }
      } catch {
        /* silent — reviewed products are supplemental */
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // --- Declarative action menu ---

  const rowActionConfig = useMemo(
    () => getUserOrderRowActions(reviewedProductIds),
    [reviewedProductIds]
  );

  const actionHandlers = useMemo<RowActionHandlers<OrderWithItems>>(
    () => ({
      seeOrderDetail: (order) => router.push(`/orders/${order.id}`),
      shipmentStatus: (order) => setShipmentStatusOrder(order),
      editAddress: (order) => editAddress.openDialog(order),
      cancelOrder: (order) => openCancelDialog(order),
    }),
    [editAddress, router]
  );

  const subMenuHandlers = useMemo<RowActionSubMenuHandlers<OrderWithItems>>(
    () => ({
      writeReview: (_order, productId) => {
        // Find the item matching productId to get full product info
        for (const order of orders) {
          const item = order.items.find(
            (i) => i.purchaseOption.variant.product.id === productId
          );
          if (item) {
            setReviewFormTarget({
              productId: item.purchaseOption.variant.product.id,
              productName: item.purchaseOption.variant.product.name,
              productTastingNotes:
                item.purchaseOption.variant.product.tastingNotes,
              productType: item.purchaseOption.variant.product.type,
            });
            break;
          }
        }
      },
    }),
    [orders]
  );

  const getActionItems = useCallback(
    (order: OrderWithItems): RowActionItem[] =>
      resolveRowActions(order, rowActionConfig, actionHandlers, subMenuHandlers),
    [rowActionConfig, actionHandlers, subMenuHandlers]
  );

  const handleReviewSuccess = () => {
    if (reviewFormTarget) {
      setReviewedProductIds(
        (prev) => new Set([...prev, reviewFormTarget.productId])
      );
    }
    setReviewFormTarget(null);
  };

  // --- Tab filtering ---

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!statusFilter || statusFilter === "all") return true;
      if (statusFilter === "completed") {
        return (
          order.status === "SHIPPED" ||
          order.status === "OUT_FOR_DELIVERY" ||
          order.status === "DELIVERED" ||
          order.status === "PICKED_UP"
        );
      }
      return order.status === statusFilter.toUpperCase();
    });
  }, [orders, statusFilter]);

  // --- Table hook ---

  const {
    table,
    filterConfigs,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
  } = useUserOrdersTable({
    orders: filteredOrders,
    getActionItems,
    reviewedProductIds,
  });

  const allRows = table.getFilteredRowModel().rows;
  const { visibleCount, sentinelRef } = useInfiniteScroll({
    totalCount: allRows.length,
    batchSize: 10,
  });

  // --- Action bar config ---

  const actionBarConfig: ActionBarConfig = useMemo(
    () => ({
      left: [
        createStatusTabsSlot({
          tabs: [
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "completed", label: "Completed" },
            { value: "failed", label: "Unfulfilled" },
            { value: "cancelled", label: "Canceled" },
          ],
          value: activeTab,
          onChange: handleTabChange,
          naturalWidth: 400,
        }),
        {
          type: "search",
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Search orders...",
          collapse: { icon: Search },
        },
        {
          type: "filter",
          configs: filterConfigs,
          activeFilter,
          onFilterChange: setActiveFilter,
          collapse: { icon: Filter },
        },
      ],
      right: [
        {
          type: "recordCount",
          count: allRows.length,
          label: "orders",
        },
        {
          type: "custom",
          content: (
            <div className="hidden md:block">
              <DataTablePagination table={table} />
            </div>
          ),
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeTab,
      searchQuery,
      setSearchQuery,
      filterConfigs,
      activeFilter,
      setActiveFilter,
      allRows.length,
      table,
      orders,
    ]
  );

  // --- Render ---

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Order History
        </h1>
        <p className="text-muted-foreground">
          View and manage your past orders
        </p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No orders found</p>
              <Button asChild>
                <Link href="/products">Start Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <DataTableActionBar
              config={actionBarConfig}
              headerAware
            />

            {/* Desktop table (md+) */}
            <div className="hidden md:block">
              <DataTable
                table={table}
                rowHoverTitle="Double click for order details"
                onRowDoubleClick={(order) =>
                  router.push(`/orders/${order.id}`)
                }
              />
            </div>

            {/* Mobile card grid (<md) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {allRows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No orders found.
                </p>
              ) : (
                <>
                  {allRows.slice(0, visibleCount).map((row) => {
                    const order = row.original;

                    const mobileActions = transformToMobileActions(getActionItems(order));

                    return (
                      <Card key={order.id} className="py-0 gap-0">
                        <MobileRecordCard
                          type="order"
                          status={order.status}
                          date={order.createdAt}
                          displayId={`#${order.id.slice(-8)}`}
                          detailHref={`/orders/${order.id}`}
                          badge={(() => {
                            const type = getPurchaseType(order);
                            if (type === "One-time") return undefined;
                            const color = type === "Mixed"
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : "bg-purple-100 text-purple-700 border-purple-200";
                            return (
                              <Badge variant="default" className={`${color} font-normal`}>
                                {type === "Mixed" ? "Mixed" : "Sub"}
                              </Badge>
                            );
                          })()}
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
                            href: `/products/${item.purchaseOption.variant.product.slug}`,
                            imageUrl:
                              item.purchaseOption.variant.images?.[0]?.url ??
                              getPlaceholderImage(
                                item.purchaseOption.variant.product.name,
                                400,
                                item.purchaseOption.variant.product.type === ProductType.MERCH
                                  ? "culture"
                                  : "beans"
                              ),
                            cadence: formatCadence(
                              item.purchaseOption.billingInterval,
                              item.purchaseOption.billingIntervalCount
                            ),
                          }))}
                          price={`$${(order.totalInCents / 100).toFixed(2)}`}
                          priceExtra={
                            order.refundedAmountInCents > 0 ? (
                              <p className="text-sm font-semibold text-red-600">
                                -{formatPrice(order.refundedAmountInCents)}
                              </p>
                            ) : undefined
                          }
                          itemsClassName={
                            order.refundedAmountInCents >= order.totalInCents
                              ? "line-through text-muted-foreground"
                              : undefined
                          }
                          detailsSectionHeader="Total"
                          shipping={
                            order.shippingStreet
                              ? {
                                  recipientName: order.recipientName,
                                  street: order.shippingStreet,
                                  city: order.shippingCity,
                                  state: order.shippingState,
                                  postalCode: order.shippingPostalCode,
                                  country: order.shippingCountry,
                                }
                              : undefined
                          }
                          deliveryMethod={order.deliveryMethod}
                          actions={
                            mobileActions.length > 0
                              ? mobileActions
                              : undefined
                          }
                          actionsLoading={cancellingOrderId === order.id}
                        />
                      </Card>
                    );
                  })}
                  <div ref={sentinelRef as React.RefObject<HTMLDivElement>} />
                </>
              )}
            </div>
          </>
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
              className={buttonVariants({ variant: "destructive" })}
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
          editAddress.setFormErrors((prev) => ({
            ...prev,
            [field]: undefined,
          }));
        }}
        onSubmit={editAddress.handleSubmit}
      />
    </PageContainer>
  );
}
