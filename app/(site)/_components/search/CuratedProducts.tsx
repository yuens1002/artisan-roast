"use client";

import type { SearchDrawerCuratedProduct } from "@/lib/data";
import ProductCard from "@/app/(site)/_components/product/ProductCard";
import { ScrollReveal } from "@/components/shared/ScrollReveal";

interface CuratedProductsProps {
  heading: string;
  products: SearchDrawerCuratedProduct[];
  /**
   * When true, each card mounts inside <ScrollReveal> with an 80ms-per-
   * index stagger — same pattern as the homepage <FeaturedProducts>
   * carousel. Used by the chip-active state where products change on
   * every chip click; the static curated section + no-results fallback
   * don't pass this. `staggerKey` is used as the React key on the <ul>
   * so children remount + re-trigger their reveal when the active chip
   * changes.
   */
  staggered?: boolean;
  staggerKey?: string;
}

/**
 * Renders the curated products section in the search drawer using the
 * canonical ProductCard component (matches storefront cards visually,
 * fixes blank-image edge cases via getPlaceholderImage in ProductCard).
 *
 * Used in three states: empty, no-results fallback, and chip-active filtered.
 */
export function CuratedProducts({
  heading,
  products,
  staggered,
  staggerKey,
}: CuratedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="search-drawer-curated-heading" className="mt-12">
      <h2
        id="search-drawer-curated-heading"
        className="text-base font-semibold mb-4"
      >
        {heading}
      </h2>
      <ul
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4"
        // Re-key on staggerKey so each <li> + its inner ScrollReveal
        // remounts when the active chip changes — fresh visible=false →
        // visible=true transition rather than reusing already-revealed
        // children from the previous chip.
        key={staggered ? staggerKey : undefined}
      >
        {products.map((p, idx) => (
          <li key={p.id}>
            {staggered ? (
              <ScrollReveal delay={idx * 0.08}>
                <ProductCard product={p} />
              </ScrollReveal>
            ) : (
              <ProductCard product={p} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
