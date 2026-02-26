/**
 * App Settings Utilities
 * Manages global app configuration using SiteSettings key-value store
 */

import { WeightUnit } from "@prisma/client";
import { prisma } from "../prisma";
import { LocationType } from "../location-type";

const APP_SETTINGS_KEYS = {
  LOCATION_TYPE: "app.locationType",
  WEIGHT_UNIT: "app.weightUnit",
  ALLOW_PROMO_CODES: "commerce.allowPromoCodes",
  REVIEWS_ENABLED: "commerce.reviewsEnabled",
  REVIEW_EMAIL_DELAY_DAYS: "commerce.reviewEmailDelayDays",
  NOTIFY_ON_NEW_REVIEW: "commerce.notifyOnNewReview",
  STOREFRONT_THEME: "storefront.theme",
  CRON_SECRET: "cron.secret",
} as const;

/**
 * Get the cafe location type setting
 * @returns "SINGLE" or "MULTI"
 */
export async function getLocationType(): Promise<LocationType> {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: APP_SETTINGS_KEYS.LOCATION_TYPE },
  });

  return (setting?.value as LocationType) || LocationType.SINGLE; // Default to SINGLE
}

/**
 * Get the preferred weight unit
 * @returns WeightUnit.METRIC or WeightUnit.IMPERIAL
 */
export async function getWeightUnit(): Promise<WeightUnit> {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: APP_SETTINGS_KEYS.WEIGHT_UNIT },
  });

  if (setting?.value === WeightUnit.IMPERIAL) return WeightUnit.IMPERIAL;
  return WeightUnit.METRIC;
}

/**
 * Set the cafe location type setting
 * @param value "SINGLE" or "MULTI"
 */
export async function setLocationType(value: LocationType): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key: APP_SETTINGS_KEYS.LOCATION_TYPE },
    update: { value },
    create: {
      key: APP_SETTINGS_KEYS.LOCATION_TYPE,
      value,
    },
  });
}

/**
 * Set the preferred weight unit
 */
export async function setWeightUnit(value: WeightUnit): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key: APP_SETTINGS_KEYS.WEIGHT_UNIT },
    update: { value },
    create: {
      key: APP_SETTINGS_KEYS.WEIGHT_UNIT,
      value,
    },
  });
}

/**
 * Get whether promotion codes are enabled at checkout
 */
export async function getAllowPromoCodes(): Promise<boolean> {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: APP_SETTINGS_KEYS.ALLOW_PROMO_CODES },
  });

  return setting?.value === "true";
}

/**
 * Set whether promotion codes are enabled at checkout
 */
export async function setAllowPromoCodes(value: boolean): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key: APP_SETTINGS_KEYS.ALLOW_PROMO_CODES },
    update: { value: String(value) },
    create: {
      key: APP_SETTINGS_KEYS.ALLOW_PROMO_CODES,
      value: String(value),
    },
  });
}

/**
 * Get whether product reviews are enabled
 */
export async function getReviewsEnabled(): Promise<boolean> {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: APP_SETTINGS_KEYS.REVIEWS_ENABLED },
  });

  return setting?.value === "true";
}

/**
 * Set whether product reviews are enabled
 */
export async function setReviewsEnabled(value: boolean): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key: APP_SETTINGS_KEYS.REVIEWS_ENABLED },
    update: { value: String(value) },
    create: {
      key: APP_SETTINGS_KEYS.REVIEWS_ENABLED,
      value: String(value),
    },
  });
}

/**
 * Get the number of days to wait before sending a review request email
 */
export async function getReviewEmailDelayDays(): Promise<number> {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: APP_SETTINGS_KEYS.REVIEW_EMAIL_DELAY_DAYS },
  });

  return setting?.value ? parseInt(setting.value, 10) : 7;
}

/**
 * Set the number of days to wait before sending a review request email
 */
export async function setReviewEmailDelayDays(value: number): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key: APP_SETTINGS_KEYS.REVIEW_EMAIL_DELAY_DAYS },
    update: { value: String(value) },
    create: {
      key: APP_SETTINGS_KEYS.REVIEW_EMAIL_DELAY_DAYS,
      value: String(value),
    },
  });
}

/**
 * Get whether admin should be notified on new reviews
 */
export async function getNotifyOnNewReview(): Promise<boolean> {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: APP_SETTINGS_KEYS.NOTIFY_ON_NEW_REVIEW },
  });

  return setting?.value === "true";
}

/**
 * Set whether admin should be notified on new reviews
 */
export async function setNotifyOnNewReview(value: boolean): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key: APP_SETTINGS_KEYS.NOTIFY_ON_NEW_REVIEW },
    update: { value: String(value) },
    create: {
      key: APP_SETTINGS_KEYS.NOTIFY_ON_NEW_REVIEW,
      value: String(value),
    },
  });
}

/**
 * Get the active storefront theme ID
 * @returns theme ID string or null (null = default built-in theme)
 */
export async function getStorefrontTheme(): Promise<string | null> {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: APP_SETTINGS_KEYS.STOREFRONT_THEME },
  });

  return setting?.value || null;
}

/**
 * Set the active storefront theme
 * @param themeId theme ID string, or null/"default" to reset to built-in theme
 */
export async function setStorefrontTheme(
  themeId: string | null
): Promise<void> {
  if (!themeId || themeId === "default") {
    await prisma.siteSettings.deleteMany({
      where: { key: APP_SETTINGS_KEYS.STOREFRONT_THEME },
    });
    return;
  }

  await prisma.siteSettings.upsert({
    where: { key: APP_SETTINGS_KEYS.STOREFRONT_THEME },
    update: { value: themeId },
    create: {
      key: APP_SETTINGS_KEYS.STOREFRONT_THEME,
      value: themeId,
    },
  });
}

/**
 * Get the cron authentication secret
 * @returns secret string or null if not configured
 */
export async function getCronSecret(): Promise<string | null> {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: APP_SETTINGS_KEYS.CRON_SECRET },
  });

  return setting?.value || null;
}

/**
 * Set the cron authentication secret
 */
export async function setCronSecret(value: string): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key: APP_SETTINGS_KEYS.CRON_SECRET },
    update: { value },
    create: {
      key: APP_SETTINGS_KEYS.CRON_SECRET,
      value,
    },
  });
}

/**
 * Get store branding needed for outgoing emails (store name + logo URL).
 * Single query fetching both values from SiteSettings.
 * Relative URLs (e.g. /logo.svg) are resolved to absolute using APP_URL
 * so they render correctly in email clients.
 */
export async function getEmailBranding(): Promise<{
  storeName: string;
  logoUrl: string | null;
}> {
  const settings = await prisma.siteSettings.findMany({
    where: { key: { in: ["store_name", "store_logo_url"] } },
  });

  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  let logoUrl = map.store_logo_url || null;
  if (logoUrl && logoUrl.startsWith("/")) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    logoUrl = appUrl ? `${appUrl.replace(/\/$/, "")}${logoUrl}` : null;
  }

  return {
    storeName: map.store_name || "",
    logoUrl,
  };
}

/**
 * Get all app settings
 */
export async function getAppSettings() {
  const locationType = await getLocationType();
  const weightUnit = await getWeightUnit();

  return {
    locationType,
    weightUnit,
  };
}
