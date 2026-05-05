import fs from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";
import SiteHeaderWrapper from "@/app/(site)/_components/layout/SiteHeaderWrapper";
import SiteFooter from "@/app/(site)/_components/layout/SiteFooter";
import { SiteBannerProvider } from "@/app/(site)/_hooks/useSiteBanner";
import { SiteBannerPortal } from "@/app/(site)/_components/layout/SiteBannerPortal";
import { DemoBanner } from "@/app/(site)/_components/content/DemoBanner";
import { SearchDrawer } from "@/app/(site)/_components/search/SearchDrawer";
import { getStorefrontTheme } from "@/lib/config/app-settings";
import { getSearchDrawerConfig } from "@/lib/data";

// Cached wrapper for getSearchDrawerConfig — the layout runs on every site
// page render, but the drawer config (chip label + curated products) only
// changes when an admin edits /admin/settings/search. Cache for 60s by
// default; the admin PUT route calls revalidateTag("search-drawer-config")
// to invalidate immediately on save.
const getCachedSearchDrawerConfig = unstable_cache(
  () => getSearchDrawerConfig(),
  ["search-drawer-config"],
  { revalidate: 60, tags: ["search-drawer-config"] }
);

// Evaluated once at module load based on NEXT_PUBLIC_BUILD_VARIANT.
// DemoBanner and its hooks never enter the React tree unless this is true.
import { IS_DEMO } from "@/lib/demo";

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
  const [theme, searchDrawerConfig] = await Promise.all([
    getStorefrontTheme(),
    getCachedSearchDrawerConfig(),
  ]);
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
      {/* Outer flex row — locked to viewport height so left column owns the scrollbar */}
      <div data-site="" className="relative flex h-screen overflow-hidden">
        {/* Left column — scrolls on its own; scrollbar sits between content and panel */}
        <div id="site-scroll" className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          {/* Demo banner - only mounts on demo instances (NEXT_PUBLIC_BUILD_VARIANT=demo) */}
          {IS_DEMO && <DemoBanner />}

          {/* Banner portal - renders above header when active */}
          <SiteBannerPortal />

          {/* Site header */}
          <SiteHeaderWrapper />

          {/* Page content */}
          <main className="flex-1 w-full">{children}</main>

          {/* Site footer */}
          <SiteFooter />
        </div>

      </div>

      {/* Search drawer overlay (rendered as Radix Portal outside the flex layout) */}
      <SearchDrawer config={searchDrawerConfig} />
    </SiteBannerProvider>
  );
}
