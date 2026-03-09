import {
  Truck,
  MapPin,
  HandCoins,
  CircleX,
  PackageCheck,
  ExternalLink,
  RefreshCcw,
  ReceiptText,
} from "lucide-react";
import type { RowActionConfigEntry } from "@/components/shared/data-table/row-action-config";
import type { Order } from "../hooks/useOrdersTable";

// ── Predicates ─────────────────────────────────────────────────────

const isPending = (o: Order) => o.status === "PENDING";
const isDelivery = (o: Order) => o.deliveryMethod === "DELIVERY";
const isPickup = (o: Order) => o.deliveryMethod !== "DELIVERY";
const isInTransit = (o: Order) =>
  o.status === "SHIPPED" || o.status === "OUT_FOR_DELIVERY";
const hasTracking = (o: Order) => !!o.trackingNumber && !!o.carrier;
const isDelivered = (o: Order) => o.status === "DELIVERED";
const isRefundable = (o: Order) =>
  o.status !== "CANCELLED" &&
  o.status !== "FAILED" &&
  o.refundedAmountInCents < o.totalInCents;
const hasRefund = (o: Order) => o.refundedAmountInCents > 0;
const isCancelledOrFailed = (o: Order) =>
  o.status === "CANCELLED" || o.status === "FAILED";

// ── Config ─────────────────────────────────────────────────────────

export const adminOrderRowActions: RowActionConfigEntry<Order>[] = [
  {
    id: "seeOrderDetail",
    type: "item",
    label: "See Order Detail",
    icon: ExternalLink,
    when: () => true,
  },
  // PENDING + DELIVERY actions
  {
    id: "ship",
    type: "item",
    label: "Ship",
    icon: Truck,
    when: (o) => isPending(o) && isDelivery(o),
  },
  {
    id: "editShipping",
    type: "item",
    label: "Edit Shipping",
    icon: MapPin,
    when: (o) => isPending(o) && isDelivery(o),
  },
  // PENDING + PICKUP action
  {
    id: "pickupReady",
    type: "item",
    label: "Pickup Ready",
    icon: HandCoins,
    when: (o) => isPending(o) && isPickup(o),
  },
  // PENDING — unfulfill
  {
    id: "unfulfill",
    type: "item",
    label: "Unfulfill",
    icon: CircleX,
    when: isPending,
  },
  // IN-TRANSIT actions
  {
    id: "markDelivered",
    type: "item",
    label: "Mark as Delivered",
    icon: PackageCheck,
    when: isInTransit,
  },
  {
    id: "trackPackage",
    type: "item",
    label: "Track Package",
    icon: ExternalLink,
    when: (o) => (isInTransit(o) || isDelivered(o)) && hasTracking(o),
  },
  // Refund section
  {
    type: "separator",
    when: isRefundable,
  },
  {
    id: "refund",
    type: "item",
    label: (o) => (o.refundedAmountInCents > 0 ? "Refund More" : "Refund"),
    icon: RefreshCcw,
    variant: "destructive",
    when: isRefundable,
  },
  {
    id: "viewRefund",
    type: "item",
    label: "View Refund",
    icon: ReceiptText,
    when: (o) =>
      (o.status !== "CANCELLED" && o.status !== "FAILED" && hasRefund(o)) ||
      (isCancelledOrFailed(o) && hasRefund(o)),
  },
];
