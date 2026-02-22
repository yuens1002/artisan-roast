"use client";

import { useEffect, useState, startTransition, useRef } from "react";
import Link from "next/link";
import { ProductType, PurchaseType } from "@prisma/client";
import {
  Product,
  ProductVariant,
  PurchaseOption,
  RelatedProduct,
  Category,
} from "@/lib/types";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import ProductCard from "@/app/(site)/_components/product/ProductCard";
import { AddOnCard } from "@/app/(site)/_components/cart/AddOnCard";
import { ScrollCarousel } from "@/components/shared/media/ScrollCarousel";
import { ImageCarousel } from "@/components/shared/media/ImageCarousel";
import { useCartStore, type CartItem } from "@/lib/store/cart-store";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useAddToCartWithFeedback } from "@/hooks/useAddToCartWithFeedback";
import { useResponsiveValue } from "@/hooks/useResponsiveValue";
import { AddOnItem } from "./actions";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import { CoffeeDetails } from "@/app/(site)/_components/product/CoffeeDetails";
import { ProductSelectionsSection } from "@/app/(site)/_components/product/ProductSelectionsSection";
import { FloatingAddToCartButton } from "@/app/(site)/_components/product/FloatingAddToCartButton";
import { RoastLevelBar } from "@/app/(site)/_components/product/RoastLevelBar";
import { ProductDetailLayout } from "@/app/(site)/_components/product/ProductDetailLayout";
import { RoasterBrewGuide } from "@/app/(site)/_components/product/RoasterBrewGuide";
import type { RoasterBrewGuide as RoasterBrewGuideType } from "@/lib/types/roaster-brew-guide";
import {
  BreadcrumbCategoryDropdown,
  type BreadcrumbProduct,
} from "@/app/(site)/_components/navigation/BreadcrumbCategoryDropdown";

interface ProductClientPageProps {
  product: Product;
  relatedProducts: RelatedProduct[];
  category: Pick<Category, "name" | "slug">;
  categoryProducts?: BreadcrumbProduct[];
  addOns: AddOnItem[];
}

const getOneTimeOption = (variant: ProductVariant): PurchaseOption | null =>
  variant.purchaseOptions.find((p) => p.type === "ONE_TIME") ?? null;

const getSubscriptionOptions = (variant: ProductVariant): PurchaseOption[] =>
  variant.purchaseOptions.filter((p) => p.type === "SUBSCRIPTION");

const getSubscriptionDisplayOption = (
  variant: ProductVariant,
  selectedId?: string | null
): PurchaseOption | null => {
  const options = getSubscriptionOptions(variant);
  if (!options.length) return null;
  if (selectedId) {
    const matched = options.find((option) => option.id === selectedId);
    if (matched) return matched;
  }
  return options[0];
};

const getPreferredPurchaseOption = (
  variant: ProductVariant,
  cartItems: CartItem[],
  productId: string
): PurchaseOption | null => {
  if (!variant.purchaseOptions.length) return null;

  const hasSubscriptionInCart = cartItems.some(
    (item) =>
      item.productId === productId &&
      item.variantId === variant.id &&
      item.purchaseType === "SUBSCRIPTION"
  );

  const oneTimeOption = getOneTimeOption(variant);
  const subscriptionOptions = getSubscriptionOptions(variant);

  // If there's a subscription in cart and a one-time option exists, prefer one-time
  if (hasSubscriptionInCart && oneTimeOption) return oneTimeOption;

  // If there's no one-time option and subscriptions exist, default to first subscription
  if (!oneTimeOption && subscriptionOptions.length > 0)
    return subscriptionOptions[0];

  // Otherwise prefer one-time or fallback to first option
  return oneTimeOption ?? variant.purchaseOptions[0];
};

const getDiscountMessage = (
  variant: ProductVariant,
  subscriptionOption: PurchaseOption
): string | null => {
  if (subscriptionOption.type !== "SUBSCRIPTION") return null;
  const oneTimeOption = getOneTimeOption(variant);
  if (!oneTimeOption) return null;

  const oneTimeEffective = oneTimeOption.salePriceInCents ?? oneTimeOption.priceInCents;
  const subEffective = subscriptionOption.salePriceInCents ?? subscriptionOption.priceInCents;
  const savings = oneTimeEffective - subEffective;
  if (savings <= 0) return null;

  const discountPercent = Math.round(
    (savings / oneTimeEffective) * 100
  );
  if (discountPercent <= 0) return null;

  return `Save ${discountPercent}% with subscription`;
};

