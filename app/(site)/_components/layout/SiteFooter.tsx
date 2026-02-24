import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Separator } from "@/components/ui/separator";
import NewsletterSignup from "../content/NewsletterSignup";
import SocialLinks from "../content/SocialLinks";
import FooterCategories from "../navigation/FooterCategories";
import FooterAccountLinks from "../navigation/FooterAccountLinks";
import { getPagesForFooter } from "@/app/actions";
import { getProductMenuSettings } from "@/lib/product-menu-settings";
import { ThemeSwitcher } from "@/components/shared/ThemeSwitcher";

interface NavCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
}

/**
 * Get branding settings from database
 */
async function getBrandingSettings() {
  const settings = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: [
          "store_name",
          "store_tagline",
          "store_description",
          "store_logo_url",
          "footer_categories_heading",
          "footer_quick_links_heading",
        ],
      },
    },
  });

  const settingsMap = settings.reduce(
    (acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    },
    {} as Record<string, string>
  );

  return {
    storeName: settingsMap.store_name || "Artisan Roast",
    storeTagline:
      settingsMap.store_tagline ||
      "Specialty coffee sourced from the world's finest origins.",
    storeLogoUrl: settingsMap.store_logo_url || "/logo.svg",
    footerCategoriesHeading:
      settingsMap.footer_categories_heading || "Coffee Selection",
    footerQuickLinksHeading:
      settingsMap.footer_quick_links_heading || "Quick Links",
  };
}

/**
 * Get all categories grouped by their label for footer navigation
 */
async function getCategoriesForFooter() {
  const data = await import("@/lib/data").then((m) => m.getCategoryLabels());

  // Transform the data into grouped categories by label
  const grouped: Record<string, NavCategory[]> = {};
  const labelIcons: Record<string, string> = {};

  for (const label of data) {
    grouped[label.name] = label.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      order: cat.order,
    }));
    if (label.icon) {
      labelIcons[label.name] = label.icon;
    }
  }

  return { grouped, labelIcons };
}

/**
 * Get active social links for footer
 */
async function getSocialLinks() {
  return await prisma.socialLink.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: {
      platform: true,
      url: true,
      icon: true,
      customIconUrl: true,
      useCustomIcon: true,
    },
  });
}

/**
 * Get footer contact settings from database
 */
async function getFooterContactSettings() {
  const settings = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: [
          "footer_show_hours",
          "footer_hours_text",
          "footer_show_email",
          "footer_email",
        ],
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const settingsMap = settings.reduce(
    (acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    },
    {} as Record<string, string>
  );

  return {
    showHours: settingsMap["footer_show_hours"] === "true",
    hoursText: settingsMap["footer_hours_text"] || "Mon-Fri 7am-7pm",
    showEmail: settingsMap["footer_show_email"] === "true",
    email: settingsMap["footer_email"] || "hello@artisan-roast.com",
  };
}

