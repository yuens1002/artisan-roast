"use client";

import { useAddToCartWithFeedback } from "@/hooks/useAddToCartWithFeedback";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import { ProductCardProps } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { ProductType } from "@prisma/client";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "./AddToCartButton";
import { RoastLevelBar } from "./RoastLevelBar";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// --- Product Card Component ---
export default function ProductCard({
  product,
  showPurchaseOptions = true,
  disableCardEffects = false,
  categorySlug,
  priority = false,
  cardPaddingClass,
  hidePrice = false,
  hidePriceOnMobile = false,
  hoverRevealFooter = false,
  compact = false,
  sizes = "(max-width: 768px) calc(100vw - 2rem), (max-width: 1200px) calc(50vw - 2rem), 400px",
}: Omit<ProductCardProps, "onAddToCart"> & {
  categorySlug?: string;
  priority?: boolean;
  hidePrice?: boolean;
  /** Hide price on mobile/sm breakpoints only (for carousel context) */
  hidePriceOnMobile?: boolean;
  /** On lg+, hide footer and reveal on card hover with slide-up fade-in */
  hoverRevealFooter?: boolean;
  /** Smaller title and notes for carousel contexts */
  compact?: boolean;
  /** Custom sizes attribute for responsive image loading */
  sizes?: string;
}) {
  const { buttonState, isCheckingOut, handleAddToCart, handleActionClick } =
    useAddToCartWithFeedback();

  // --- Find price and image ---
  const displayVariant = product.variants[0];
  const oneTimePrice = displayVariant?.purchaseOptions.find(
    (p) => p.type === "ONE_TIME"
  );
  const effectivePrice = oneTimePrice
    ? (oneTimePrice.salePriceInCents ?? oneTimePrice.priceInCents)
    : null;
  const hasSalePrice = oneTimePrice?.salePriceInCents != null;
  const displayPrice = effectivePrice
    ? (effectivePrice / 100).toFixed(2)
    : "N/A";

  // Use product name as seed for consistent placeholder image selection
  // Merch products use culture images (cups, equipment), coffee products use bean images
  const placeholderCategory = product.type === ProductType.MERCH ? "culture" : "beans";
  const firstVariantImage = product.variants[0]?.images?.[0];
  const displayImage =
    firstVariantImage?.url || getPlaceholderImage(product.name, 800, placeholderCategory);
  const altText =
    firstVariantImage?.altText || (product.type === ProductType.MERCH ? product.name : `A bag of ${product.name} coffee`);

  // Canonical product URL with optional ?from= to preserve navigation context
  const productUrl = categorySlug
    ? `/products/${product.slug}?from=${encodeURIComponent(categorySlug)}`
    : `/products/${product.slug}`;

  const handleAdd = () => {
    if (displayVariant && oneTimePrice) {
      handleAddToCart({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        categorySlug,
        variantId: displayVariant.id,
        variantName: displayVariant.name,
        purchaseOptionId: oneTimePrice.id,
        purchaseType: "ONE_TIME",
        priceInCents: oneTimePrice.salePriceInCents ?? oneTimePrice.priceInCents,
        imageUrl: displayImage,
      });
    }
  };

  const handleAction = async () => {
    await handleActionClick();
  };

  return (
    <Link
      href={productUrl}
      className="rounded-lg"
      aria-label={`View ${product.name} product page`}
    >
      <Card
        className={clsx(
          "w-full overflow-hidden rounded-none bg-transparent flex flex-col justify-between border-0 shadow-none gap-0",
          cardPaddingClass ? cardPaddingClass : "p-0",
          !disableCardEffects && "cursor-pointer",
          hoverRevealFooter && "group"
        )}
      >
        {/* 1. Image container. The parent <Card> clips its top corners. */}
        <CardHeader className="relative w-full aspect-square rounded-t-lg p-0 overflow-hidden">
          <Image
            src={displayImage}
            alt={altText}
            fill
            className="object-cover"
            sizes={sizes}
            priority={priority}
            fetchPriority={priority ? "high" : undefined}
          />
        </CardHeader>

        {/* 2. CardContent holds all text content. */}
        <div className="@container/card border-x border-b rounded-b-lg">
          <CardContent className="grow py-4 min-h-28">
            <CardTitle className={cn("overflow-hidden text-ellipsis whitespace-nowrap p-0", compact ? "text-base" : "text-xl")}>
              {product.name}
            </CardTitle>
            {product.type === ProductType.COFFEE && product.roastLevel && (
              <RoastLevelBar roastLevel={product.roastLevel} className="pt-1.5" />
            )}
            {product.type === ProductType.COFFEE &&
              product.tastingNotes.length > 0 && (
                <CardDescription className={cn("italic pt-1 overflow-hidden text-ellipsis whitespace-nowrap", compact ? "text-xs" : "text-sm")}>
                  {product.tastingNotes.join(", ")}
                </CardDescription>
              )}
            {product.type !== ProductType.COFFEE && product.description && (
              <CardDescription className={cn("pt-1 line-clamp-2", compact ? "text-xs" : "text-sm")}>
                {product.description}
              </CardDescription>
            )}
          </CardContent>

          {/* 3. CardFooter (only shows if purchase options are enabled) */}
          {showPurchaseOptions && (
            <CardFooter
              className={clsx(
                "pb-6 flex items-center",
                compact && hidePrice
                  ? "justify-center"
                  : compact && hidePriceOnMobile
                    ? "justify-center md:justify-between"
                    : "justify-between",
                hoverRevealFooter &&
                  "hidden md:flex lg:opacity-0 lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 transition-all duration-300 ease-out"
              )}
            >
              <AddToCartButton
                buttonState={buttonState}
                onAddToCart={handleAdd}
                onActionClick={handleAction}
                disabled={!displayVariant || !oneTimePrice}
                isProcessing={isCheckingOut}
                containerAware
                className="cursor-pointer @max-[300px]/card:text-xs @max-[300px]/card:h-8 @max-[300px]/card:px-2.5"
              />
              {!hidePrice && (
                <div className={cn(
                  "text-right",
                  hidePriceOnMobile ? "hidden md:block" : "",
                )}>
                  {hasSalePrice && oneTimePrice ? (
                    <div>
                      {/* Vertical stack (compact, < 300px) */}
                      <div className="@min-[300px]/card:hidden">
                        <p className="text-xs text-muted-foreground line-through">
                          ${formatPrice(oneTimePrice.priceInCents)}
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          ${displayPrice}
                        </p>
                      </div>
                      {/* Horizontal (>= 300px) */}
                      <div className="hidden @min-[300px]/card:flex items-center gap-2">
                        <p className="text-sm text-muted-foreground line-through">
                          ${formatPrice(oneTimePrice.priceInCents)}
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          ${displayPrice}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="font-bold text-foreground @max-[300px]/card:text-sm @min-[300px]/card:text-lg">
                      ${displayPrice}
                    </p>
                  )}
                </div>
              )}
            </CardFooter>
          )}
        </div>
      </Card>
    </Link>
  );
}
