import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface OgLayoutProps {
  title: string;
  subtitle: string;
  badge?: string;
  siteUrl?: string;
  logoUrl?: string;
}

export const OG_SIZE = { width: 1200, height: 630 };

/** Load Inter font data for OG image rendering */
export async function loadOgFonts() {
  const [interBold, interRegular] = await Promise.all([
    readFile(join(process.cwd(), "app/_og/Inter-Bold.ttf")),
    readFile(join(process.cwd(), "app/_og/Inter-Regular.ttf")),
  ]);

  return [
    { name: "Inter", data: interBold, style: "normal" as const, weight: 700 as const },
    { name: "Inter", data: interRegular, style: "normal" as const, weight: 400 as const },
  ];
}

export async function renderOgLayout({ title, subtitle, badge, siteUrl, logoUrl }: OgLayoutProps) {
  let logoSrc: string;

  if (logoUrl && logoUrl.startsWith("https://")) {
    // External URL (blob storage, CDN) — use directly
    logoSrc = logoUrl;
  } else {
    // Fallback: read default SVG from filesystem
    const logoSvg = await readFile(
      join(process.cwd(), "public", "logo.svg"),
      "utf-8"
    );
    logoSrc = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "Inter, sans-serif",
        background:
          "linear-gradient(180deg, #fde8c8 0%, #f5c6d0 50%, #e8a8c8 100%)",
        padding: "60px 80px",
      }}
    >
      {/* Header: Logo + Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={64} height={64} alt="" />
        {badge && (
          <div
            style={{
              display: "flex",
              color: "#1a1a1a",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.08em",
              border: "2px solid rgba(0,0,0,0.3)",
              borderRadius: 6,
              padding: "4px 12px",
            }}
          >
            {badge}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: "#1a1a1a",
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "rgba(0,0,0,0.55)",
            fontSize: 26,
            fontWeight: 400,
            marginTop: 16,
          }}
        >
          {subtitle}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          color: "rgba(0,0,0,0.35)",
          fontSize: 20,
          fontWeight: 400,
        }}
      >
        {siteUrl ? siteUrl.replace(/^https?:\/\//, "") : "artisanroast.app"}
      </div>
    </div>
  );
}
