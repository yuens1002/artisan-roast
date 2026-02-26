import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface RefundItem {
  name: string;
  variant: string;
  quantity: number;
  amountFormatted: string;
}

interface RefundNotificationEmailProps {
  orderNumber: string;
  customerName: string;
  refundAmountFormatted: string;
  isFullRefund: boolean;
  refundReason: string;
  orderId: string;
  storeName?: string;
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
  storeName = "Artisan Roast",
  supportEmail = "support@artisanroast.com",
  items,
  taxRefundFormatted,
}: RefundNotificationEmailProps) {
  const orderUrl = `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}`;

  return (
    <Html>
      <Head />
      <Preview>
        Your refund of {refundAmountFormatted} for order #{orderNumber} has been
        processed
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Refund Processed</Heading>

          <Section style={alertBanner}>
            <Text style={alertBannerText}>
              {isFullRefund ? "Full refund" : "Partial refund"} of{" "}
              {refundAmountFormatted} issued
            </Text>
          </Section>

          <Text style={text}>Hi {customerName},</Text>

          <Text style={text}>
            A {isFullRefund ? "full" : "partial"} refund of{" "}
            <strong>{refundAmountFormatted}</strong> has been processed for your
            order <strong>#{orderNumber}</strong>.
          </Text>

          <Section style={reasonBox}>
            <Text style={reasonLabel}>Reason</Text>
            <Text style={reasonText}>{refundReason}</Text>
          </Section>

          {items && items.length > 0 && (
            <Section style={breakdownBox}>
              <Text style={breakdownLabel}>Items Refunded</Text>
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
            </Section>
          )}

          <Text style={text}>
            The refund will appear on your original payment method within 5-10
            business days.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={orderUrl}>
              View Order Details
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={text}>
            If you have any questions about this refund, please don&apos;t
            hesitate to reach out.
          </Text>

          <Section style={buttonContainer}>
            <Button style={buttonSecondary} href={`mailto:${supportEmail}`}>
              Contact Support
            </Button>
          </Section>

          <Text style={footer}>
            Thank you for your patience.
            <br />
            <Link href={process.env.NEXT_PUBLIC_APP_URL} style={link}>
              {storeName}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
  width: "100%",
  boxSizing: "border-box" as const,
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0 16px 0",
  padding: "0",
  textAlign: "center" as const,
};

const alertBanner = {
  backgroundColor: "#eff6ff",
  borderLeft: "4px solid #2563eb",
  padding: "12px 24px",
  margin: "16px 24px 24px 24px",
  borderRadius: "4px",
};

const alertBannerText = {
  color: "#1e40af",
  fontSize: "16px",
  fontWeight: "600" as const,
  lineHeight: "24px",
  margin: "0",
  textAlign: "center" as const,
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 24px",
};

const reasonBox = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  margin: "24px 24px",
  padding: "24px",
  textAlign: "center" as const,
  width: "auto",
  maxWidth: "100%",
  boxSizing: "border-box" as const,
};

const reasonLabel = {
  color: "#1e40af",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
};

const reasonText = {
  color: "#1e3a8a",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0",
  lineHeight: "24px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#8B4513",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const buttonSecondary = {
  backgroundColor: "#6c757d",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "10px 20px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 24px",
};

const link = {
  color: "#8B4513",
  textDecoration: "underline",
};

const breakdownBox = {
  backgroundColor: "#f8f9fa",
  border: "1px solid #e9ecef",
  borderRadius: "8px",
  margin: "24px 24px",
  padding: "16px 20px",
  width: "auto",
  maxWidth: "100%",
  boxSizing: "border-box" as const,
};

const breakdownLabel = {
  color: "#6c757d",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px 0",
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
  fontWeight: "600",
  lineHeight: "22px",
  margin: "0",
  display: "flex" as const,
  justifyContent: "space-between" as const,
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "24px",
  textAlign: "center" as const,
  margin: "32px 0",
};
