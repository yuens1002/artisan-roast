"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X, MoveRight } from "lucide-react";
import { ProductType } from "@prisma/client";
import { RoastLevelBar } from "@/app/(site)/_components/product/RoastLevelBar";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import type { SearchDrawerConfig } from "@/lib/data";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import { useSearchDrawerStore } from "./store";
import { useSearchIndex, type SearchProduct } from "./hooks/useSearchIndex";
import { useSearchAnalytics } from "./hooks/useSearchAnalytics";
import { CuratedCategoryChips } from "./CuratedCategoryChips";
import { CuratedProducts } from "./CuratedProducts";

interface SearchDrawerProps {
  config: SearchDrawerConfig;
}

/**
 * Search drawer overlay. Right-anchored slide-in (vaul), full-height. Same
 * shell shape as the cart drawer for visual consistency.
 *
 * Body states (mutually exclusive — last action wins between chip + query):
 * - Empty: no query, no chip → chips + curated products
 * - Chip active: chip clicked, no query → chips (active highlighted) + that
 *   category's products
 * - Results: query typed → chips + result cards
 * - No-results: query, zero matches → chips + "No results" + curated fallback
 */
export function SearchDrawer({ config }: SearchDrawerProps) {
  const isOpen = useSearchDrawerStore((s) => s.isOpen);
  const close = useSearchDrawerStore((s) => s.close);
  const activeChipSlug = useSearchDrawerStore((s) => s.activeChipSlug);
  const setActiveChipSlug = useSearchDrawerStore((s) => s.setActiveChipSlug);
  // `query` lives in the store so it clears synchronously when the drawer
  // closes — local component state would persist across open/close cycles
  // and surface a stale query when the user reopens the drawer.
  const query = useSearchDrawerStore((s) => s.query);
  const setQuery = useSearchDrawerStore((s) => s.setQuery);

  const { status, products, search } = useSearchIndex(isOpen);
  useSearchAnalytics(query, isOpen);
  const results = search(query);
  const hasQuery = query.trim().length > 0;

  const curatedHeading = config.curatedCategoryName ?? "Featured";

  // Chip and query are mutually exclusive: typing clears the active chip,
  // clicking a chip clears the typed query. Clicking the active chip again
  // toggles it off (returns to empty state).
  const handleChipClick = (slug: string) => {
    if (activeChipSlug === slug) {
      setActiveChipSlug(null);
      return;
    }
    setActiveChipSlug(slug);
    setQuery("");
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value && activeChipSlug) {
      setActiveChipSlug(null);
    }
  };

  // Filter the already-loaded MiniSearch index for the active chip's category.
  // No network round trip — products are in memory once the index has loaded.
  // `.some()` matches any attached category (primary or secondary) so a chip
  // for "Medium Roast" or "Central America" works even when those aren't the
  // product's primary category. The /api/search/index endpoint loads ALL
  // category attachments specifically for this filter.
  const activeChipProducts = useMemo(() => {
    if (!activeChipSlug) return [];
    return products.filter((p) =>
      p.categories.some((c) => c.category.slug === activeChipSlug)
    );
  }, [products, activeChipSlug]);
  const activeChipName =
    activeChipSlug != null
      ? config.chips.find((c) => c.slug === activeChipSlug)?.name ?? ""
      : "";
  const showChipResults = activeChipSlug != null && !hasQuery;

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && close()}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent
        className="right-0 top-0 bottom-0 h-screen w-full md:w-[80vw] rounded-none border-l p-0 gap-0"
      >
        <DrawerTitle className="sr-only">Search products</DrawerTitle>
        <DrawerDescription className="sr-only">
          Search for coffee, brewing equipment, and more.
        </DrawerDescription>

        <div
          className="flex flex-col h-full overflow-hidden"
          // Event-delegated close-on-link-click — closes the drawer
          // whenever a link inside the body is clicked (search result,
          // curated card, chip-active card). Works for cross-route AND
          // same-route navigations (the latter wouldn't trigger a
          // pathname-based close, since pathname doesn't change).
          onClick={(e) => {
            const anchor = (e.target as HTMLElement).closest("a[href]");
            if (anchor) close();
          }}
        >
          {/* Search input row — no border-bottom; close anchor on the right edge */}
          <div className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search products…"
                className="pl-10 pr-10 h-11 text-base"
                autoFocus
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                aria-label="Search products"
                aria-controls="search-drawer-results"
              />
              {hasQuery && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              className="flex items-center justify-center text-foreground hover:text-primary transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close search"
            >
              <MoveRight className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div
            id="search-drawer-results"
            className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8"
            aria-busy={status === "loading"}
          >
            {status === "loading" && !hasQuery && (
              <LoadingSkeleton />
            )}
            {status === "error" && (
              <p className="text-sm text-destructive mb-6" role="alert">
                Search is temporarily unavailable. You can still browse via the
                categories below.
              </p>
            )}

            {/* Chips persist across empty / results / no-results / chip-active states */}
            {status !== "loading" && config.chips.length > 0 && (
              <CuratedCategoryChips
                heading={config.chipsHeading}
                chips={config.chips}
                activeChipSlug={activeChipSlug}
                onChipClick={handleChipClick}
              />
            )}

            {status !== "loading" && showChipResults && (
              <div className={config.chips.length > 0 ? "mt-8" : ""}>
                <CuratedProducts
                  heading={activeChipName}
                  products={activeChipProducts}
                  staggered
                  staggerKey={activeChipSlug ?? undefined}
                />
                {activeChipProducts.length === 0 && (
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    No products in this category yet.
                  </p>
                )}
              </div>
            )}

            {status !== "loading" && !hasQuery && !showChipResults && (
              <EmptyState
                hasChips={config.chips.length > 0}
                curatedHeading={curatedHeading}
                curatedProducts={config.curatedProducts}
              />
            )}

            {hasQuery && (
              <ResultsOrNoResults
                results={results}
                query={query}
                curatedHeading={curatedHeading}
                curatedProducts={config.curatedProducts}
                hasChips={config.chips.length > 0}
              />
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function EmptyState({
  hasChips,
  curatedHeading,
  curatedProducts,
}: {
  hasChips: boolean;
  curatedHeading: string;
  curatedProducts: SearchDrawerConfig["curatedProducts"];
}) {
  // First-time admin state: nothing configured. Show a hint instead of empty space.
  // Chips are rendered separately above by the parent.
  if (!hasChips && curatedProducts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Type a product name, origin, or tasting note to search.
      </p>
    );
  }

  return <CuratedProducts heading={curatedHeading} products={curatedProducts} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div>
        <div className="h-5 w-32 bg-muted rounded animate-pulse mb-4" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 w-24 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      </div>
      <div>
        <div className="h-5 w-32 bg-muted rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square bg-muted rounded-md animate-pulse" />
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/4 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultsOrNoResults({
  results,
  query,
  curatedHeading,
  curatedProducts,
  hasChips,
}: {
  results: ReturnType<ReturnType<typeof useSearchIndex>["search"]>;
  query: string;
  curatedHeading: string;
  curatedProducts: SearchDrawerConfig["curatedProducts"];
  hasChips: boolean;
}) {
  // Note: chips are rendered above by the parent and persist across states.
  // Add top spacing here when chips are present so the section header doesn't
  // bump up against the chip row.
  const topSpacingClass = hasChips ? "mt-8" : "";

  if (results.length === 0) {
    return (
      <div aria-live="polite" className={topSpacingClass}>
        <p className="text-base mb-2">
          No results found for{" "}
          <span className="font-semibold">&ldquo;{query}&rdquo;</span>
        </p>
        {curatedProducts.length > 0 && (
          <p className="text-sm text-muted-foreground mb-8">
            In the meantime, check out our {curatedHeading.toLowerCase()}.
          </p>
        )}
        <CuratedProducts heading={curatedHeading} products={curatedProducts} />
      </div>
    );
  }

  return (
    <div className={topSpacingClass}>
      <p
        className="text-sm text-muted-foreground mb-4"
        aria-live="polite"
      >
        Results for{" "}
        <span className="font-medium">&ldquo;{query}&rdquo;</span>
      </p>
      <ul
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        // Re-key the list on query change so fade-in animation re-fires
        key={query}
      >
        {results.map((p, idx) => (
          <li
            key={p.id}
            className="animate-in fade-in-0 duration-300"
            style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "both" }}
          >
            <SearchResultCard product={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Compact horizontal mini-card for search results — image + name + secondary
 * lines. Coffee shows the RoastLevelBar (matches ProductCard's treatment) and
 * tasting notes in italic; merch shows the description (line-clamp-2). Both
 * variants share the same outer dimensions — the image (64px) sets the row
 * height, and the text container fills the same space regardless of type.
 */
function SearchResultCard({ product: p }: { product: SearchProduct }) {
  const isCoffee = p.type === ProductType.COFFEE;
  const firstImage = p.variants[0]?.images[0];
  const imageUrl =
    firstImage?.url ??
    getPlaceholderImage(p.name, 200, isCoffee ? "beans" : "culture");
  const altText =
    firstImage?.altText ?? (isCoffee ? `A bag of ${p.name} coffee` : p.name);

  return (
    <Link
      href={`/products/${p.slug}`}
      className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow"
    >
      <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={altText}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{p.name}</p>
        {isCoffee && p.roastLevel && (
          <RoastLevelBar roastLevel={p.roastLevel} className="pt-1" />
        )}
        {isCoffee && p.tastingNotes.length > 0 && (
          <p className="italic text-xs text-muted-foreground truncate pt-0.5">
            {p.tastingNotes.join(", ")}
          </p>
        )}
        {!isCoffee && p.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
            {p.description}
          </p>
        )}
      </div>
    </Link>
  );
}
