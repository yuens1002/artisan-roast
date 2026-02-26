"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Truck,
  MapPin,
  HandCoins,
  PackageCheck,
  ExternalLink,
  CircleX,
  ReceiptText,
  RefreshCcw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MobileRecordCard } from "@/components/shared/MobileRecordCard";
import { formatPrice } from "@/components/shared/record-utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RecordActionMenu } from "@/components/shared/RecordActionMenu";
import { RecordItemsList } from "@/components/shared/RecordItemsList";
import { ShippingAddressDisplay } from "@/components/shared/ShippingAddressDisplay";
import { EditAddressDialog } from "@/app/(site)/_components/account/EditAddressDialog";
import { useEditAddress } from "@/app/(site)/_hooks/useEditAddress";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalInCents: number;
  deliveryMethod: string;
  customerEmail: string;
  customerPhone: string | null;
  recipientName: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  stripeSubscriptionId: string | null;
  taxAmountInCents: number;
  shippingAmountInCents: number;
  refundedAmountInCents: number;
  refundedAt: string | null;
  refundReason: string | null;
  createdAt: string;
  trackingNumber: string | null;
  carrier: string | null;
  user: {
    name: string | null;
    email: string;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    priceInCents: number;
    refundedQuantity: number;
    purchaseOption: {
      priceInCents: number;
      variant: {
        name: string;
        product: {
          name: string;
        };
      };
    };
  }>;
};

