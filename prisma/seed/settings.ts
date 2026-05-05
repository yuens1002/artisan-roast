import { PrismaClient, WeightUnit } from "@prisma/client";
import { randomUUID } from "crypto";
import {
  sendInstallEvent,
  isTelemetryDisabledByEnv,
} from "../../lib/telemetry";

export async function seedSettings(prisma: PrismaClient) {
  console.log("  📋 Creating site settings...");

  // Instance ID - generated once on first seed, never overwritten
  const existingInstanceId = await prisma.siteSettings.findUnique({
    where: { key: "app.instanceId" },
  });

  if (!existingInstanceId) {
    const instanceId = randomUUID();
    await prisma.siteSettings.create({
      data: {
        key: "app.instanceId",
        value: instanceId,
      },
    });
    console.log(`    ✓ Instance ID generated: ${instanceId.slice(0, 8)}...`);

    // Send install telemetry event (fire-and-forget)
    // Note: During seed, we only check env var since DB setting may not exist yet
    if (!isTelemetryDisabledByEnv()) {
      console.log("    📡 Sending anonymous install event...");
      sendInstallEvent(instanceId, prisma).then((sent) => {
        if (sent) {
          console.log("    ✓ Install event sent");
        }
      });
    }
  } else {
    console.log(
      `    ✓ Instance ID exists: ${existingInstanceId.value.slice(0, 8)}...`
    );
  }

  // Category labels (used by categories.ts)
  const _labelRoasts = await prisma.siteSettings.upsert({
    where: { key: "label_roasts" },
    update: {},
    create: { key: "label_roasts", value: "Roasts" },
  });

  const _labelOrigins = await prisma.siteSettings.upsert({
    where: { key: "label_origins" },
    update: {},
    create: { key: "label_origins", value: "Origins" },
  });

  const _labelCollections = await prisma.siteSettings.upsert({
    where: { key: "label_collections" },
    update: {},
    create: { key: "label_collections", value: "Collections" },
  });

  await prisma.siteSettings.upsert({
    where: { key: "defaultCategoryLabel" },
    update: {},
    create: {
      key: "defaultCategoryLabel",
      value: _labelCollections.id,
    },
  });

  // Contact and communication settings
  await prisma.siteSettings.upsert({
    where: { key: "contactEmail" },
    update: { value: "hello@artisanroast.app" },
    create: {
      key: "contactEmail",
      value: "hello@artisanroast.app",
    },
  });

  // Newsletter settings
  await prisma.siteSettings.upsert({
    where: { key: "newsletter_enabled" },
    update: {},
    create: {
      key: "newsletter_enabled",
      value: "true",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "newsletter_heading" },
    update: {},
    create: {
      key: "newsletter_heading",
      value: "Stay Connected",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "newsletter_description" },
    update: {},
    create: {
      key: "newsletter_description",
      value:
        "Subscribe to our newsletter for exclusive offers and coffee tips.",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "social_links_enabled" },
    update: {},
    create: {
      key: "social_links_enabled",
      value: "true",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "social_links_heading" },
    update: { value: "Follow Us" },
    create: {
      key: "social_links_heading",
      value: "Follow Us",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "social_links_description" },
    update: {},
    create: {
      key: "social_links_description",
      value: "Follow us on our social media channels to stay updated",
    },
  });

  // Store branding
  await prisma.siteSettings.upsert({
    where: { key: "store_name" },
    update: {},
    create: {
      key: "store_name",
      value: (process.env.NEXT_PUBLIC_BUILD_VARIANT === "demo" || process.env.NEXT_PUBLIC_BUILD_VARIANT === "DEMO") ? "Artisan Roast Demo" : "Artisan Roast",
    },
  });

  // App-wide location type setting
  const LOCATION_TYPE = process.env.SEED_LOCATION_TYPE || "MULTI";
  await prisma.siteSettings.upsert({
    where: { key: "app.locationType" },
    update: { value: LOCATION_TYPE },
    create: {
      key: "app.locationType",
      value: LOCATION_TYPE,
    },
  });

  console.log(`    ✓ Location type set to: ${LOCATION_TYPE}`);

  // Weight unit setting (METRIC | IMPERIAL)
  const rawWeightUnit = (
    process.env.SEED_WEIGHT_UNIT || WeightUnit.IMPERIAL
  ).toUpperCase();
  const weightUnit =
    rawWeightUnit === WeightUnit.IMPERIAL
      ? WeightUnit.IMPERIAL
      : WeightUnit.METRIC;
  await prisma.siteSettings.upsert({
    where: { key: "app.weightUnit" },
    update: { value: weightUnit },
    create: { key: "app.weightUnit", value: weightUnit },
  });

  console.log(`    ✓ Weight unit set to: ${weightUnit}`);

  // Store content
  await prisma.siteSettings.upsert({
    where: { key: "store_tagline" },
    update: {},
    create: {
      key: "store_tagline",
      value: "Specialty coffee sourced from the world's finest origins.",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "store_description" },
    update: {},
    create: {
      key: "store_description",
      value:
        "Premium specialty coffee, carefully roasted to perfection. From single-origin beans to signature blends, discover exceptional coffee delivered to your door.",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "store_logo_url" },
    update: {},
    create: {
      key: "store_logo_url",
      value: "/logo.svg",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "store_favicon_url" },
    update: {},
    create: {
      key: "store_favicon_url",
      value: "/favicon.ico",
    },
  });

  // Marketing content settings
  await prisma.siteSettings.upsert({
    where: { key: "homepage_featured_heading" },
    update: { value: "Our Best Sellers" },
    create: {
      key: "homepage_featured_heading",
      value: "Our Best Sellers",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "homepage_recommendations_trending_heading" },
    update: {},
    create: {
      key: "homepage_recommendations_trending_heading",
      value: "Trending Now",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "homepage_recommendations_trending_description" },
    update: {},
    create: {
      key: "homepage_recommendations_trending_description",
      value: "Discover what other coffee lovers are enjoying",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "homepage_recommendations_personalized_heading" },
    update: {},
    create: {
      key: "homepage_recommendations_personalized_heading",
      value: "Recommended For You",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "homepage_recommendations_explore_all_text" },
    update: {},
    create: {
      key: "homepage_recommendations_explore_all_text",
      value: "Explore All Coffees",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "footer_categories_heading" },
    update: {},
    create: {
      key: "footer_categories_heading",
      value: "Coffee Selection",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "footer_quick_links_heading" },
    update: {},
    create: {
      key: "footer_quick_links_heading",
      value: "Quick Links",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "product_related_heading" },
    update: {},
    create: {
      key: "product_related_heading",
      value: "You Might Also Like",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "product_addons_section_title" },
    update: {},
    create: {
      key: "product_addons_section_title",
      value: "Save on Bundles",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "cart_addons_section_title" },
    update: {},
    create: {
      key: "cart_addons_section_title",
      value: "You May Also Like",
    },
  });

  // Product menu navigation settings
  await prisma.siteSettings.upsert({
    where: { key: "product_menu_icon" },
    update: {},
    create: {
      key: "product_menu_icon",
      value: "ShoppingBag",
    },
  });

  await prisma.siteSettings.upsert({
    where: { key: "product_menu_text" },
    update: {},
    create: {
      key: "product_menu_text",
      value: "Shop",
    },
  });

  // Social links used in footer/header
  const socialLinks = [
    {
      platform: "github",
      url: "https://github.com/yuens1002/artisan-roast",
      icon: "github",
      order: 0,
    },
    {
      platform: "linkedin",
      url: "https://www.linkedin.com/in/yuens-me",
      icon: "linkedin",
      order: 1,
    },
  ];

  for (const link of socialLinks) {
    await prisma.socialLink.upsert({
      where: { platform: link.platform },
      update: {
        url: link.url,
        icon: link.icon,
        order: link.order,
        isActive: true,
        useCustomIcon: false,
        customIconUrl: null,
      },
      create: {
        platform: link.platform,
        url: link.url,
        icon: link.icon,
        order: link.order,
        isActive: true,
        useCustomIcon: false,
        customIconUrl: null,
      },
    });
  }

  // Search drawer settings: chip label + curated category are seeded inside
  // seedMenu (after the "Top Categories" CategoryLabel and Staff Picks Category
  // exist) so the chip_label key can store the real label id.

  console.log("  ✅ Site settings created");
}
