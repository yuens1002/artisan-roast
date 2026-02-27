import { ImageResponse } from "next/og";

import { getSiteMetadata } from "@/lib/site-metadata";

import { OG_SIZE, renderOgLayout, loadOgFonts } from "./_og/og-layout";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = isDemoMode
  ? "Artisan Roast — Open-Source E-Commerce Platform for Specialty Coffee"
  : "Artisan Roast — Specialty Coffee E-Commerce";

export default async function Image() {
  const [{ storeName, storeTagline, storeLogoUrl }, fonts] = await Promise.all([
    getSiteMetadata(),
    loadOgFonts(),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://artisanroast.app";

  return new ImageResponse(
    await renderOgLayout({
      title: isDemoMode ? "Artisan Roast" : storeName,
      subtitle: isDemoMode
        ? "Open-source e-commerce platform for specialty coffee"
        : storeTagline,
      badge: isDemoMode ? "LIVE DEMO" : undefined,
      siteUrl: appUrl,
      logoUrl: storeLogoUrl,
    }),
    { ...size, fonts }
  );
}
