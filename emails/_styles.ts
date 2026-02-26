/**
 * Shared email styles — single source of truth for all outgoing email templates.
 *
 * Every template imports from here so layout, typography, colours and spacing
 * are consistent across the board.
 *
 * IMPORTANT — React Email renders <Section> as <table width="100%">.
 * Setting horizontal margin on a 100%-width table causes overflow.
 * All coloured/bordered sections use the ContainedSection wrapper component
 * (from _components.tsx) which applies padding on an outer Section instead.
 */

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

export const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const h1 = {
  color: "#333",
  fontSize: "28px",
  fontWeight: "bold" as const,
  margin: "40px 0 24px",
  padding: "0 40px",
};

export const h2 = {
  color: "#333",
  fontSize: "20px",
  fontWeight: "bold" as const,
  margin: "32px 0 16px",
  padding: "0 40px",
};

export const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 40px",
};

export const textSm = {
  color: "#555",
  fontSize: "14px",
  lineHeight: "22px",
  padding: "0 40px",
  margin: "2px 0",
};

// ---------------------------------------------------------------------------
// Detail labels / values  (white background sections)
// ---------------------------------------------------------------------------

export const detailSection = {
  padding: "0 40px",
  marginTop: "16px",
  marginBottom: "16px",
};

export const detailLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600" as const,
  lineHeight: "16px",
  margin: "12px 0 2px 0",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

export const detailValue = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0",
};

// ---------------------------------------------------------------------------
// Highlighted section  (amber background — for key info blocks)
// Use with <ContainedSection innerStyle={highlightSection}>
// ---------------------------------------------------------------------------

export const highlightSection = {
  backgroundColor: "#fffbeb",
  borderLeft: "4px solid #f59e0b",
  padding: "16px 20px",
  borderRadius: "4px",
};

export const highlightLabel = {
  color: "#92400e",
  fontSize: "12px",
  fontWeight: "600" as const,
  lineHeight: "16px",
  margin: "12px 0 2px 0",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

export const highlightValue = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0",
};

// ---------------------------------------------------------------------------
// Alert / warning section  (red background — for errors, flags)
// Use with <ContainedSection innerStyle={alertSection}>
// ---------------------------------------------------------------------------

export const alertSection = {
  backgroundColor: "#fef2f2",
  borderLeft: "4px solid #ef4444",
  padding: "12px 20px",
  borderRadius: "4px",
};

export const alertText = {
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "600" as const,
  lineHeight: "24px",
  margin: "0",
};

// ---------------------------------------------------------------------------
// Info box  (neutral gray background — for tracking, pickup details)
// Use with <ContainedSection innerStyle={infoBox}>
// ---------------------------------------------------------------------------

export const infoBox = {
  backgroundColor: "#f8f9fa",
  border: "1px solid #e9ecef",
  borderRadius: "8px",
  padding: "24px",
};

export const infoBoxLabel = {
  color: "#6c757d",
  fontSize: "12px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "12px 0 2px 0",
};

export const infoBoxValue = {
  color: "#1a1a1a",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0",
};

// ---------------------------------------------------------------------------
// Divider  —  wrapped in a Section so it never overflows the container
// ---------------------------------------------------------------------------

export const hrSection = {
  padding: "0 40px",
  margin: "32px 0",
};

export const hrLine = {
  borderColor: "#e6ebf1",
  margin: "0",
};

// Thin divider between order items (contained within padding)
export const itemHrSection = {
  padding: "0 40px",
};

export const itemHrLine = {
  borderColor: "#f0f0f0",
  margin: "0",
};

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export const buttonSection = {
  padding: "0 40px",
  marginTop: "32px",
  marginBottom: "32px",
};

export const button = {
  backgroundColor: "#8B4513",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
  padding: "12px 0",
};

export const buttonSecondary = {
  backgroundColor: "#6c757d",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
  padding: "10px 0",
};

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

export const footerSection = {
  padding: "0 40px",
  textAlign: "center" as const,
};

export const footerLogo = {
  margin: "0 auto 8px",
};

export const footerStoreName = {
  color: "#8898aa",
  fontSize: "14px",
  margin: "0 0 4px 0",
};

export const footerUrl = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "4px 0 0 0",
  textDecoration: "none",
};

// ---------------------------------------------------------------------------
// Banners  (subscription, info)
// Use with <ContainedSection innerStyle={subscriptionBanner}>
// ---------------------------------------------------------------------------

export const subscriptionBanner = {
  backgroundColor: "#dcfce7",
  borderLeft: "4px solid #16a34a",
  padding: "12px 20px",
  borderRadius: "4px",
};

export const subscriptionBannerText = {
  color: "#166534",
  fontSize: "16px",
  fontWeight: "600" as const,
  lineHeight: "24px",
  margin: "0",
  textAlign: "center" as const,
};

export const infoBanner = {
  backgroundColor: "#e3f2fd",
  borderLeft: "4px solid #1976d2",
  padding: "12px 20px",
  borderRadius: "4px",
};

export const infoBannerText = {
  color: "#1565c0",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

// ---------------------------------------------------------------------------
// Order items
// ---------------------------------------------------------------------------

export const itemSection = {
  padding: "12px 40px",
};

export const itemName = {
  color: "#333",
  fontSize: "16px",
  fontWeight: "600" as const,
  lineHeight: "24px",
  margin: "0",
};

export const itemMeta = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "2px 0 0 0",
};

export const itemPrice = {
  color: "#333",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "4px 0 0 0",
};

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

export const totalsSection = {
  padding: "0 40px",
};

export const totalRow = {
  color: "#333",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "4px 0",
};

export const totalRowFinal = {
  color: "#333",
  fontSize: "20px",
  fontWeight: "bold" as const,
  lineHeight: "28px",
  margin: "8px 0 0 0",
};

// ---------------------------------------------------------------------------
// Utility: extract display domain from a URL
// ---------------------------------------------------------------------------

export function displayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
