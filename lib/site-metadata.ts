import { prisma } from "@/lib/prisma";

export async function getSiteMetadata() {
  const settings = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: [
          "store_name",
          "store_tagline",
          "store_description",
          "store_logo_url",
          "store_favicon_url",
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
    storeName: settingsMap.store_name || "",
    storeTagline: settingsMap.store_tagline || "",
    storeDescription: settingsMap.store_description || "",
    storeLogoUrl: settingsMap.store_logo_url || "/logo.svg",
    storeFaviconUrl: settingsMap.store_favicon_url || "/favicon.ico",
  };
}
