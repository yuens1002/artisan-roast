"use client";

import { CreditCard, Mail, Phone, ExternalLink, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderWithItems } from "@/lib/types";

interface OrderInfoCardProps {
  order: OrderWithItems;
  variant: "storefront" | "admin";
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-all">{children}</div>
      </div>
    </div>
  );
}

export function OrderInfoCard({ order, variant }: OrderInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Payment method */}
        {order.paymentCardLast4 && (
          <InfoRow icon={CreditCard} label="Payment Method">
            Card ending in {order.paymentCardLast4}
          </InfoRow>
        )}

        {/* Delivery method */}
        <InfoRow icon={Truck} label="Delivery Method">
          {order.deliveryMethod === "DELIVERY"
            ? "Standard Delivery"
            : "Store Pickup"}
        </InfoRow>

        {/* Admin-only fields */}
        {variant === "admin" && (
          <>
            {order.customerEmail && (
              <InfoRow icon={Mail} label="Customer Email">
                {order.customerEmail}
              </InfoRow>
            )}
            {order.customerPhone && (
              <InfoRow icon={Phone} label="Customer Phone">
                {order.customerPhone}
              </InfoRow>
            )}
            {order.stripePaymentIntentId && (
              <InfoRow icon={ExternalLink} label="Stripe Payment">
                <a
                  href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {order.stripePaymentIntentId.slice(0, 20)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              </InfoRow>
            )}
            {order.stripeSubscriptionId && (
              <InfoRow icon={ExternalLink} label="Stripe Subscription">
                <a
                  href={`https://dashboard.stripe.com/subscriptions/${order.stripeSubscriptionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {order.stripeSubscriptionId.slice(0, 20)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              </InfoRow>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
