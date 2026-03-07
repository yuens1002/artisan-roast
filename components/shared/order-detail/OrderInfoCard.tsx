"use client";

import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPhoneNumber } from "@/components/shared/record-utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { OrderWithItems } from "@/lib/types";

interface OrderInfoCardProps {
  order: OrderWithItems;
  variant: "storefront" | "admin";
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </h3>
      <div className="text-sm leading-normal">{children}</div>
    </div>
  );
}

export function OrderInfoCard({ order, variant }: OrderInfoCardProps) {
  const { settings } = useSiteSettings();
  const hasCustomerInfo =
    variant === "admin" && (order.customerEmail || order.customerPhone);
  const hasStripeLinks =
    variant === "admin" &&
    (order.stripePaymentIntentId || order.stripeSubscriptionId);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Order Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer section (admin only) */}
        {hasCustomerInfo && (
          <InfoSection title="Customer">
            {order.customerEmail && <div>{order.customerEmail}</div>}
            {order.customerPhone && (
              <div>{formatPhoneNumber(order.customerPhone)}</div>
            )}
          </InfoSection>
        )}

        {/* Payment section */}
        <InfoSection title="Payment">
          {order.paymentCardLast4 ? (
            <div>Card ending in {order.paymentCardLast4}</div>
          ) : (
            <div>Paid via Stripe Checkout</div>
          )}
        </InfoSection>

        {/* Stripe links (admin only) */}
        {hasStripeLinks && (
          <InfoSection title="Stripe">
            {order.stripePaymentIntentId && (
              <div>
                <a
                  href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Payment: {order.stripePaymentIntentId.slice(0, 20)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {order.stripeSubscriptionId && (
              <div>
                <a
                  href={`https://dashboard.stripe.com/subscriptions/${order.stripeSubscriptionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Subscription: {order.stripeSubscriptionId.slice(0, 20)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </InfoSection>
        )}

        {/* Shipping / Pickup section */}
        {order.deliveryMethod === "PICKUP" ? (
          <InfoSection title="Pickup">
            {variant === "storefront" ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Your order is ready for pickup at:
                </p>
                <address className="not-italic">
                  <strong>{settings.storeName}</strong>
                  <br />
                  123 Coffee Street
                  <br />
                  San Francisco, CA 94102
                  <br />
                  United States
                </address>
                <p className="text-muted-foreground text-xs mt-2">
                  Store hours: Monday - Friday, 8am - 6pm
                </p>
              </div>
            ) : (
              <div className="italic">Store Pickup</div>
            )}
          </InfoSection>
        ) : (
          <InfoSection title="Shipping Address">
            {order.recipientName && (
              <div>{order.recipientName}</div>
            )}
            <div>{order.shippingStreet}</div>
            <div>
              {order.shippingCity}, {order.shippingState}{" "}
              {order.shippingPostalCode}
            </div>
            {order.shippingCountry && (
              <div>{order.shippingCountry}</div>
            )}
          </InfoSection>
        )}
      </CardContent>
    </Card>
  );
}