export default function OrderManagementClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [failDialogOpen, setFailDialogOpen] = useState(false);
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [refundReasonSelect, setRefundReasonSelect] = useState("");
  const [refundReasonCustom, setRefundReasonCustom] = useState("");
  const [refundItems, setRefundItems] = useState<Record<number, number>>({});
  const [fullRefund, setFullRefund] = useState(false);
  const [viewRefundMode, setViewRefundMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders);
      setFilteredOrders(data.orders);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const editAddress = useEditAddress({
    getEndpointUrl: (orderId) => `/api/admin/orders/${orderId}/address`,
    successMessage: "Shipping address updated successfully",
    onSuccess: () => fetchOrders(),
  });

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredOrders(orders);
    } else if (statusFilter === "completed") {
      setFilteredOrders(
        orders.filter((o) => o.status === "SHIPPED" || o.status === "OUT_FOR_DELIVERY" || o.status === "DELIVERED" || o.status === "PICKED_UP")
      );
    } else {
      setFilteredOrders(orders.filter((o) => o.status === statusFilter));
    }
  }, [statusFilter, orders]);

  async function handleMarkAsShipped() {
    if (!selectedOrder || !trackingNumber || !carrier) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/ship`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber, carrier }),
      });

      if (!res.ok) throw new Error("Failed to mark as shipped");

      toast({
        title: "Order Shipped",
        description: `Order #${selectedOrder.orderNumber || selectedOrder.id.slice(-8)} marked as shipped`,
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });

      setShipDialogOpen(false);
      setTrackingNumber("");
      setCarrier("");
      setSelectedOrder(null);
      fetchOrders();
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark order as shipped",
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleMarkAsPickedUp(order: Order) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/pickup`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("Failed to mark as picked up");

      toast({
        title: "Order Picked Up",
        description: `Order #${order.orderNumber || order.id.slice(-8)} marked as picked up`,
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });

      fetchOrders();
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark order as picked up",
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });
    } finally {
      setProcessing(false);
    }
  }

  function openShipDialog(order: Order) {
    setSelectedOrder(order);
    setTrackingNumber(order.trackingNumber || "");
    setCarrier(order.carrier || "");
    setShipDialogOpen(true);
  }

  function openFailDialog(order: Order) {
    setSelectedOrder(order);
    setFailureReason("");
    setFailDialogOpen(true);
  }

  function openRefundDialog(order: Order) {
    setSelectedOrder(order);
    setRefundAmountInput("");
    setRefundReasonSelect("");
    setRefundReasonCustom("");
    setRefundItems({});
    setFullRefund(false);
    setViewRefundMode(false);
    setRefundDialogOpen(true);
  }

  function openViewRefundDialog(order: Order) {
    setSelectedOrder(order);
    setViewRefundMode(true);
    setRefundDialogOpen(true);
  }

  function toggleFullRefund(checked: boolean) {
    if (!selectedOrder) return;
    setFullRefund(checked);
    if (checked) {
      // Cross off all items at full qty
      const all: Record<number, number> = {};
      selectedOrder.items.forEach((item, idx) => {
        all[idx] = item.quantity;
      });
      setRefundItems(all);
      const remaining = selectedOrder.totalInCents - selectedOrder.refundedAmountInCents;
      setRefundAmountInput((remaining / 100).toFixed(2));
    } else {
      setRefundItems({});
      setRefundAmountInput("");
    }
  }

  function toggleRefundItem(index: number, crossedOff: boolean) {
    if (!selectedOrder) return;
    const next = { ...refundItems };
    if (crossedOff) {
      next[index] = selectedOrder.items[index].quantity;
    } else {
      delete next[index];
    }
    setRefundItems(next);
    recalcRefundAmount(next);
  }

  function updateRefundItemQty(index: number, qty: number) {
    if (!selectedOrder) return;
    const maxQty = selectedOrder.items[index].quantity;
    const clamped = Math.max(0, Math.min(qty, maxQty));
    const next = { ...refundItems };
    if (clamped === 0) {
      delete next[index];
    } else {
      next[index] = clamped;
    }
    setRefundItems(next);
    recalcRefundAmount(next);
  }

  function recalcRefundAmount(items: Record<number, number>) {
    if (!selectedOrder) return;
    const itemRefundCents = Object.entries(items).reduce((sum, [idx, qty]) => {
      const item = selectedOrder.items[Number(idx)];
      return sum + item.purchaseOption.priceInCents * qty;
    }, 0);
    const subtotal = selectedOrder.items.reduce(
      (sum, item) => sum + item.purchaseOption.priceInCents * item.quantity, 0
    );
    const taxRefund = subtotal > 0
      ? Math.round((itemRefundCents / subtotal) * (selectedOrder.taxAmountInCents ?? 0))
      : 0;
    const remaining = selectedOrder.totalInCents - selectedOrder.refundedAmountInCents;
    const capped = Math.min(itemRefundCents + taxRefund, remaining);
    setRefundAmountInput((capped / 100).toFixed(2));
  }

  function getRefundReason(): string {
    if (refundReasonSelect === "Other") return refundReasonCustom.trim();
    return refundReasonSelect;
  }

  async function handleRefund() {
    const reason = getRefundReason();
    if (!selectedOrder || !reason || !refundAmountInput) return;

    const amountInCents = Math.round(parseFloat(refundAmountInput) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) return;

    setProcessing(true);
    try {
      // Build per-item refund data
      const itemsPayload = Object.entries(refundItems).map(([idx, qty]) => ({
        orderItemId: selectedOrder.items[Number(idx)].id,
        quantity: qty,
      }));

      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInCents,
          reason,
          ...(itemsPayload.length > 0 && { items: itemsPayload }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process refund");

      toast({
        title: "Refund Processed",
        description: `$${(amountInCents / 100).toFixed(2)} refunded for order #${selectedOrder.orderNumber || selectedOrder.id.slice(-8)}`,
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });

      setRefundDialogOpen(false);
      setRefundAmountInput("");
      setRefundReasonSelect("");
      setRefundReasonCustom("");
      setFullRefund(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      toast({
        title: "Refund Failed",
        description: error instanceof Error ? error.message : "Failed to process refund",
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleMarkAsFailed() {
    if (!selectedOrder || !failureReason.trim()) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/fail`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: failureReason.trim() }),
      });

      if (!res.ok) throw new Error("Failed to mark as failed");

      toast({
        title: "Order Unfulfilled",
        description: `Order #${selectedOrder.orderNumber || selectedOrder.id.slice(-8)} marked as unfulfilled`,
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });

      setFailDialogOpen(false);
      setFailureReason("");
      setSelectedOrder(null);
      fetchOrders();
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark order as failed",
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleMarkAsDelivered() {
    if (!selectedOrder) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/deliver`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("Failed to mark as delivered");

      toast({
        title: "Order Delivered",
        description: `Order #${selectedOrder.orderNumber || selectedOrder.id.slice(-8)} marked as delivered`,
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });

      setDeliverDialogOpen(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark order as delivered",
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });
    } finally {
      setProcessing(false);
    }
  }

  function getTrackingUrl(carrier: string, trackingNumber: string): string {
    const carriers: Record<string, string> = {
      USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      UPS: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      FedEx: `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`,
      DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
    };

    return (
      carriers[carrier] ||
      `https://www.google.com/search?q=${encodeURIComponent(carrier + " " + trackingNumber)}`
    );
  }

  function getOrderActions(order: Order) {
    const actions: import("@/components/shared/MobileRecordCard").RecordAction[] = [];

    if (order.status === "PENDING") {
      if (order.deliveryMethod === "DELIVERY") {
        actions.push({
          label: "Ship",
          icon: <Truck className="h-4 w-4" />,
          onClick: () => openShipDialog(order),
        });
        actions.push({
          label: "Edit Shipping",
          icon: <MapPin className="h-4 w-4" />,
          onClick: () => editAddress.openDialog({
            id: order.id,
            recipientName: order.recipientName,
            shippingStreet: order.shippingStreet,
            shippingCity: order.shippingCity,
            shippingState: order.shippingState,
            shippingPostalCode: order.shippingPostalCode,
            shippingCountry: order.shippingCountry,
          }),
        });
      } else {
        actions.push({
          label: "Pickup Ready",
          icon: <HandCoins className="h-4 w-4" />,
          onClick: () => { setSelectedOrder(order); setPickupDialogOpen(true); },
        });
      }
      actions.push({
        label: "Unfulfill",
        icon: <CircleX className="h-4 w-4" />,
        onClick: () => openFailDialog(order),
      });
    } else if (order.status === "SHIPPED" || order.status === "OUT_FOR_DELIVERY") {
      actions.push({
        label: "Mark as Delivered",
        icon: <PackageCheck className="h-4 w-4" />,
        onClick: () => { setSelectedOrder(order); setDeliverDialogOpen(true); },
      });
      if (order.trackingNumber) {
        actions.push({
          label: "Track Package",
          icon: <ExternalLink className="h-4 w-4" />,
          onClick: () => window.open(getTrackingUrl(order.carrier!, order.trackingNumber!), "_blank"),
        });
      }
    } else if (order.status === "DELIVERED" && order.trackingNumber) {
      actions.push({
        label: "Track Package",
        icon: <ExternalLink className="h-4 w-4" />,
        onClick: () => window.open(getTrackingUrl(order.carrier!, order.trackingNumber!), "_blank"),
      });
    }

    // Refund actions for non-cancelled/failed orders
    if (order.status !== "CANCELLED" && order.status !== "FAILED") {
      if (order.refundedAmountInCents < order.totalInCents) {
        actions.push({
          label: order.refundedAmountInCents > 0 ? "Refund More" : "Refund",
          icon: <RefreshCcw className="h-4 w-4" />,
          onClick: () => openRefundDialog(order),
          variant: "destructive",
        });
      }
      // View Refund for orders that have been refunded
      if (order.refundedAmountInCents > 0) {
        actions.push({
          label: "View Refund",
          icon: <ReceiptText className="h-4 w-4" />,
          onClick: () => openViewRefundDialog(order),
        });
      }
    }

    return actions;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="FAILED">Unfulfilled</TabsTrigger>
          <TabsTrigger value="CANCELLED">Canceled</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No orders found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile/Tablet Card Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:hidden">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="py-0 gap-0">
                <MobileRecordCard
                  type="order"
                  status={order.status}
                  date={new Date(order.createdAt)}
                  displayId={`#${order.orderNumber || order.id.slice(-8)}`}
                  badge={order.stripeSubscriptionId ? (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Sub</span>
                  ) : undefined}
                  customer={{ name: order.user?.name || order.recipientName, email: order.customerEmail }}
                  items={order.items.map((item, idx) => ({
                    id: String(idx),
                    name: item.purchaseOption.variant.product.name,
                    variant: item.purchaseOption.variant.name,
                    purchaseType: "",
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
                  shipper={order.trackingNumber && order.carrier ? {
                    carrier: order.carrier,
                    trackingNumber: order.trackingNumber,
                    trackingUrl: getTrackingUrl(order.carrier, order.trackingNumber),
                  } : undefined}
                  actions={getOrderActions(order)}
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
                    <th className="text-left py-3 px-4 font-semibold text-sm">Order #</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Items</th>
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
                        {order.stripeSubscriptionId && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full inline-block mb-1">
                            Sub
                          </span>
                        )}
                        <div className="font-medium">
                          {order.orderNumber || order.id.slice(-8)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-foreground">
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                        <br />
                        <span className="text-xs">{format(new Date(order.createdAt), "h:mm a")}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-medium">{order.user?.name || order.recipientName || "Guest"}</div>
                        <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                      </td>
                      <td className="py-4 px-4">
                        <RecordItemsList
                          strikethrough={order.refundedAmountInCents >= order.totalInCents}
                          items={order.items.map((item, idx) => ({
                            id: String(idx),
                            name: item.purchaseOption.variant.product.name,
                            variant: item.purchaseOption.variant.name,
                            purchaseType: "",
                            quantity: item.quantity,
                            refundedQuantity: item.refundedQuantity,
                          }))}
                        />
                      </td>
                      <td className="py-4 px-4 text-sm max-w-xs">
                        <ShippingAddressDisplay
                          recipientName={order.recipientName}
                          phone={order.customerPhone}
                          street={order.deliveryMethod === "DELIVERY" ? order.shippingStreet : null}
                          city={order.shippingCity}
                          state={order.shippingState}
                          postalCode={order.shippingPostalCode}
                          country={order.shippingCountry}
                          showCountry
                        />
                        {order.trackingNumber && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.carrier}:{" "}
                            <a
                              href={getTrackingUrl(order.carrier!, order.trackingNumber!)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {order.trackingNumber}
                            </a>
                          </p>
                        )}
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
                        <StatusBadge
                          status={order.status}
                          colorClassName={order.status === "PICKED_UP" ? "bg-purple-100 text-purple-800" : undefined}
                        />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <RecordActionMenu actions={getOrderActions(order)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit Address Dialog */}
      <EditAddressDialog
        open={editAddress.dialogOpen}
        onOpenChange={editAddress.setDialogOpen}
        title="Edit Shipping Address"
        description="Update the ship-to address for this order."
        savedAddresses={editAddress.savedAddresses}
        addressForm={editAddress.addressForm}
        formLoading={editAddress.formLoading}
        formErrors={editAddress.formErrors}
        onAddressSelect={editAddress.handleSelect}
        onFieldChange={(field, value) =>
          editAddress.setAddressForm((prev) => ({ ...prev, [field]: value }))
        }
        onSubmit={editAddress.handleSubmit}
      />

      {/* Ship Dialog */}
      <Dialog open={shipDialogOpen} onOpenChange={setShipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.trackingNumber ? "Edit Shipping Details" : "Mark Order as Shipped"}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.trackingNumber
                ? `Update tracking information for order #${selectedOrder?.orderNumber || selectedOrder?.id.slice(-8)}`
                : `Enter tracking information for order #${selectedOrder?.orderNumber || selectedOrder?.id.slice(-8)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger id="carrier">
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USPS">USPS</SelectItem>
                  <SelectItem value="FedEx">FedEx</SelectItem>
                  <SelectItem value="UPS">UPS</SelectItem>
                  <SelectItem value="DHL">DHL</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Configure carrier API keys in{" "}
              <Link href="/admin/settings/shipping" className="text-primary hover:underline">
                Settings &rarr; Shipping
              </Link>
              {" "}for automatic delivery status updates.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShipDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsShipped}
              disabled={!trackingNumber || !carrier || processing}
            >
              {processing ? "Processing..." : selectedOrder?.trackingNumber ? "Update Shipping" : "Mark as Shipped"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pickup Ready Dialog */}
      <Dialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Order as Ready for Pickup</DialogTitle>
            <DialogDescription>
              Confirm that order #
              {selectedOrder?.orderNumber || selectedOrder?.id.slice(-8)} is
              ready for customer pickup. The customer will receive an email
              notification.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Customer:{" "}
              {selectedOrder?.user?.name ||
                selectedOrder?.recipientName ||
                "Guest"}
            </p>
            <p className="text-sm text-muted-foreground">
              Email: {selectedOrder?.customerEmail}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPickupDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedOrder) {
                  handleMarkAsPickedUp(selectedOrder);
                  setPickupDialogOpen(false);
                }
              }}
              disabled={processing}
            >
              {processing ? "Processing..." : "Confirm Pickup Ready"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Delivered Dialog */}
      <Dialog open={deliverDialogOpen} onOpenChange={setDeliverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Order as Delivered</DialogTitle>
            <DialogDescription>
              Confirm that order #
              {selectedOrder?.orderNumber || selectedOrder?.id.slice(-8)} has
              been delivered. The customer will receive a delivery confirmation
              email.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Customer:{" "}
              {selectedOrder?.user?.name ||
                selectedOrder?.recipientName ||
                "Guest"}
            </p>
            <p className="text-sm text-muted-foreground">
              Email: {selectedOrder?.customerEmail}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeliverDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsDelivered}
              disabled={processing}
            >
              {processing ? "Processing..." : "Confirm Delivered"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unfulfill Order Dialog */}
      <Dialog open={failDialogOpen} onOpenChange={setFailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unfulfill Order</DialogTitle>
            <DialogDescription>
              Provide a reason for failing order #
              {selectedOrder?.orderNumber || selectedOrder?.id.slice(-8)}. The
              customer will be notified via email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="failureReason">Failure Reason</Label>
              <Input
                id="failureReason"
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="e.g., Out of stock, Payment issue, Unable to ship"
              />
              <p className="text-xs text-muted-foreground">
                This message will be included in the customer notification.
              </p>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Customer:</strong>{" "}
                {selectedOrder?.user?.name ||
                  selectedOrder?.recipientName ||
                  "Guest"}
              </p>
              <p>
                <strong>Email:</strong> {selectedOrder?.customerEmail}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFailDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleMarkAsFailed}
              disabled={!failureReason.trim() || processing}
            >
              {processing ? "Processing..." : "Unfulfill Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={(open) => {
        setRefundDialogOpen(open);
        if (!open) setViewRefundMode(false);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewRefundMode ? "Refund Details" : "Process Refund"}</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderNumber || selectedOrder?.id.slice(-8)}
              {" "}&mdash;{" "}
              {selectedOrder?.user?.name || selectedOrder?.recipientName || "Guest"}
              {" "}({selectedOrder?.customerEmail})
            </DialogDescription>
          </DialogHeader>

          {viewRefundMode && selectedOrder ? (
            /* View-only refund summary */
            <div className="space-y-4 py-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
                <p className="font-medium text-yellow-800">
                  Refunded: ${(selectedOrder.refundedAmountInCents / 100).toFixed(2)}
                  {selectedOrder.refundedAmountInCents >= selectedOrder.totalInCents ? " (Full)" : " (Partial)"}
                </p>
                {selectedOrder.refundedAt && (
                  <p className="text-yellow-700">
                    Date: {format(new Date(selectedOrder.refundedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>

              {/* Items with per-item refund info */}
              <div className="border rounded-md divide-y">
                {selectedOrder.items.map((item, idx) => {
                  const hasRefund = item.refundedQuantity > 0;
                  const lineTotal = item.purchaseOption.priceInCents * item.quantity;
                  return (
                    <div key={idx} className={`px-3 py-2.5 ${hasRefund ? "bg-red-50/50" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${hasRefund ? "line-through text-muted-foreground" : ""}`}>
                            {item.purchaseOption.variant.product.name}
                          </span>
                          <span className={`text-sm ${hasRefund ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
                            {" "}&mdash; {item.purchaseOption.variant.name}
                          </span>
                        </div>
                        <span className={`text-sm font-medium tabular-nums shrink-0 ${hasRefund ? "line-through text-muted-foreground" : ""}`}>
                          ${(lineTotal / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-xs text-muted-foreground">
                          {item.quantity} &times; ${(item.purchaseOption.priceInCents / 100).toFixed(2)}
                        </span>
                        {hasRefund && (
                          <span className="text-xs text-red-600 ml-2">
                            Refunded {item.refundedQuantity} of {item.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reason */}
              {selectedOrder.refundReason && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Reason</Label>
                  <p className="text-sm">{selectedOrder.refundReason}</p>
                </div>
              )}

              {/* Total refunded */}
              <div className="flex justify-between text-sm border-t pt-3">
                <span className="text-muted-foreground">Total Refunded</span>
                <span className="font-semibold text-red-600">
                  -${(selectedOrder.refundedAmountInCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            /* Edit mode - process new refund */
            <div className="space-y-4 py-4">
              {selectedOrder && selectedOrder.refundedAmountInCents > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
                  <p className="font-medium text-yellow-800">
                    Previously refunded: ${(selectedOrder.refundedAmountInCents / 100).toFixed(2)}
                  </p>
                  <p className="text-yellow-700">
                    Remaining refundable: ${((selectedOrder.totalInCents - selectedOrder.refundedAmountInCents) / 100).toFixed(2)}
                  </p>
                </div>
              )}

              {/* Full Order Refund checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="fullRefund"
                  checked={fullRefund}
                  onCheckedChange={(checked) => toggleFullRefund(checked === true)}
                />
                <Label htmlFor="fullRefund" className="text-sm font-medium cursor-pointer">
                  Full Order Refund
                </Label>
              </div>

              {/* Receipt-style item list */}
              {selectedOrder && (
                <div className="border rounded-md">
                  <div className="divide-y">
                    {selectedOrder.items.map((item, idx) => {
                      const isCrossedOff = idx in refundItems;
                      const refundQty = refundItems[idx] ?? 0;
                      const lineTotal = item.purchaseOption.priceInCents * item.quantity;
                      const isPartialQty = isCrossedOff && refundQty < item.quantity;
                      return (
                        <div
                          key={idx}
                          className={`px-3 py-2.5 cursor-pointer transition-colors ${isCrossedOff ? "bg-red-50/50" : "hover:bg-muted/30"}`}
                          onClick={() => {
                            if (fullRefund) return;
                            toggleRefundItem(idx, !isCrossedOff);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium ${isCrossedOff ? "line-through text-muted-foreground" : ""}`}>
                                {item.purchaseOption.variant.product.name}
                              </span>
                              <span className={`text-sm ${isCrossedOff ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
                                {" "}&mdash; {item.purchaseOption.variant.name}
                              </span>
                            </div>
                            <span className={`text-sm font-medium tabular-nums shrink-0 ${isCrossedOff ? "line-through text-muted-foreground" : ""}`}>
                              ${(lineTotal / 100).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                              {item.quantity} &times; ${(item.purchaseOption.priceInCents / 100).toFixed(2)}
                            </span>
                            {isCrossedOff && !fullRefund && (
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <span className="text-xs text-red-600">Refund qty:</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={item.quantity}
                                  value={refundQty}
                                  onChange={(e) => updateRefundItemQty(idx, parseInt(e.target.value) || 1)}
                                  className="w-14 h-6 text-xs text-center px-1"
                                />
                                <span className="text-xs text-muted-foreground">/ {item.quantity}</span>
                              </div>
                            )}
                          </div>
                          {isPartialQty && (
                            <p className="text-xs text-red-600 mt-0.5">
                              Refunding {refundQty} of {item.quantity} = ${((item.purchaseOption.priceInCents * refundQty) / 100).toFixed(2)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="border-t px-3 py-2.5 space-y-1 bg-muted/20">
                    {(() => {
                      const itemSubtotal = selectedOrder.items.reduce(
                        (sum, item) => sum + item.purchaseOption.priceInCents * item.quantity, 0
                      );
                      const tax = selectedOrder.taxAmountInCents ?? 0;
                      const shipping = (selectedOrder.shippingAmountInCents ?? 0) > 0
                        ? selectedOrder.shippingAmountInCents
                        : selectedOrder.totalInCents - itemSubtotal - tax;
                      const hasItemsSelected = Object.keys(refundItems).length > 0;
                      const itemRefundCents = Object.entries(refundItems).reduce((sum, [idx, qty]) => {
                        return sum + selectedOrder.items[Number(idx)].purchaseOption.priceInCents * qty;
                      }, 0);
                      const taxRefund = itemSubtotal > 0
                        ? Math.round((itemRefundCents / itemSubtotal) * tax)
                        : 0;
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className={`font-medium ${hasItemsSelected ? "line-through text-muted-foreground" : ""}`}>
                              ${(itemSubtotal / 100).toFixed(2)}
                            </span>
                          </div>
                          {shipping > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Shipping</span>
                              <span className="font-medium">
                                ${(shipping / 100).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {tax > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tax</span>
                              <span className={`font-medium ${hasItemsSelected ? "line-through text-muted-foreground" : ""}`}>
                                ${(tax / 100).toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm border-t pt-1">
                            <span className="text-muted-foreground">Order Total</span>
                            <span className={`font-medium ${hasItemsSelected ? "line-through text-muted-foreground" : ""}`}>
                              ${(selectedOrder.totalInCents / 100).toFixed(2)}
                            </span>
                          </div>
                          {hasItemsSelected && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Refund Amount</span>
                              <span className="font-semibold">
                                -${refundAmountInput || "0.00"}
                              </span>
                            </div>
                          )}
                          {hasItemsSelected && taxRefund > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Includes ${(taxRefund / 100).toFixed(2)} proportional tax
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Override amount */}
              {!fullRefund && (
                <div className="space-y-2">
                  <Label htmlFor="refundAmount">
                    Refund Amount ($)
                    {Object.keys(refundItems).length > 0 && (
                      <span className="font-normal text-muted-foreground"> &mdash; override if needed</span>
                    )}
                  </Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedOrder ? ((selectedOrder.totalInCents - selectedOrder.refundedAmountInCents) / 100).toFixed(2) : undefined}
                    value={refundAmountInput}
                    onChange={(e) => setRefundAmountInput(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Reason dropdown */}
              <div className="space-y-2">
                <Label htmlFor="refundReasonSelect">Reason (required)</Label>
                <Select value={refundReasonSelect} onValueChange={setRefundReasonSelect}>
                  <SelectTrigger id="refundReasonSelect">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer request">Customer request</SelectItem>
                    <SelectItem value="Product defect">Product defect</SelectItem>
                    <SelectItem value="Wrong item shipped">Wrong item shipped</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {refundReasonSelect === "Other" && (
                  <Input
                    value={refundReasonCustom}
                    onChange={(e) => setRefundReasonCustom(e.target.value)}
                    placeholder="Describe the reason..."
                  />
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {viewRefundMode ? (
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setRefundDialogOpen(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRefund}
                  disabled={
                    !getRefundReason() ||
                    !refundAmountInput ||
                    parseFloat(refundAmountInput) <= 0 ||
                    processing
                  }
                >
                  {processing ? "Processing..." : "Process Refund"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
