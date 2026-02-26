import { Heading, Link, Section, Text } from "@react-email/components";
import type { EmailBranding } from "./_components";
import { APP_URL, ContainedSection, Divider, EmailLayout } from "./_components";
import * as s from "./_styles";

interface ShipmentConfirmationEmailProps extends EmailBranding {
  orderNumber: string;
  customerName: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
  orderId: string;
  isRecurringOrder?: boolean;
  deliverySchedule?: string;
}

export default function ShipmentConfirmationEmail({
  orderNumber,
  customerName,
  trackingNumber,
  carrier,
  estimatedDelivery,
  orderId,
  isRecurringOrder = false,
  deliverySchedule,
  ...branding
}: ShipmentConfirmationEmailProps) {
  const trackingUrl = getTrackingUrl(carrier, trackingNumber);
  const orderUrl = `${APP_URL}/orders/${orderId}`;

  const previewText = isRecurringOrder
    ? `Your ${deliverySchedule} subscription is on the way! - Order #${orderNumber}`
    : `Your order #${orderNumber} has shipped!`;

  return (
    <EmailLayout preview={previewText} {...branding}>
      {isRecurringOrder ? (
        <>
          <Heading style={s.h1}>Your Subscription Order Has Shipped!</Heading>
          <ContainedSection
            innerStyle={s.subscriptionBanner}
            margin="16px 0 24px"
          >
            <Text style={s.subscriptionBannerText}>
              {deliverySchedule} delivery
            </Text>
          </ContainedSection>
        </>
      ) : (
        <Heading style={s.h1}>Your Order Has Shipped!</Heading>
      )}

      <Text style={s.text}>Hi {customerName},</Text>

      <Text style={s.text}>
        {isRecurringOrder
          ? `Great news! Your ${deliverySchedule?.toLowerCase()} subscription order `
          : "Great news! Your order "}
        <strong>#{orderNumber}</strong> is on its way.
      </Text>

      <ContainedSection innerStyle={s.infoBox}>
        <Text style={s.infoBoxLabel}>Tracking Number</Text>
        <Text style={trackingNumberStyle}>{trackingNumber}</Text>
        <Text style={s.infoBoxLabel}>Carrier</Text>
        <Text style={s.infoBoxValue}>{carrier}</Text>
        <Text style={s.infoBoxLabel}>Estimated Delivery</Text>
        <Text style={s.infoBoxValue}>{estimatedDelivery}</Text>
      </ContainedSection>

      {trackingUrl && (
        <Section style={s.buttonSection}>
          <Link style={s.button} href={trackingUrl}>
            Track Your Package
          </Link>
        </Section>
      )}

      <Divider />

      <Text style={s.text}>You can also view your order details anytime:</Text>

      <Section style={s.buttonSection}>
        <Link style={s.buttonSecondary} href={orderUrl}>
          View Order Details
        </Link>
      </Section>
    </EmailLayout>
  );
}

function getTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const carriers: Record<string, string> = {
    USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    UPS: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    FedEx: `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`,
    DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
  };
  return carriers[carrier] || null;
}

const trackingNumberStyle = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "bold" as const,
  margin: "0 0 8px 0",
  fontFamily: "monospace",
};
