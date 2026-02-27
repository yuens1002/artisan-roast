export interface SiteSettings {
  storeName: string;
  storeTagline: string;
  storeDescription: string;
  storeLogoUrl: string;
  contactEmail: string;
  // Marketing Content
  homepageFeaturedHeading: string;
  homepageRecommendationsTrendingHeading: string;
  homepageRecommendationsTrendingDescription: string;
  homepageRecommendationsPersonalizedHeading: string;
  homepageRecommendationsExploreAllText: string;
  footerCategoriesHeading: string;
  footerQuickLinksHeading: string;
  productRelatedHeading: string;
  // Add-ons Section Titles
  productAddOnsSectionTitle: string;
  cartAddOnsSectionTitle: string;
}

export const defaultSettings: SiteSettings = {
  storeName: "",
  storeTagline: "",
  storeDescription: "",
  storeLogoUrl: "/logo.svg",
  contactEmail: "",
  // Marketing Content defaults
  homepageFeaturedHeading: "Our Small Batch Collection",
  homepageRecommendationsTrendingHeading: "Trending Now",
  homepageRecommendationsTrendingDescription:
    "Discover what other coffee lovers are enjoying",
  homepageRecommendationsPersonalizedHeading: "Recommended For You",
  homepageRecommendationsExploreAllText: "Explore All Coffees",
  footerCategoriesHeading: "Coffee Selection",
  footerQuickLinksHeading: "Quick Links",
  productRelatedHeading: "You Might Also Like",
  // Add-ons defaults
  productAddOnsSectionTitle: "Save on a Bundle",
  cartAddOnsSectionTitle: "You May Also Like",
};

/** Maps a DB key-value record to a SiteSettings object with defaults */
export function mapSettingsRecord(
  record: Record<string, string>
): SiteSettings {
  return {
    storeName: record.store_name || defaultSettings.storeName,
    storeTagline: record.store_tagline || defaultSettings.storeTagline,
    storeDescription:
      record.store_description || defaultSettings.storeDescription,
    storeLogoUrl: record.store_logo_url || defaultSettings.storeLogoUrl,
    contactEmail: record.contactEmail || defaultSettings.contactEmail,
    homepageFeaturedHeading:
      record.homepage_featured_heading ||
      defaultSettings.homepageFeaturedHeading,
    homepageRecommendationsTrendingHeading:
      record.homepage_recommendations_trending_heading ||
      defaultSettings.homepageRecommendationsTrendingHeading,
    homepageRecommendationsTrendingDescription:
      record.homepage_recommendations_trending_description ||
      defaultSettings.homepageRecommendationsTrendingDescription,
    homepageRecommendationsPersonalizedHeading:
      record.homepage_recommendations_personalized_heading ||
      defaultSettings.homepageRecommendationsPersonalizedHeading,
    homepageRecommendationsExploreAllText:
      record.homepage_recommendations_explore_all_text ||
      defaultSettings.homepageRecommendationsExploreAllText,
    footerCategoriesHeading:
      record.footer_categories_heading ||
      defaultSettings.footerCategoriesHeading,
    footerQuickLinksHeading:
      record.footer_quick_links_heading ||
      defaultSettings.footerQuickLinksHeading,
    productRelatedHeading:
      record.product_related_heading || defaultSettings.productRelatedHeading,
    productAddOnsSectionTitle:
      record.product_addons_section_title ||
      defaultSettings.productAddOnsSectionTitle,
    cartAddOnsSectionTitle:
      record.cart_addons_section_title ||
      defaultSettings.cartAddOnsSectionTitle,
  };
}
