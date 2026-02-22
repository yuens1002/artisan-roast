"use client";

import { CategoryProduct } from "@/lib/types";
import ProductCard from "@/app/(site)/_components/product/ProductCard";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { BreadcrumbCategoryDropdown } from "@/app/(site)/_components/navigation/BreadcrumbCategoryDropdown";
import Link from "next/link";

interface CategoryClientPageProps {
  categoryName: string;
  categorySlug: string;
  products: CategoryProduct[];
  showPurchaseOptions: boolean;
}

export default function CategoryClientPage({
  categoryName,
  categorySlug,
  products,
  showPurchaseOptions,
}: CategoryClientPageProps) {
  return (
    <div className="container mx-auto px-4 md:px-8 py-8">
      {/* 1. Breadcrumb (Home > Category) */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbCategoryDropdown
              categoryName={categoryName}
              categorySlug={categorySlug}
              products={products.map((p) => ({ name: p.name, slug: p.slug }))}
              isCurrentPage
            />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-4xl font-bold text-text-base mb-12">
        {categoryName}
      </h1>

      {products.length === 0 ? (
        <p className="text-text-muted">No products found in this category.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <ScrollReveal key={product.id} delay={index * 0.08}>
              <ProductCard
                product={product}
                showPurchaseOptions={showPurchaseOptions}
                categorySlug={categorySlug}
                sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1200px) calc(50vw - 2rem), 400px"
              />
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
