import fs from "fs/promises";
import path from "path";
import SiteHeaderWrapper from "@/app/(site)/_components/layout/SiteHeaderWrapper";
import SiteFooter from "@/app/(site)/_components/layout/SiteFooter";
import { SiteBannerProvider } from "@/app/(site)/_hooks/useSiteBanner";
import { SiteBannerPortal } from "@/app/(site)/_components/layout/SiteBannerPortal";
import { DemoBanner } from "@/app/(site)/_components/content/DemoBanner";
import { getStorefrontTheme } from "@/lib/config/app-settings";

/** Read the Google Fonts URL for the active theme from the manifest */
async function getThemeFontsUrl(
  themeId: string
): Promise<string | null> {
  try {
    const manifestPath = path.join(
      process.cwd(),
      "public/themes/manifest.json"
    );
    const raw = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    const entry = manifest.themes.find(
      (t: { id: string }) => t.id === themeId
    );
    return entry?.fonts?.googleFontsUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * Layout for all customer-facing (site) routes.
 * Wraps pages with the site header and footer.
 * Loads the active storefront theme CSS (if any) via a server-rendered <link> tag.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = await getStorefrontTheme();
  const fontsUrl =
    theme && theme !== "default" ? await getThemeFontsUrl(theme) : null;

  return (
    <SiteBannerProvider>
      {theme && theme !== "default" && (
        <>
          {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
          <link rel="stylesheet" href={`/themes/${theme}.css`} />
        </>
      )}
      <div data-site="" className="relative flex min-h-screen flex-col">
        {/* Demo banner - only shows when NEXT_PUBLIC_DEMO_MODE=true */}
        <DemoBanner />

        {/* Banner portal - renders above header when active */}
        <SiteBannerPortal />

        {/* Site header */}
        <SiteHeaderWrapper />

        {/* Page content */}
        <main className="flex-1 w-full">{children}</main>

        {/* Site footer */}
        <SiteFooter />
      </div>
    </SiteBannerProvider>
  );
}
