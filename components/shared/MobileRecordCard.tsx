"use client";

import { format } from "date-fns";
import Link from "next/link";
import { MoreVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStatusColor, getStatusLabel } from "./record-utils";

export interface RecordItem {
  id: string;
  name: string;
  variant: string;
  purchaseType: string;
  quantity: number;
  refundedQuantity?: number;
  href?: string;
}

export interface RecordShipping {
  recipientName?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}

export interface RecordAction {
  label: string;
  onClick?: () => void;
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  subItems?: RecordAction[];
}

export interface RecordTracking {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
}

export interface RecordShipper {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
}

interface MobileRecordCardProps {
  type: "order" | "subscription";
  status: string;
  statusLabel?: string;
  date: Date;
  displayId: string;
  detailHref?: string;
  items: RecordItem[];
  shipping?: RecordShipping;
  deliveryMethod?: string;
  tracking?: RecordTracking;
  actions?: RecordAction[];
  actionsLoading?: boolean;
  price?: string;
  currentPeriod?: string;
  detailsSectionHeader?: string;
  customer?: { name?: string | null; email?: string | null };
  badge?: React.ReactNode;
  shipper?: RecordShipper;
  itemsClassName?: string;
  priceExtra?: React.ReactNode;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

export function MobileRecordCard({
  type,
  status,
  statusLabel,
  date,
  displayId,
  detailHref,
  items,
  shipping,
  deliveryMethod,
  tracking,
  actions,
  actionsLoading,
  price,
  currentPeriod,
  detailsSectionHeader,
  customer,
  badge,
  shipper,
  itemsClassName,
  priceExtra,
}: MobileRecordCardProps) {
  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      {/* Status + badge + actions row */}
      <div className="flex items-center justify-end gap-2">
        {badge}
        <span
          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}
        >
          {statusLabel || getStatusLabel(status)}
        </span>
        {actions && actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={actionsLoading}>
                {actionsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action) =>
                action.subItems && action.subItems.length > 0 ? (
                  <DropdownMenuSub key={action.label}>
                    <DropdownMenuSubTrigger>
                      {action.icon}
                      {action.label}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {action.subItems.map((sub) => (
                        <DropdownMenuItem key={sub.label} onClick={sub.onClick}>
                          {sub.icon}
                          {sub.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={action.className || (action.variant === "destructive" ? "text-red-600" : "")}
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Date */}
      <span className="text-sm text-foreground">
        {format(new Date(date), "MMM d, yyyy")}
      </span>

      {/* ID section */}
      <div>
        <SectionHeader>
          {type === "order" ? "Order" : "Subscription"}
        </SectionHeader>
        {type === "order" && detailHref ? (
          <Button variant="outline" size="sm" asChild className="mt-1">
            <Link href={detailHref}>{displayId}</Link>
          </Button>
        ) : (
          <p className="text-sm font-medium mt-0.5">{displayId}</p>
        )}
      </div>

      {/* Customer section (admin) */}
      {customer && (
        <div>
          <SectionHeader>Customer</SectionHeader>
          <p className="text-sm font-medium mt-0.5">{customer.name || "Guest"}</p>
          {customer.email && (
            <p className="text-xs text-muted-foreground">{customer.email}</p>
          )}
        </div>
      )}

      {/* SCHEDULE section */}
      {price && (
        <div>
          <SectionHeader>{detailsSectionHeader || "Details"}</SectionHeader>
          <p className="mt-0.5 text-sm text-foreground">{price}</p>
          {priceExtra}
        </div>
      )}

      {/* CURRENT BILLING section */}
      {currentPeriod && (
        <div>
          <SectionHeader>Current Billing</SectionHeader>
          <p className="mt-0.5 text-sm text-foreground">{currentPeriod}</p>
        </div>
      )}

      {/* Items section */}
      <div>
        <SectionHeader>Items</SectionHeader>
        <div className="mt-1 flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.id} className={itemsClassName}>
              <div className="text-sm">{item.name}</div>
              <div className="text-xs text-muted-foreground">
                {[item.variant, item.purchaseType].filter(Boolean).join(" · ")}
                {(item.variant || item.purchaseType) && " · "}
                {item.refundedQuantity != null && item.refundedQuantity > 0 ? (
                  <>
                    Qty: <span className="line-through">{item.quantity}</span>{" "}
                    <span className="text-red-600">-{item.refundedQuantity}</span>
                  </>
                ) : (
                  <>Qty: {item.quantity}</>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ship To section */}
      {(shipping?.street || (deliveryMethod && deliveryMethod !== "DELIVERY")) && (
        <div>
          <SectionHeader>Ship To</SectionHeader>
          <div className="text-sm mt-0.5">
            {shipping?.street ? (
              <>
                {shipping.recipientName && (
                  <p className="font-medium">{shipping.recipientName}</p>
                )}
                <p className="text-foreground">
                  {shipping.street}, {shipping.city}, {shipping.state}{" "}
                  {shipping.postalCode}
                </p>
              </>
            ) : (
              <p className="text-foreground italic">Store Pickup</p>
            )}
          </div>
        </div>
      )}

      {/* Shipper section (admin) */}
      {shipper && (
        <div>
          <SectionHeader>Shipper</SectionHeader>
          <p className="text-sm font-medium mt-0.5">{shipper.carrier}</p>
          <p className="text-xs text-muted-foreground">
            <a
              href={shipper.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {shipper.trackingNumber}
            </a>
          </p>
        </div>
      )}

      {/* Tracking section */}
      {tracking && (
        <div>
          <SectionHeader>Tracking</SectionHeader>
          <div className="text-sm mt-0.5">
            <p className="text-muted-foreground">{tracking.carrier}</p>
            {tracking.trackingUrl ? (
              <a
                href={tracking.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-primary hover:underline"
              >
                {tracking.trackingNumber}
              </a>
            ) : (
              <p className="font-mono text-xs">{tracking.trackingNumber}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
