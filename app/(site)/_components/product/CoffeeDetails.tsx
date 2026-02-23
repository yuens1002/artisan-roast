import { Leaf } from "lucide-react";
import { RoastLevel } from "@prisma/client";
import {
  type RoasterBrewGuide,
  BREW_METHOD_LABELS,
} from "@/lib/types/roaster-brew-guide";
import { StarRating } from "./StarRating";

const brewMethodsByRoast: Record<RoastLevel, string[]> = {
  LIGHT: ["Pour-over (V60/Chemex)", "Aeropress", "Filter"],
  MEDIUM: ["Drip", "Chemex", "Aeropress"],
  DARK: ["Espresso", "French press", "Moka"],
};

interface CoffeeDetailsProps {
  roastLevel: RoastLevel | null;
  variety: string | null;
  altitude: string | null;
  isOrganic: boolean;
  processing?: string | null;
  roasterBrewGuide?: RoasterBrewGuide | null;
  averageRating?: number | null;
  reviewCount?: number;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-foreground/50">
        {label}
      </dt>
      <dd className="mt-0.5 text-text-base">{value}</dd>
    </div>
  );
}

export function CoffeeDetails({
  roastLevel,
  variety,
  altitude,
  isOrganic,
  processing,
  roasterBrewGuide,
  averageRating,
  reviewCount = 0,
}: CoffeeDetailsProps) {
  // Priority chain: roaster-curated methods → roast-level fallback
  const brewMethods = roasterBrewGuide?.recommendedMethods?.length
    ? roasterBrewGuide.recommendedMethods.map(
        (key) => BREW_METHOD_LABELS[key] ?? key
      )
    : roastLevel
      ? brewMethodsByRoast[roastLevel]
      : null;

  return (
    <dl className="flex flex-col gap-4 pt-1 lg:pt-0">
      {isOrganic && (
        <div className="flex items-center gap-1.5 text-sm text-emerald-700">
          <Leaf className="h-4 w-4" />
          <span>Certified Organic</span>
        </div>
      )}
      {brewMethods && (
        <DetailItem label="Best For" value={brewMethods.join(", ")} />
      )}
      {variety && <DetailItem label="Variety" value={variety} />}
      {altitude && <DetailItem label="Altitude" value={altitude} />}
      {processing && <DetailItem label="Processing" value={processing} />}
      {reviewCount > 0 && averageRating != null && (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-foreground/50">
            Community
          </dt>
          <dd className="mt-0.5 flex items-center gap-1">
            <StarRating rating={averageRating} size="sm" />
            <a
              href="#reviews"
              className="text-sm text-text-muted hover:text-primary transition-colors"
            >
              ({reviewCount} Brew {reviewCount === 1 ? "Report" : "Reports"})
            </a>
          </dd>
        </div>
      )}
    </dl>
  );
}
