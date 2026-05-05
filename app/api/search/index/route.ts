import { NextResponse } from "next/server";
import { PRODUCT_LIST_ORDER_BY } from "@/lib/catalog-sort";
import { prisma } from "@/lib/prisma";

/**
 * Returns the catalog index for client-side search (consumed by the search drawer).
 * Includes both COFFEE and MERCH products. Cached briefly via Cache-Control headers.
 *
 * Shape mirrors FeaturedProduct (productCardIncludes) so the drawer can render
 * each result through the canonical `<ProductCard product={p} />`. The one
 * deliberate divergence from productCardIncludes: `categories` is loaded WITHOUT
 * the `isPrimary: true` filter so the drawer's chip filter can match any
 * attached category (Roast, Taste, Region) — not only the primary. Categories
 * are sorted `isPrimary: desc` so `categories[0]` remains the primary, keeping
 * ProductCard's URL routing canonical. Adds ~6 KB to this single fetch; other
 * surfaces using productCardIncludes are unaffected.
 */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isDisabled: false },
      include: {
        variants: {
          where: { isDisabled: false },
          orderBy: { order: "asc" },
          include: {
            images: {
              orderBy: { order: "asc" },
              take: 1,
            },
            purchaseOptions: {
              where: { type: "ONE_TIME" },
              orderBy: { priceInCents: "asc" },
              take: 1,
            },
          },
        },
        categories: {
          orderBy: { isPrimary: "desc" },
          include: {
            category: {
              select: {
                slug: true,
                name: true,
              },
            },
          },
        },
      },
      // Mirrors getProductsByCategorySlug in lib/data.ts so the storefront
      // category page and the search drawer's chip filter present the same
      // products in the same order. Shared via PRODUCT_LIST_ORDER_BY in
      // lib/catalog-sort.ts.
      orderBy: PRODUCT_LIST_ORDER_BY,
    });

    return NextResponse.json(
      {
        products,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Failed to build search index:", error);
    return NextResponse.json(
      { error: "Failed to build search index" },
      { status: 500 }
    );
  }
}
