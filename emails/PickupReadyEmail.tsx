import { Heading, Hr, Link, Section, Text } from "@react-email/components";
import type { EmailBranding } from "./_components";
import { APP_URL, ContainedSection, Divider, EmailLayout } from "./_components";
import * as s from "./_styles";

interface PickupReadyEmailProps extends EmailBranding {
  orderNumber: string;
  customerName: string;
  storeAddress: string;
  storeHours: string;
  orderId: string;
}

export default function PickupReadyEmail({
  orderNumber,
  customerName,
  storeAddress,
  storeHours,
  orderId,
  ...branding
}: PickupReadyEmailProps) {
  return (
    <EmailLayout preview={`Your order #${orderNumber} is ready for pickup!`} {...branding}>
      <Heading style={s.h1}>Your Order is Ready!</Heading>

      <Text style={s.text}>Hi {customerName},</Text>

      <Text style={s.text}>
        Great news! Your order <strong>#{orderNumber}</strong> is ready for pickup.
      </Text>

      <ContainedSection innerStyle={pickupBoxInner}>
        <Text style={s.infoBoxLabel}>Pickup Location</Text>
        <Text style={pickupAddress}>{storeAddress}</Text>
        <Hr style={pickupHr} />
        <Text style={s.infoBoxLabel}>Store Hours</Text>
        <Text style={s.infoBoxValue}>{storeHours}</Text>
      </ContainedSection>

      <ContainedSection innerStyle={s.infoBanner} margin="0 0 24px">
        <Text style={s.infoBannerText}>
          Please bring a valid ID and your order number when you come to pick up.
        </Text>
      </ContainedSection>

      <Section style={s.buttonSection}>
        <Link style={s.button} href={`${APP_URL}/orders/${orderId}`}>
          View Order Details
        </Link>
      </Section>

      <Divider />

      <Text style={s.text}>
        We&apos;re excited to see you! If you have any questions, please
        don&apos;t hesitate to contact us.
      </Text>
    </EmailLayout>
  );
}

const pickupBoxInner = {
  backgroundColor: "#fff8e1",
  border: "2px solid #ffc107",
  borderRadius: "8px",
  padding: "24px",
};

const pickupAddress = {
  color: "#1a1a1a",
  fontSize: "18px",
  fontWeight: "bold" as const,
  margin: "0 0 16px 0",
  lineHeight: "28px",
};

const pickupHr = {
  borderColor: "#ffd54f",
  margin: "16px 0",
};
