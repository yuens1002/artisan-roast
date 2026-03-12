import { auth } from "@/auth";
import {
  getFeaturedProducts,
  getHomeRecommendations,
  getPublicSiteSettings,
} from "@/lib/data";
import HomeAiSection from "@/app/(site)/_components/ai/HomeAiSection";
import FeaturedProducts from "@/app/(site)/_components/product/FeaturedProducts";
import RecommendationsSection from "@/app/(site)/_components/product/RecommendationsSection";

export default async function Home() {
  const [session, featuredProducts, settings] = await Promise.all([
    auth(),
    getFeaturedProducts(),
    getPublicSiteSettings(),
  ]);

  const userId = session?.user?.id;

  // Fetch recommendations (depends on userId from auth)
  const recommendations = await getHomeRecommendations(userId);

  // Voice barista disabled — VAPI is not ready for production
  const showVoiceBarista = false;

  return (
    <>
      <HomeAiSection
        showVoiceBarista={showVoiceBarista}
        userEmail={session?.user?.email || undefined}
        userName={session?.user?.name || undefined}
        isAuthenticated={!!session?.user}
      />

      <RecommendationsSection
        products={recommendations.products}
        isPersonalized={recommendations.isPersonalized}
        source={recommendations.source}
        userPreferences={recommendations.userPreferences}
        personalizedHeading={settings.homepageRecommendationsPersonalizedHeading}
        trendingHeading={settings.homepageRecommendationsTrendingHeading}
        trendingDescription={settings.homepageRecommendationsTrendingDescription}
      />

      <FeaturedProducts
        products={featuredProducts}
        heading={settings.homepageFeaturedHeading}
      />
    </>
  );
}
