import { Heading, Link, Section, Text } from "@react-email/components";
import type { EmailBranding } from "./_components";
import { APP_URL, ContainedSection, Divider, EmailLayout } from "./_components";
import * as s from "./_styles";

interface DeliveryConfirmationEmailProps extends EmailBranding {
  orderNumber: string;
  customerName: string;
  orderId: string;
  deliveredAt: string;
}

export default function DeliveryConfirmationEmail({
  orderNumber,
  customerName,
  orderId,
  deliveredAt,
  ...branding
}: DeliveryConfirmationEmailProps) {
  return (
    <EmailLayout preview={`Your order #${orderNumber} has been delivered!`} {...branding}>
      <Heading style={s.h1}>Your Order Has Been Delivered!</Heading>

      <Text style={s.text}>Hi {customerName},</Text>

      <Text style={s.text}>
        Great news! Your order <strong>#{orderNumber}</strong> has been delivered.
      </Text>

      <ContainedSection innerStyle={s.infoBox}>
        <Text style={s.infoBoxLabel}>Delivered On</Text>
        <Text style={deliveredAtStyle}>{deliveredAt}</Text>
      </ContainedSection>

      <Section style={s.buttonSection}>
        <Link style={s.button} href={`${APP_URL}/orders/${orderId}`}>
          View Order Details
        </Link>
      </Section>

      <Divider />
    </EmailLayout>
  );
}

const deliveredAtStyle = {
  color: "#1a1a1a",
  fontSize: "20px",
  fontWeight: "bold" as const,
  margin: "0",
};
