import { Heading, Link, Section, Text } from "@react-email/components";
import type { EmailBranding } from "./_components";
import { APP_URL, ContainedSection, Divider, EmailLayout } from "./_components";
import * as s from "./_styles";

interface FailedOrderNotificationProps extends EmailBranding {
  orderNumber: string;
  customerName: string;
  failureReason: string;
  orderId: string;
  supportEmail?: string;
}

export default function FailedOrderNotification({
  orderNumber,
  customerName,
  failureReason,
  orderId,
  supportEmail,
  ...branding
}: FailedOrderNotificationProps) {
  return (
    <EmailLayout
      preview={`We're sorry - there was an issue with your order #${orderNumber}`}
      {...branding}
    >
      <Heading style={s.h1}>We&apos;re Sorry</Heading>

      <ContainedSection innerStyle={s.alertSection} margin="0 0 24px">
        <Text style={s.alertText}>There was an issue with your order</Text>
      </ContainedSection>

      <Text style={s.text}>Hi {customerName},</Text>

      <Text style={s.text}>
        Unfortunately, we were unable to fulfill your order{" "}
        <strong>#{orderNumber}</strong>.
      </Text>

      <ContainedSection innerStyle={reasonBoxInner}>
        <Text style={s.infoBoxLabel}>Reason</Text>
        <Text style={reasonText}>{failureReason}</Text>
      </ContainedSection>

      <Text style={s.text}>
        If you were charged for this order, a refund will be processed
        within 5-10 business days to your original payment method.
      </Text>

      <Section style={s.buttonSection}>
        <Link style={s.button} href={`${APP_URL}/orders/${orderId}`}>
          View Order Details
        </Link>
      </Section>

      <Divider />

      <Text style={s.text}>
        We sincerely apologize for any inconvenience this may have caused.
        If you have any questions or would like to place a new order, please
        don&apos;t hesitate to reach out.
      </Text>

      <Section style={s.buttonSection}>
        <Link style={s.buttonSecondary} href={`mailto:${supportEmail}`}>
          Contact Support
        </Link>
      </Section>
    </EmailLayout>
  );
}

const reasonBoxInner = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "24px",
};

const reasonText = {
  color: "#7f1d1d",
  fontSize: "16px",
  fontWeight: "500" as const,
  margin: "0",
  lineHeight: "24px",
};
