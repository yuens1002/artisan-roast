import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts, getProductsByCategorySlug } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import ProductClientPage from "./ProductClientPage";
import { getProductAddOns } from "./actions";

export const revalidate = 3600; // Re-fetch this page in the background, at most once per hour

interface ProductPageProps {
  params: { slug: string } | Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const title = product.name;
  const description =
    product.description ||
    `Shop ${product.name} — specialty coffee from ${product.origin?.length ? product.origin.join(", ") : "select origins"}.`;
  const image = product.variants[0]?.images[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image && { images: [{ url: image, alt: product.name }] }),
    },
  };
}

/**
 * Canonical product page at /products/{slug}
 * Supports ?from= parameter to preserve user's navigation journey in breadcrumb
 */
export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { slug } = (await params) as { slug?: string };

  if (!slug) {
    notFound();
  }

  const product = await getProductBySlug(slug);

  if (!product || product.variants.length === 0) {
    notFound();
  }

  // Get the "from" category if user navigated from a category page
  const resolvedSearchParams = await searchParams;
  let fromCategorySlug = resolvedSearchParams?.from;
  if (Array.isArray(fromCategorySlug)) {
    fromCategorySlug = fromCategorySlug[0];
  }
  const decodedFromSlug = fromCategorySlug
    ? decodeURIComponent(String(fromCategorySlug))
    : undefined;

  // Determine display category for breadcrumb:
  // 1. Use "from" category if provided and product belongs to it
  // 2. Otherwise use primary category
  // 3. Fallback to first category
  let displayCategory;

  if (decodedFromSlug) {
    displayCategory = product.categories.find(
      (c) => c.category.slug === decodedFromSlug
    )?.category;
  }

  if (!displayCategory) {
    const primaryCategoryRelation = product.categories.find((c) => c.isPrimary);
    displayCategory =
      primaryCategoryRelation?.category || product.categories[0]?.category;
  }

  if (!displayCategory) {
    notFound();
  }

  // The three remaining top-level fetches all depend only on `product` +
  // `displayCategory` (already resolved above) and are independent of each
  // other, so start them together to reduce total latency to roughly the
  // slowest top-level fetch — even if an individual helper still performs
  // some sequential work internally (e.g. getProductAddOns reads SiteSettings
  // for the weight unit on top of the add-on links).
  // - relatedProducts: same category, follows the user's journey
  // - addOns: per-product
  // - categoryProducts: siblings in the same category for the breadcrumb dropdown
  const [relatedProducts, addOns, categoryProducts] = await Promise.all([
    getRelatedProducts(product.id, displayCategory.slug),
    getProductAddOns(product.id),
    getProductsByCategorySlug(displayCategory.slug),
  ]);

  const siblingProducts = categoryProducts
    .filter((p) => p.id !== product.id)
    .map((p) => ({ name: p.name, slug: p.slug }));

  return (
    <ProductClientPage
      product={product}
      relatedProducts={relatedProducts}
      category={displayCategory}
      categoryProducts={siblingProducts}
      addOns={addOns}
    />
  );
}

// Allow ISR for non-pre-rendered paths (works with SKIP_SSG in CI)
export const dynamicParams = true;

/**
 * Generate static paths for all products (one path per product)
 * This is much more efficient than generating paths for every product-category combination
 *
 * Set SKIP_SSG=true in CI to skip static generation and reduce DB connections
 */
export async function generateStaticParams() {
  if (process.env.SKIP_SSG === "true") {
    return [];
  }

  const products = await prisma.product.findMany({
    select: { slug: true },
    where: { isDisabled: false },
  });

  return products.map((product) => ({
    slug: product.slug,
  }));
}
