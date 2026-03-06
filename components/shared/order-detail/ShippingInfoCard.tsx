"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShippingAddressDisplay } from "@/components/shared/ShippingAddressDisplay";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { OrderWithItems } from "@/lib/types";

interface ShippingInfoCardProps {
  order: OrderWithItems;
  variant: "storefront" | "admin";
}

export function ShippingInfoCard({ order, variant }: ShippingInfoCardProps) {
  const { settings } = useSiteSettings();

  if (order.deliveryMethod === "PICKUP") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pickup Information</CardTitle>
        </CardHeader>
        <CardContent>
          {variant === "storefront" ? (
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
          ) : (
            <p className="text-sm text-muted-foreground italic">Store Pickup</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Information</CardTitle>
      </CardHeader>
      <CardContent>
        <ShippingAddressDisplay
          recipientName={order.recipientName}
          street={order.shippingStreet}
          city={order.shippingCity}
          state={order.shippingState}
          postalCode={order.shippingPostalCode}
          country={order.shippingCountry}
          showCountry
        />
      </CardContent>
    </Card>
  );
}
