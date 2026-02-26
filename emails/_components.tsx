/**
 * Shared email components used across all templates.
 */
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as s from "./_styles";

// ---------------------------------------------------------------------------
// Shared constants — single source of truth for all email templates
// ---------------------------------------------------------------------------

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// ---------------------------------------------------------------------------
// EmailBranding — every template extends this so branding props are declared
// once, not repeated across 12 interfaces.
// ---------------------------------------------------------------------------

export interface EmailBranding {
  storeName?: string;
  logoUrl?: string | null;
}

// ---------------------------------------------------------------------------
// EmailLayout — the common shell for every outgoing email.
// Renders Html/Head/Preview/Body/Container + Footer so individual templates
// only supply their unique content as children.
// ---------------------------------------------------------------------------

interface EmailLayoutProps extends EmailBranding {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({
  preview,
  children,
  storeName,
  logoUrl,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          {children}
          <Footer storeName={storeName} logoUrl={logoUrl} />
        </Container>
      </Body>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Divider — always stays within the 40px side padding
// ---------------------------------------------------------------------------

export function Divider() {
  return (
    <Section style={s.hrSection}>
      <Hr style={s.hrLine} />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// ItemDivider — thin line between order items, contained within padding
// ---------------------------------------------------------------------------

export function ItemDivider() {
  return (
    <Section style={s.itemHrSection}>
      <Hr style={s.itemHrLine} />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// ContainedSection — wraps a coloured/bordered section so it stays within
// the 40px side padding.  React Email <Section> renders as <table width=100%>
// so horizontal margin causes overflow. This uses padding on an outer
// Section instead.
// ---------------------------------------------------------------------------

interface ContainedSectionProps {
  children: React.ReactNode;
  innerStyle: React.CSSProperties;
  margin?: string;
}

export function ContainedSection({
  children,
  innerStyle,
  margin = "24px 0",
}: ContainedSectionProps) {
  return (
    <Section style={{ padding: "0 40px", margin }}>
      <Section style={innerStyle}>{children}</Section>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Footer — store logo (or name) + clickable URL
// ---------------------------------------------------------------------------

interface FooterProps {
  storeName?: string;
  appUrl?: string;
  logoUrl?: string | null;
}

export function Footer({
  storeName = "",
  appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "",
  logoUrl,
}: FooterProps) {
  const domain = s.displayDomain(appUrl);

  return (
    <Section style={s.footerSection}>
      {logoUrl ? (
        <Link href={appUrl} style={{ textDecoration: "none" }}>
          <Img
            src={logoUrl}
            alt={storeName}
            height={28}
            style={s.footerLogo}
          />
        </Link>
      ) : (
        <Text style={s.footerStoreName}>{storeName}</Text>
      )}
      <Link href={appUrl} style={s.footerUrl}>
        {domain}
      </Link>
    </Section>
  );
}
