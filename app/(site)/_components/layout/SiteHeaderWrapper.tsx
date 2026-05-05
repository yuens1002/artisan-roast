import { getCategoryLabels } from "@/lib/data";
import { auth } from "@/auth";
import SiteHeader from "@/app/(site)/_components/layout/SiteHeader";
import { getPagesForHeader } from "@/app/actions";
import { getProductMenuSettings } from "@/lib/product-menu-settings";
import { getSiteMetadata } from "@/lib/site-metadata";
import { getStripeConfigStatus } from "@/lib/payments/credentials";

/**
 * SiteHeaderWrapper is a Server Component responsible for fetching global,
 * persistent data (like navigation categories and user session) needed by the SiteHeader.
 * It ensures the client component (SiteHeader) receives data as props,
 * keeping the data fetching logic on the server.
 */
export default async function SiteHeaderWrapper() {
  // Fetch all data for the navigation menu in parallel
  const [labels, session, headerPages, productMenuSettings, siteMetadata, stripeStatus] =
    await Promise.all([
      getCategoryLabels(),
      auth(),
      getPagesForHeader(),
      getProductMenuSettings(),
      getSiteMetadata(),
      getStripeConfigStatus(),
    ]);

  const stripeConfigured =
    (stripeStatus.hasSecretKey && !stripeStatus.decryptionError) ||
    !!process.env.STRIPE_SECRET_KEY;

  // Handle case where no categories are found (e.g., first deployment/empty DB)
  if (!labels || labels.length === 0) {
    return (
      <SiteHeader
        categoryGroups={{}}
        user={session?.user || null}
        pages={headerPages}
        productMenuIcon={productMenuSettings.icon}
        productMenuText={productMenuSettings.text}
        storeName={siteMetadata.storeName}
        stripeConfigured={stripeConfigured}
      />
    );
  }

  // Build groups from labels -> categories (already ordered)
  const categoryGroups = labels.reduce(
    (acc, label) => {
      acc[label.name] = label.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        order: cat.order,
      }));
      return acc;
    },
    {} as Record<
      string,
      { id: string; name: string; slug: string; order: number }[]
    >
  );

  // Build icon mapping for labels
  const labelIcons = labels.reduce(
    (acc, label) => {
      if (label.icon) {
        acc[label.name] = label.icon;
      }
      return acc;
    },
    {} as Record<string, string>
  );

  // Pass the dynamically grouped categories and pages to the client component
  return (
    <SiteHeader
      categoryGroups={categoryGroups}
      labelIcons={labelIcons}
      user={session?.user || null}
      pages={headerPages}
      productMenuIcon={productMenuSettings.icon}
      productMenuText={productMenuSettings.text}
      storeName={siteMetadata.storeName}
      stripeConfigured={stripeConfigured}
    />
  );
}
