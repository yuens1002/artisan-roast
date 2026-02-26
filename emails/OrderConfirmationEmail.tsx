import { Heading, Link, Section, Text } from "@react-email/components";
import { Fragment } from "react";
import type { EmailBranding } from "./_components";
import { APP_URL, ContainedSection, Divider, EmailLayout, ItemDivider } from "./_components";
import * as s from "./_styles";

interface OrderConfirmationEmailProps extends EmailBranding {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productName: string;
    variantName: string;
    quantity: number;
    priceInCents: number;
    purchaseType: string;
    deliverySchedule: string | null;
  }>;
  subtotalInCents: number;
  shippingInCents: number;
  totalInCents: number;
  deliveryMethod: "DELIVERY" | "PICKUP";
  shippingAddress?: {
    recipientName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  orderDate: string;
  isRecurringOrder?: boolean;
}

export default function OrderConfirmationEmail({
  orderId,
  orderNumber,
  customerName,
  customerEmail,
  items,
  subtotalInCents,
  shippingInCents,
  totalInCents,
  deliveryMethod,
  shippingAddress,
  orderDate,
  isRecurringOrder = false,
  storeName,
  ...branding
}: OrderConfirmationEmailProps) {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const subscriptionSchedule = items.find(
    (item) => item.purchaseType === "SUBSCRIPTION" && item.deliverySchedule
  )?.deliverySchedule;

  const previewText = isRecurringOrder
    ? `Your ${subscriptionSchedule} subscription is on the way! - Order #${orderNumber}`
    : `Order #${orderNumber} confirmed - ${storeName}`;

  return (
    <EmailLayout preview={previewText} storeName={storeName} {...branding}>
      {isRecurringOrder ? (
        <>
          <Heading style={s.h1}>
            Your Subscription Order is Being Prepared!
          </Heading>
          <ContainedSection
            innerStyle={s.subscriptionBanner}
            margin="16px 0 24px"
          >
            <Text style={s.subscriptionBannerText}>
              <strong>{subscriptionSchedule}</strong> delivery
            </Text>
          </ContainedSection>
        </>
      ) : (
        <Heading style={s.h1}>Thank you for your order!</Heading>
      )}

      <Text style={s.text}>Hi {customerName},</Text>

      <Text style={s.text}>
        {isRecurringOrder
          ? `Great news! Your ${subscriptionSchedule?.toLowerCase()} subscription order has been processed and will be shipped soon. Here are the details:`
          : "We've received your order and will process it shortly. Here are the details:"}
      </Text>

      <ContainedSection innerStyle={s.highlightSection}>
        <Text style={s.highlightLabel}>Order Number</Text>
        <Text style={s.highlightValue}>{orderNumber}</Text>
        <Text style={s.highlightLabel}>Order Date</Text>
        <Text style={s.highlightValue}>{orderDate}</Text>
        <Text style={s.highlightLabel}>Email</Text>
        <Text style={s.highlightValue}>{customerEmail}</Text>
      </ContainedSection>

      <Heading as="h2" style={s.h2}>
        Order Items
      </Heading>

      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && <ItemDivider />}
          <Section style={s.itemSection}>
            <Text style={s.itemName}>{item.productName}</Text>
            <Text style={s.itemMeta}>
              {item.variantName}
              {item.purchaseType === "SUBSCRIPTION" && item.deliverySchedule
                ? ` · Subscription - ${item.deliverySchedule}`
                : " · One-time"}
            </Text>
            <Text style={s.itemPrice}>
              {item.quantity} &times; {formatPrice(item.priceInCents)} ={" "}
              {formatPrice(item.quantity * item.priceInCents)}
            </Text>
          </Section>
        </Fragment>
      ))}

      <Divider />

      <Section style={s.totalsSection}>
        <Text style={s.detailLabel}>Subtotal</Text>
        <Text style={s.detailValue}>{formatPrice(subtotalInCents)}</Text>
        {deliveryMethod === "DELIVERY" && (
          <>
            <Text style={s.detailLabel}>Shipping</Text>
            <Text style={s.detailValue}>
              {formatPrice(shippingInCents)}
            </Text>
          </>
        )}
        <Text style={s.detailLabel}>Total</Text>
        <Text style={s.totalRowFinal}>{formatPrice(totalInCents)}</Text>
      </Section>

      <Divider />

      <Heading as="h2" style={s.h2}>
        {deliveryMethod === "DELIVERY"
          ? "Shipping Address"
          : "Pickup Location"}
      </Heading>

      {deliveryMethod === "DELIVERY" && shippingAddress ? (
        <Section style={s.detailSection}>
          <Text style={s.detailValue}>
            {shippingAddress.recipientName}
          </Text>
          <Text style={s.detailValue}>{shippingAddress.street}</Text>
          <Text style={s.detailValue}>
            {shippingAddress.city}, {shippingAddress.state}{" "}
            {shippingAddress.postalCode}
          </Text>
          <Text style={s.detailValue}>{shippingAddress.country}</Text>
        </Section>
      ) : (
        <Section style={s.detailSection}>
          <Text style={s.detailValue}>{storeName}</Text>
          <Text style={s.detailValue}>123 Coffee Street</Text>
          <Text style={s.detailValue}>San Francisco, CA 94102</Text>
          <Text style={s.detailValue}>
            We&apos;ll send you an email when your order is ready for
            pickup!
          </Text>
        </Section>
      )}

      <Divider />

      <Text style={s.text}>
        You can track your order status at any time by visiting your order
        history.
      </Text>

      <Section style={s.buttonSection}>
        <Link
          href={`${APP_URL}/orders/${orderId}`}
          style={s.button}
        >
          View Order Details
        </Link>
      </Section>
    </EmailLayout>
  );
}
