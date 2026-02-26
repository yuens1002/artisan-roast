import { Heading, Link, Section, Text } from "@react-email/components";
import type { EmailBranding } from "./_components";
import { Divider, EmailLayout } from "./_components";
import * as s from "./_styles";

interface PasswordResetEmailProps extends EmailBranding {
  resetUrl: string;
  supportEmail?: string;
}

export default function PasswordResetEmail({
  resetUrl,
  supportEmail,
  storeName,
  ...branding
}: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview={`Reset your ${storeName ?? ""} password`}
      storeName={storeName}
      {...branding}
    >
      <Heading style={s.h1}>Reset your password</Heading>

      <Text style={s.text}>
        We received a request to reset your {storeName} password. Click the
        button below to set a new one. If you didn&apos;t request this, you
        can safely ignore this email.
      </Text>

      <Section style={s.buttonSection}>
        <Link href={resetUrl} style={s.button}>
          Reset password
        </Link>
      </Section>

      <Text style={s.text}>
        This link will expire soon for security. If it stops working, submit
        a new password reset request.
      </Text>

      {supportEmail && (
        <Text style={s.text}>
          Need help? Contact us at{" "}
          <Link href={`mailto:${supportEmail}`} style={linkStyle}>
            {supportEmail}
          </Link>
          .
        </Text>
      )}

      <Divider />
    </EmailLayout>
  );
}

const linkStyle = {
  color: "#8B4513",
  textDecoration: "underline",
};
