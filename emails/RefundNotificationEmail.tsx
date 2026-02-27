import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import type { EmailBranding } from "./_components";
import { APP_URL, ContainedSection, Divider, EmailLayout } from "./_components";
import * as s from "./_styles";

interface RefundItem {
  name: string;
  variant: string;
  quantity: number;
  amountFormatted: string;
}

interface RefundNotificationEmailProps extends EmailBranding {
  orderNumber: string;
  customerName: string;
  refundAmountFormatted: string;
  isFullRefund: boolean;
  refundReason: string;
  orderId: string;
  supportEmail?: string;
  items?: RefundItem[];
  taxRefundFormatted?: string;
}

export default function RefundNotificationEmail({
  orderNumber,
  customerName,
  refundAmountFormatted,
  isFullRefund,
  refundReason,
  orderId,
  supportEmail = "support@artisanroast.com",
  items,
  taxRefundFormatted,
  ...branding
}: RefundNotificationEmailProps) {
  const orderUrl = `${APP_URL}/orders/${orderId}`;

  return (
    <EmailLayout
      preview={`Your refund of ${refundAmountFormatted} for order #${orderNumber} has been processed`}
      {...branding}
    >
      <Heading style={s.h1}>Refund Processed</Heading>

      <ContainedSection innerStyle={infoBanner}>
        <Text style={infoBannerText}>
          {isFullRefund ? "Full refund" : "Partial refund"} of{" "}
          {refundAmountFormatted} issued
        </Text>
      </ContainedSection>

      <Text style={s.text}>Hi {customerName},</Text>

      <Text style={s.text}>
        A {isFullRefund ? "full" : "partial"} refund of{" "}
        <strong>{refundAmountFormatted}</strong> has been processed for your
        order <strong>#{orderNumber}</strong>.
      </Text>

      <ContainedSection innerStyle={reasonBox}>
        <Text style={reasonLabel}>Reason</Text>
        <Text style={reasonText}>{refundReason}</Text>
      </ContainedSection>

      {items && items.length > 0 && (
        <ContainedSection innerStyle={s.infoBox}>
          <Text style={s.infoBoxLabel}>Items Refunded</Text>
          {items.map((item, i) => (
            <Text key={i} style={breakdownItem}>
              {item.name} — {item.variant}
              {item.quantity > 1 ? ` ×${item.quantity}` : ""}
              {"  "}
              {item.amountFormatted}
            </Text>
          ))}
          {taxRefundFormatted && (
            <Text style={breakdownItem}>
              Tax{"  "}{taxRefundFormatted}
            </Text>
          )}
          <Hr style={breakdownDivider} />
          <Text style={breakdownTotal}>
            Total Refund{"  "}{refundAmountFormatted}
          </Text>
        </ContainedSection>
      )}

      <Text style={s.text}>
        The refund will appear on your original payment method within 5-10
        business days.
      </Text>

      <Section style={s.buttonSection}>
        <Button style={s.button} href={orderUrl}>
          View Order Details
        </Button>
      </Section>

      <Divider />

      <Text style={s.text}>
        If you have any questions about this refund, please don&apos;t
        hesitate to reach out.
      </Text>

      <Section style={s.buttonSection}>
        <Button style={s.buttonSecondary} href={`mailto:${supportEmail}`}>
          Contact Support
        </Button>
      </Section>
    </EmailLayout>
  );
}

// Styles specific to this template
const infoBanner = {
  backgroundColor: "#eff6ff",
  borderLeft: "4px solid #2563eb",
  padding: "12px 20px",
  borderRadius: "4px",
};

const infoBannerText = {
  color: "#1e40af",
  fontSize: "16px",
  fontWeight: "600" as const,
  lineHeight: "24px",
  margin: "0",
};

const reasonBox = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "24px",
};

const reasonLabel = {
  color: "#1e40af",
  fontSize: "12px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
};

const reasonText = {
  color: "#1e3a8a",
  fontSize: "16px",
  fontWeight: "500" as const,
  margin: "0",
  lineHeight: "24px",
};

const breakdownItem = {
  color: "#333",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
  display: "flex" as const,
  justifyContent: "space-between" as const,
};

const breakdownDivider = {
  borderColor: "#dee2e6",
  margin: "8px 0",
};

const breakdownTotal = {
  color: "#333",
  fontSize: "14px",
  fontWeight: "600" as const,
  lineHeight: "22px",
  margin: "0",
  display: "flex" as const,
  justifyContent: "space-between" as const,
};