async function getNewsletterSettings() {
  const settings = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: [
          "newsletter_enabled",
          "newsletter_heading",
          "newsletter_description",
        ],
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const map = settings.reduce<Record<string, string>>((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  return {
    enabled: map["newsletter_enabled"] !== "false",
    heading: map["newsletter_heading"] || "Stay Connected",
    description:
      map["newsletter_description"] ||
      "Subscribe to our newsletter for exclusive offers and coffee tips.",
  };
}

async function getSocialLinksSettings() {
  const settings = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: [
          "social_links_enabled",
          "social_links_heading",
          "social_links_description",
        ],
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const map = settings.reduce<Record<string, string>>((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  return {
    enabled: map["social_links_enabled"] === "true",
    heading: map["social_links_heading"] || "Follow Us",
    description: map["social_links_description"] || undefined,
  };
}

/**
 * Mega footer with category navigation, newsletter signup, and social links
 */
export default async function SiteFooter() {
  const [
    brandingSettings,
    categoriesData,
    socialLinks,
    contactSettings,
    newsletterSettings,
    socialLinksSettings,
    footerPages,
    productMenuSettings,
  ] = await Promise.all([
    getBrandingSettings(),
    getCategoriesForFooter(),
    getSocialLinks(),
    getFooterContactSettings(),
    getNewsletterSettings(),
    getSocialLinksSettings(),
    getPagesForFooter(),
    getProductMenuSettings(),
  ]);

  const { grouped: categoryGroups, labelIcons } = categoriesData;

  // Check if third column should be shown
  const showThirdColumn =
    newsletterSettings.enabled || socialLinksSettings.enabled;

  // Check if current user is admin for footer links
  await auth();

  return (
    <footer className="bg-muted text-foreground border-t">
      <div className="mx-auto max-w-screen-2xl px-4 md:px-8 pt-12 pb-6">
        {/* Logo and Branding */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-block hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <Image
                src={brandingSettings.storeLogoUrl}
                alt={`${brandingSettings.storeName} Logo`}
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="text-2xl font-bold">
                {brandingSettings.storeName}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {brandingSettings.storeTagline}
            </p>
          </Link>
        </div>

        <div
          className={`grid grid-cols-1 gap-8 items-start md:grid-cols-[30%_auto_1fr] ${
            showThirdColumn
              ? "lg:grid-cols-[1fr_auto_3fr_auto_2fr]"
              : "lg:grid-cols-[1fr_auto_3fr]"
          }`}
        >
          {/* Quick Links */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {brandingSettings.footerQuickLinksHeading}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm hover:underline hover:text-primary transition-colors"
                >
                  Home
                </Link>
              </li>
              {/* Dynamic Pages from Database */}
              {footerPages.map((page) => (
                <li key={page.id}>
                  <Link
                    href={
                      page.type === "LINK" && page.url
                        ? page.url
                        : `/pages/${page.slug}`
                    }
                    className="text-sm hover:underline hover:text-primary transition-colors"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
              <FooterAccountLinks />
            </ul>
          </div>

          {/* Horizontal Separator (sm only) */}
          <Separator className="md:hidden" />

          {/* Vertical Separator (md+) */}
          <Separator
            orientation="vertical"
            className="hidden md:block h-auto self-stretch"
          />

          {/* Coffee Categories */}
          <FooterCategories
            categoryGroups={categoryGroups}
            labelIcons={labelIcons}
            heading={brandingSettings.footerCategoriesHeading}
            productMenuIcon={productMenuSettings.icon}
            productMenuText={productMenuSettings.text}
          />

          {showThirdColumn && (
            <>
              {/* Horizontal Separator (sm only) */}
              <Separator className="md:hidden" />

              {/* Horizontal Separator spanning full width at md only (after row 1) */}
              <Separator className="hidden md:block lg:hidden md:col-span-3" />

              {/* Vertical Separator (lg+ only) */}
              <Separator
                orientation="vertical"
                className="hidden lg:block h-auto self-stretch"
              />

              {/* Stay Connected & Follow Us wrapper — 2-col at md, stacked at lg+ */}
              <div className="md:col-span-3 lg:col-span-1 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] lg:grid-cols-1 gap-8">
                {/* Stay Connected (Newsletter) */}
                {newsletterSettings.enabled && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {newsletterSettings.heading}
                    </h3>
                    <h4 className="text-sm text-muted-foreground pb-4">
                      {newsletterSettings.description}
                    </h4>
                    <NewsletterSignup enabled={newsletterSettings.enabled} />
                  </div>
                )}

                {/* Divider between sections: horizontal on sm & lg+, vertical at md */}
                {newsletterSettings.enabled && socialLinksSettings.enabled && (
                  <>
                    <Separator className="md:hidden lg:block" />
                    <Separator
                      orientation="vertical"
                      className="hidden md:block lg:hidden h-auto self-stretch"
                    />
                  </>
                )}

                {/* Follow Us (Social) */}
                {socialLinksSettings.enabled && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {socialLinksSettings.heading}
                    </h3>
                    {socialLinksSettings.description && (
                      <h4 className="text-sm text-muted-foreground pb-4">
                        {socialLinksSettings.description}
                      </h4>
                    )}
                    <SocialLinks links={socialLinks} />
                    {(contactSettings.showHours ||
                      contactSettings.showEmail) && (
                      <div className="pt-4 space-y-2">
                        {contactSettings.showHours && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Hours:</strong> {contactSettings.hoursText}
                          </p>
                        )}
                        {contactSettings.showEmail && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Email:</strong>{" "}
                            <a
                              href={`mailto:${contactSettings.email}`}
                              className="hover:underline hover:text-primary"
                            >
                              {contactSettings.email}
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Copyright - Full Width Separator */}
      <div className="border-t border-border/30 bg-background/90">
        <div className="mx-auto max-w-screen-2xl px-4 md:px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {brandingSettings.storeName}. All
            rights reserved.
          </p>
          <ThemeSwitcher />
        </div>
      </div>
    </footer>
  );
}