export default function ProductClientPage({
  product,
  relatedProducts,
  category,
  categoryProducts = [],
  addOns,
}: ProductClientPageProps) {
  const { settings } = useSiteSettings();
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const { trackActivity } = useActivityTracking();
  const {
    buttonState,
    isCheckingOut,
    handleAddToCart: handleAddToCartWithFeedback,
    handleActionClick,
  } = useAddToCartWithFeedback();

  // Ref for floating button visibility detection
  const inlineButtonRef = useRef<HTMLDivElement>(null);

  const initialVariant = product.variants[0];
  const initialPurchaseOption = getPreferredPurchaseOption(
    initialVariant,
    cartItems,
    product.id
  );
  const [selectedVariant, setSelectedVariant] = useState(initialVariant);
  const [selectedPurchaseOption, setSelectedPurchaseOption] =
    useState<PurchaseOption | null>(initialPurchaseOption);
  const [quantity, setQuantity] = useState(1);
  const [selectedSubscriptionOptionId, setSelectedSubscriptionOptionId] =
    useState<string | null>(
      initialPurchaseOption?.type === "SUBSCRIPTION"
        ? initialPurchaseOption.id
        : null
    );

  // Fallback recommendations when relatedProducts is empty
  const [fallbackProducts, setFallbackProducts] = useState<RelatedProduct[]>([]);

  useEffect(() => {
    trackActivity({
      activityType: "PRODUCT_VIEW",
      productId: product.id,
    });
  }, [product.id, trackActivity]);

  // Fetch fallback recommendations when relatedProducts is empty
  useEffect(() => {
    if (relatedProducts.length === 0 && fallbackProducts.length === 0) {
      fetch(`/api/recommendations?limit=4&exclude=${product.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.products?.length) {
            setFallbackProducts(data.products);
          }
        })
        .catch((err) => console.error("Failed to fetch recommendations:", err));
    }
  }, [relatedProducts.length, product.id, fallbackProducts.length]);

  // Auto-select subscription when it's the only option
  useEffect(() => {
    const oneTimeOpt = getOneTimeOption(selectedVariant);
    const subscriptionOpts = getSubscriptionOptions(selectedVariant);

    // If no one-time option and subscriptions exist, ensure subscription is selected
    if (!oneTimeOpt && subscriptionOpts.length > 0) {
      if (
        !selectedPurchaseOption ||
        selectedPurchaseOption.type !== "SUBSCRIPTION"
      ) {
        startTransition(() => {
          setSelectedPurchaseOption(subscriptionOpts[0]);
          setSelectedSubscriptionOptionId(subscriptionOpts[0].id);
        });
      }
    }
  }, [selectedVariant, selectedPurchaseOption]);

  const hasSubscriptionInCart = cartItems.some(
    (item) =>
      item.productId === product.id &&
      item.variantId === selectedVariant.id &&
      item.purchaseType === "SUBSCRIPTION"
  );

  // Use variant images, fall back to first variant's images, then placeholder
  const placeholderCategory = product.type === ProductType.MERCH ? "culture" : "beans";
  const variantImages = selectedVariant.images ?? [];
  const fallbackImages = product.variants[0]?.images ?? [];
  const resolvedImages = variantImages.length > 0 ? variantImages : fallbackImages;
  const firstImage = resolvedImages[0];
  const displayImage =
    firstImage?.url || getPlaceholderImage(product.name, 800, placeholderCategory);
  const altText =
    firstImage?.altText || (product.type === ProductType.MERCH ? product.name : `A bag of ${product.name} coffee`);
  const galleryImages =
    resolvedImages.length > 0
      ? resolvedImages.map((img) => ({ url: img.url, alt: img.altText }))
      : [{ url: displayImage, alt: altText }];
  const showThumbs = galleryImages.length > 1;

  const handleVariantChange = (variantId: string) => {
    const newVariant = product.variants.find((v) => v.id === variantId)!;
    setSelectedVariant(newVariant);

    const preferredOption = getPreferredPurchaseOption(
      newVariant,
      cartItems,
      product.id
    );

    setSelectedPurchaseOption(preferredOption);
    setSelectedSubscriptionOptionId(
      preferredOption?.type === "SUBSCRIPTION" ? preferredOption.id : null
    );
  };

  const handlePurchaseTypeChange = (value: string) => {
    if (!selectedVariant.purchaseOptions.length) return;

    if (value === "SUBSCRIPTION") {
      if (hasSubscriptionInCart) return;
      const subscriptionOptions = getSubscriptionOptions(selectedVariant);
      if (subscriptionOptions.length > 0) {
        setSelectedPurchaseOption(subscriptionOptions[0]);
        setSelectedSubscriptionOptionId(subscriptionOptions[0].id);
      }
      return;
    }

    const oneTimeOption = getOneTimeOption(selectedVariant);
    if (oneTimeOption) {
      setSelectedPurchaseOption(oneTimeOption);
      setSelectedSubscriptionOptionId(null);
    }
  };

  const handleSubscriptionCadenceChange = (optionId: string) => {
    const option = selectedVariant.purchaseOptions.find(
      (p) => p.id === optionId
    );
    if (!option) return;
    setSelectedPurchaseOption(option);
    setSelectedSubscriptionOptionId(optionId);
  };

  const handleAddToCart = () => {
    if (!selectedPurchaseOption) return;
    const isAddingSubscription = selectedPurchaseOption.type === "SUBSCRIPTION";

    // Use the hook for cart-aware feedback
    handleAddToCartWithFeedback(
      {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        categorySlug: category.slug,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
        purchaseOptionId: selectedPurchaseOption.id,
        purchaseType: selectedPurchaseOption.type,
        priceInCents: selectedPurchaseOption.salePriceInCents ?? selectedPurchaseOption.priceInCents,
        originalPriceInCents: selectedPurchaseOption.salePriceInCents
          ? selectedPurchaseOption.priceInCents
          : undefined,
        imageUrl: displayImage,
        billingInterval: selectedPurchaseOption.billingInterval || undefined,
        billingIntervalCount:
          selectedPurchaseOption.billingIntervalCount || undefined,
      },
      quantity
    );

    trackActivity({ activityType: "ADD_TO_CART", productId: product.id });

    if (isAddingSubscription) {
      const oneTimeOption = selectedVariant.purchaseOptions.find(
        (p) => p.type === "ONE_TIME"
      );
      if (oneTimeOption) {
        setSelectedPurchaseOption(oneTimeOption);
        setSelectedSubscriptionOptionId(null);
      }
    }
  };

  const handleAddOnToCart = (addOn: AddOnItem) => {
    if (!selectedPurchaseOption) return;
    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      categorySlug: category.slug,
      purchaseOptionId: selectedPurchaseOption.id,
      purchaseType: selectedPurchaseOption.type as PurchaseType,
      priceInCents: selectedPurchaseOption.salePriceInCents ?? selectedPurchaseOption.priceInCents,
      originalPriceInCents: selectedPurchaseOption.salePriceInCents
        ? selectedPurchaseOption.priceInCents
        : undefined,
      imageUrl: displayImage,
      quantity,
    });

    trackActivity({ activityType: "ADD_TO_CART", productId: product.id });

    // Add-on item is added by AddOnCard's useAddToCartWithFeedback hook
    trackActivity({ activityType: "ADD_TO_CART", productId: addOn.product.id });
  };

  const isCoffee = product.type === ProductType.COFFEE;

  const oneTimeOption = getOneTimeOption(selectedVariant);
  const subscriptionOptions = getSubscriptionOptions(selectedVariant);
  const subscriptionDisplayOption = getSubscriptionDisplayOption(
    selectedVariant,
    selectedPurchaseOption?.type === "SUBSCRIPTION"
      ? selectedPurchaseOption.id
      : selectedSubscriptionOptionId
  );

  const subscriptionDiscountMessage = subscriptionDisplayOption
    ? getDiscountMessage(selectedVariant, subscriptionDisplayOption)
    : null;

  // Responsive slides per view for carousels
  const relatedSlidesPerView = useResponsiveValue(
    { 768: 2.5, 1024: 3, 1280: 4 }, 1.5
  );
  // Bundle carousel: 1.3 on mobile (full-width), 1 at md (narrow 2-col), 1.3 at lg, 1.5 at xl
  const bundleSlidesPerView = useResponsiveValue(
    { 768: 1, 1024: 1.3, 1280: 1.5 }, 1.3
  );

  const hasMerchDetails =
    !isCoffee &&
    Array.isArray(product.details) &&
    product.details.length > 0;
  const hasDetails = isCoffee || hasMerchDetails;

  // Build related products display
  const displayProducts = relatedProducts.length > 0 ? relatedProducts : fallbackProducts;

  return (
    <ProductDetailLayout
      breadcrumb={
        <Breadcrumb className="mb-4 md:mb-5">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbCategoryDropdown
                categoryName={category.name}
                categorySlug={category.slug}
                products={categoryProducts}
              />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      gallery={
        <ImageCarousel
          key={selectedVariant.id}
          images={galleryImages}
          aspectRatio="square"
          showThumbnails={showThumbs}
          showDots={true}
        />
      }
      header={
        <>
          {isCoffee && product.origin.length > 0 && (
            <p className="text-xs font-medium uppercase tracking-widest text-text-muted">
              {product.origin.join(" + ")}
            </p>
          )}

          <h1 className={`text-4xl font-bold text-text-base ${isCoffee && product.origin.length > 0 ? "-mt-2" : ""}`}>
            {product.name}
          </h1>

          {isCoffee && (
            <div className="flex flex-col gap-2 -mt-1">
              {product.roastLevel && (
                <RoastLevelBar roastLevel={product.roastLevel} />
              )}

              {product.tastingNotes.length > 0 && (
                <span className="text-lg text-text-muted italic">
                  {product.tastingNotes.join(", ")}
                </span>
              )}
            </div>
          )}
        </>
      }
      hasDetails={hasDetails}
      details={
        hasDetails ? (
          isCoffee ? (
            <CoffeeDetails
              roastLevel={product.roastLevel}
              variety={product.variety}
              altitude={product.altitude}
              isOrganic={product.isOrganic}
              processing={product.processing}
              roasterBrewGuide={product.roasterBrewGuide as unknown as RoasterBrewGuideType | null}
            />
          ) : (
            <dl className="space-y-3">
              {(
                product.details as Array<{
                  label: string;
                  value: string;
                }>
              ).map((detail, i) => (
                <div key={i}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                    {detail.label}
                  </dt>
                  <dd className="text-sm text-text-base">
                    {detail.value}
                  </dd>
                </div>
              ))}
            </dl>
          )
        ) : undefined
      }
      purchaseControlsRef={inlineButtonRef}
      purchaseControls={
        <ProductSelectionsSection
          product={product}
          selectedVariant={selectedVariant}
          selectedPurchaseOption={selectedPurchaseOption}
          selectedSubscriptionOptionId={selectedSubscriptionOptionId}
          quantity={quantity}
          hasSubscriptionInCart={hasSubscriptionInCart}
          oneTimeOption={oneTimeOption}
          subscriptionOptions={subscriptionOptions}
          subscriptionDisplayOption={subscriptionDisplayOption}
          subscriptionDiscountMessage={subscriptionDiscountMessage}
          onVariantChange={handleVariantChange}
          onPurchaseTypeChange={handlePurchaseTypeChange}
          onSubscriptionCadenceChange={handleSubscriptionCadenceChange}
          onQuantityChange={setQuantity}
          onAddToCart={handleAddToCart}
          onActionClick={handleActionClick}
          buttonState={buttonState}
          isProcessing={isCheckingOut}
          spacing="3"
        />
      }
      story={
        product.description ? (
          <div className="lg:mt-4">
            {product.heading && (
              <h2 className="text-xs font-medium uppercase tracking-wide text-foreground/50 mb-1">
                {product.heading}
              </h2>
            )}
            <p className="text-text-base leading-relaxed">
              {product.description}
            </p>
          </div>
        ) : undefined
      }
      brewGuide={
        isCoffee && product.roasterBrewGuide ? (
          <RoasterBrewGuide
            guide={product.roasterBrewGuide as unknown as RoasterBrewGuideType}
          />
        ) : undefined
      }
      addOns={
        addOns.length > 0 ? (
          <div className="mt-4">
            <h2 className="text-lg font-bold text-left text-text-base mb-6">
              {settings.productAddOnsSectionTitle}
            </h2>

            <ScrollCarousel slidesPerView={bundleSlidesPerView} gap="gap-2" noBorder>
              {addOns.map((addOn) => (
                <AddOnCard
                  key={`${addOn.product.id}-${addOn.variant.id}`}
                  addOn={addOn}
                  weightUnit="g"
                  onAddToCart={() => handleAddOnToCart(addOn)}
                />
              ))}
            </ScrollCarousel>
          </div>
        ) : undefined
      }
      relatedProducts={
        displayProducts.length > 0 ? (
          <div className="my-16">
            <Separator className="my-12" />
            <h2 className="text-3xl font-bold text-center text-text-base mb-12">
              {settings.productRelatedHeading}
            </h2>
            <ScrollCarousel
              slidesPerView={relatedSlidesPerView}
              gap="gap-4"
              noBorder
            >
              {displayProducts.map((relatedProduct) => (
                <div key={relatedProduct.id}>
                  <ProductCard product={relatedProduct} disableCardEffects compact />
                </div>
              ))}
            </ScrollCarousel>
          </div>
        ) : undefined
      }
      floatingButton={
        <FloatingAddToCartButton
          inlineButtonRef={inlineButtonRef}
          buttonState={buttonState}
          onAddToCart={handleAddToCart}
          onActionClick={handleActionClick}
          disabled={!selectedPurchaseOption || selectedVariant.stockQuantity <= 0}
          isProcessing={isCheckingOut}
        />
      }
    />
  );
}
