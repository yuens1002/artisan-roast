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

  // AI section logic
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const isDemoUser = session?.user?.email === "demo@artisanroast.com";
  const showVoiceBarista = isDemoUser && !isDemoMode;

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
