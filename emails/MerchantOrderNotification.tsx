import { Heading, Link, Section, Text } from "@react-email/components";
import { Fragment } from "react";
import type { EmailBranding } from "./_components";
import { APP_URL, ContainedSection, Divider, EmailLayout, ItemDivider } from "./_components";
import * as s from "./_styles";

interface MerchantOrderNotificationProps extends EmailBranding {
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

export default function MerchantOrderNotification({
  orderNumber,
  customerName,
  customerEmail,
  items,
  totalInCents,
  deliveryMethod,
  shippingAddress,
  orderDate,
  isRecurringOrder = false,
  ...branding
}: MerchantOrderNotificationProps) {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const subscriptionSchedule = items.find(
    (item) => item.purchaseType === "SUBSCRIPTION" && item.deliverySchedule
  )?.deliverySchedule;

  const previewText = isRecurringOrder
    ? `Subscription Renewal Order #${orderNumber} - ${subscriptionSchedule}`
    : `New Order #${orderNumber} - Action Required`;

  return (
    <EmailLayout preview={previewText} {...branding}>
      {isRecurringOrder ? (
        <>
          <Heading style={s.h1}>Subscription Renewal Order</Heading>
          <ContainedSection
            innerStyle={s.subscriptionBanner}
            margin="16px 0 24px"
          >
            <Text style={s.subscriptionBannerText}>
              {subscriptionSchedule} &middot; Auto-renewal
            </Text>
          </ContainedSection>
        </>
      ) : (
        <Heading style={s.h1}>New Order Received!</Heading>
      )}

      <Text style={s.text}>
        {isRecurringOrder
          ? "A subscription has automatically renewed and requires fulfillment."
          : "A new order has been placed and requires your attention."}
      </Text>

      <ContainedSection innerStyle={s.highlightSection}>
        <Text style={s.highlightLabel}>Order Number</Text>
        <Text style={s.highlightValue}>{orderNumber}</Text>
        <Text style={s.highlightLabel}>Order Date</Text>
        <Text style={s.highlightValue}>{orderDate}</Text>
        <Text style={s.highlightLabel}>Total</Text>
        <Text style={s.highlightValue}>{formatPrice(totalInCents)}</Text>
        <Text style={s.highlightLabel}>Delivery Method</Text>
        <Text style={s.highlightValue}>
          {deliveryMethod === "DELIVERY" ? "Shipping" : "Store Pickup"}
        </Text>
      </ContainedSection>

      <Heading as="h2" style={s.h2}>
        Customer Information
      </Heading>

      <Section style={s.detailSection}>
        <Text style={s.detailLabel}>Name</Text>
        <Text style={s.detailValue}>{customerName}</Text>
        <Text style={s.detailLabel}>Email</Text>
        <Text style={s.detailValue}>{customerEmail}</Text>
      </Section>

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
              {item.quantity} &times; {formatPrice(item.priceInCents)}
            </Text>
          </Section>
        </Fragment>
      ))}

      <Divider />

      {deliveryMethod === "DELIVERY" && shippingAddress ? (
        <>
          <Heading as="h2" style={s.h2}>
            Shipping Address
          </Heading>
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
        </>
      ) : (
        <>
          <Heading as="h2" style={s.h2}>
            Pickup Order
          </Heading>
          <Text style={s.text}>
            Customer will pick up this order at your store location. Please
            prepare the order and notify the customer when ready.
          </Text>
        </>
      )}

      <Divider />

      <Section style={s.buttonSection}>
        <Link href={`${APP_URL}/admin/orders`} style={s.button}>
          Manage Order
        </Link>
      </Section>
    </EmailLayout>
  );
}
