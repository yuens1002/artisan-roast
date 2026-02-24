import ProductCard from "@/app/(site)/_components/product/ProductCard";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { FeaturedProduct } from "@/lib/types";
import { Sparkles, TrendingUp } from "lucide-react";

interface RecommendationsSectionProps {
  products: FeaturedProduct[];
  isPersonalized: boolean;
  source: "behavioral" | "trending";
  userPreferences?: {
    preferredRoastLevel?: string;
    topTastingNotes?: string[];
  };
  personalizedHeading: string;
  trendingHeading: string;
  trendingDescription: string;
}

export default function RecommendationsSection({
  products,
  isPersonalized,
  userPreferences,
  personalizedHeading,
  trendingHeading,
  trendingDescription,
}: RecommendationsSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-muted py-12">
      <div className="mx-auto max-w-screen-2xl px-4 md:px-8">
        {/* Section Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              {isPersonalized ? (
                <div className="mt-1 shrink-0"><Sparkles className="h-6 w-6" /></div>
              ) : (
                <div className="mt-1 shrink-0"><TrendingUp className="h-6 w-6" /></div>
              )}
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                {isPersonalized ? personalizedHeading : trendingHeading}
              </h2>
            </div>
          </div>
          {isPersonalized && userPreferences && (
            <p className="text-sm text-muted-foreground mt-1">
              Based on your love for{" "}
              {userPreferences.preferredRoastLevel?.toLowerCase() +
                " roasts with"}
              {userPreferences.topTastingNotes &&
                userPreferences.topTastingNotes.length > 0 && (
                  <>
                    {" "}
                    {userPreferences.topTastingNotes
                      .slice(0, 2)
                      .join(" and ")}{" "}
                    notes
                  </>
                )}
            </p>
          )}
          {!isPersonalized && (
            <p className="text-sm text-muted-foreground mt-1">
              {trendingDescription}
            </p>
          )}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, index) => (
            <ScrollReveal key={product.id} delay={index * 0.08}>
              <ProductCard
                product={product}
                showPurchaseOptions={true}
                hoverRevealFooter={true}
                priority={index === 0}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
