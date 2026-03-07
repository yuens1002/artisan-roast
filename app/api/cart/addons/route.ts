import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import { type DiscountType } from "@prisma/client";

const DISCOUNT_CALC: Record<DiscountType, (price: number, value: number) => number> = {
  FIXED: (price, value) => Math.max(0, price - value),
  PERCENTAGE: (price, value) => Math.round(price * (1 - value / 100)),
};

function computeEffectivePrice(
  price: number,
  discountType: DiscountType | null,
  discountValue: number | null
): number {
  if (!discountType || discountValue == null) return price;
  return DISCOUNT_CALC[discountType](price, discountValue);
}

export async function POST(request: Request) {
  try {
    const { productIds } = await request.json();

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ addOns: [] });
    }

    // Filter out invalid IDs (e.g. undefined from stale cart data)
    const validIds = productIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0
    );
    if (validIds.length === 0) {
      return NextResponse.json({ addOns: [] });
    }

    const addOns = await prisma.addOnLink.findMany({
      where: {
        primaryProductId: { in: validIds },
        addOnProduct: { isDisabled: false },
        OR: [
          { addOnVariant: { stockQuantity: { gt: 0 } } },
          { addOnVariantId: null },
        ],
      },
      include: {
        addOnProduct: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            categories: {
              where: { isPrimary: true },
              include: {
                category: { select: { slug: true } },
              },
              take: 1,
            },
            variants: {
              where: { isDisabled: false },
              select: {
                id: true,
                name: true,
                stockQuantity: true,
                images: {
                  select: { url: true },
                  orderBy: { order: "asc" as const },
                  take: 1,
                },
                purchaseOptions: {
                  where: { type: "ONE_TIME" },
                  select: {
                    id: true,
                    priceInCents: true,
                    salePriceInCents: true,
                  },
                  take: 1,
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
        addOnVariant: {
          select: {
            id: true,
            name: true,
            isDisabled: true,
            images: {
              select: { url: true },
              orderBy: { order: "asc" as const },
              take: 1,
            },
            purchaseOptions: {
              where: { type: "ONE_TIME" },
              select: {
                id: true,
                priceInCents: true,
                salePriceInCents: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    const addOnMap = new Map<
      string,
      {
        product: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          imageUrl: string;
          categorySlug: string;
        };
        variant: {
          id: string;
          name: string;
          priceInCents: number;
          originalPriceInCents: number;
          purchaseOptionId: string;
        };
      }
    >();

    for (const addOn of addOns) {
      const categorySlug =
        addOn.addOnProduct.categories[0]?.category.slug || "shop";

      if (addOn.addOnVariantId === null) {
        // Expand null-variant to all in-stock variants
        const inStockVariants = addOn.addOnProduct.variants.filter(
          (v) => v.stockQuantity > 0 && v.purchaseOptions.length > 0
        );

        for (const variant of inStockVariants) {
          const key = `${addOn.addOnProduct.id}-${variant.id}`;
          if (addOnMap.has(key)) continue;

          const po = variant.purchaseOptions[0];
          const basePrice = po.salePriceInCents ?? po.priceInCents;
          const effectivePrice = computeEffectivePrice(
            basePrice,
            addOn.discountType,
            addOn.discountValue
          );

          addOnMap.set(key, {
            product: {
              id: addOn.addOnProduct.id,
              name: addOn.addOnProduct.name,
              slug: addOn.addOnProduct.slug,
              description: addOn.addOnProduct.description,
              imageUrl:
                variant.images[0]?.url ||
                getPlaceholderImage(addOn.addOnProduct.name, 400, "culture"),
              categorySlug,
            },
            variant: {
              id: variant.id,
              name: variant.name,
              priceInCents: effectivePrice,
              originalPriceInCents: po.priceInCents,
              purchaseOptionId: po.id,
            },
          });
        }
      } else {
        // Specific variant
        if (
          !addOn.addOnVariant ||
          addOn.addOnVariant.isDisabled ||
          addOn.addOnVariant.purchaseOptions.length === 0
        ) {
          continue;
        }

        const key = `${addOn.addOnProduct.id}-${addOn.addOnVariant.id}`;
        if (addOnMap.has(key)) continue;

        const po = addOn.addOnVariant.purchaseOptions[0];
        const basePrice = po.salePriceInCents ?? po.priceInCents;
        const effectivePrice = computeEffectivePrice(
          basePrice,
          addOn.discountType,
          addOn.discountValue
        );

        addOnMap.set(key, {
          product: {
            id: addOn.addOnProduct.id,
            name: addOn.addOnProduct.name,
            slug: addOn.addOnProduct.slug,
            description: addOn.addOnProduct.description,
            imageUrl:
              addOn.addOnVariant.images[0]?.url ||
              getPlaceholderImage(addOn.addOnProduct.name, 400, "culture"),
            categorySlug,
          },
          variant: {
            id: addOn.addOnVariant.id,
            name: addOn.addOnVariant.name,
            priceInCents: effectivePrice,
            originalPriceInCents: po.priceInCents,
            purchaseOptionId: po.id,
          },
        });
      }
    }

    return NextResponse.json({ addOns: Array.from(addOnMap.values()) });
  } catch (error) {
    console.error("Error fetching cart add-ons:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch add-ons",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
