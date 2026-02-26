import { Heading, Link, Text } from "@react-email/components";
import type { EmailBranding } from "./_components";
import { APP_URL, ContainedSection, Divider, EmailLayout } from "./_components";
import * as s from "./_styles";

interface NewsletterWelcomeEmailProps extends EmailBranding {
  email: string;
  unsubscribeToken?: string;
}

export default function NewsletterWelcomeEmail({
  email,
  unsubscribeToken,
  storeName,
  ...branding
}: NewsletterWelcomeEmailProps) {
  const unsubscribeUrl = unsubscribeToken
    ? `${APP_URL}/newsletter/unsubscribe?token=${unsubscribeToken}`
    : "#";

  return (
    <EmailLayout
      preview={`Welcome to ${storeName ?? ""} Newsletter`}
      storeName={storeName}
      {...branding}
    >
      <Heading style={s.h1}>Welcome to {storeName}!</Heading>

      <Text style={s.text}>
        Thank you for subscribing to our newsletter! We&apos;re excited to
        have you join our community of coffee enthusiasts.
      </Text>

      <ContainedSection innerStyle={highlightBoxInner}>
        <Text style={highlightHeading}>You&apos;ll receive updates about:</Text>
        <ul style={list}>
          <li>New coffee arrivals and seasonal blends</li>
          <li>Exclusive subscriber discounts and promotions</li>
          <li>Brewing tips and coffee education</li>
          <li>Behind-the-scenes stories from our roasters</li>
        </ul>
      </ContainedSection>

      <Text style={s.text}>
        Your subscription is confirmed for: <strong>{email}</strong>
      </Text>

      <Divider />

      <Text style={unsubscribeText}>
        You can{" "}
        <Link href={unsubscribeUrl} style={s.footerUrl}>
          unsubscribe
        </Link>{" "}
        at any time if you no longer wish to receive these emails.
      </Text>
    </EmailLayout>
  );
}

const highlightBoxInner = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "24px",
};

const highlightHeading = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "600" as const,
  margin: "0 0 12px 0",
};

const list = {
  color: "#4b5563",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
  paddingLeft: "20px",
};

const unsubscribeText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 40px",
  textAlign: "center" as const,
  marginBottom: "8px",
};
