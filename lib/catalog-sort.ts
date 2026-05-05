import type { Prisma } from "@prisma/client";

/**
 * Canonical product list ordering: featured first, then alphabetical by
 * name. Both surfaces that present a flat list of products to the
 * storefront — the category page (`getProductsByCategorySlug` in
 * `lib/data.ts`) and the search drawer's chip filter
 * (`/api/search/index`) — import this so they don't drift out of sync.
 *
 * The shape matches Prisma's `Product.findMany({ orderBy })`.
 */
export const PRODUCT_LIST_ORDER_BY: Prisma.ProductOrderByWithRelationInput[] = [
  { isFeatured: "desc" },
  { name: "asc" },
];
