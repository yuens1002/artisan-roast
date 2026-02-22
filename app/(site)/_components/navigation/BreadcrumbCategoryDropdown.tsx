"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface BreadcrumbProduct {
  name: string;
  slug: string;
}

interface BreadcrumbCategoryDropdownProps {
  categoryName: string;
  categorySlug: string;
  products: BreadcrumbProduct[];
  /** Whether this is the current page (non-navigable label) vs a link */
  isCurrentPage?: boolean;
}

export function BreadcrumbCategoryDropdown({
  categoryName,
  categorySlug,
  products,
  isCurrentPage = false,
}: BreadcrumbCategoryDropdownProps) {
  const [open, setOpen] = useState(false);

  if (products.length === 0) {
    if (isCurrentPage) {
      return (
        <span className="inline-flex items-center gap-1.5" aria-current="page">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
          <span className="font-normal text-foreground">{categoryName}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
        <Link
          href={`/${categorySlug}`}
          className="transition-colors hover:text-foreground"
        >
          {categoryName}
        </Link>
      </span>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 sm:gap-2.5 transition-colors hover:text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm">
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 transition-[rotate] duration-200",
            open && "-rotate-90"
          )}
          aria-hidden="true"
        />
        {isCurrentPage ? (
          <span className="font-normal text-foreground">{categoryName}</span>
        ) : (
          <span>{categoryName}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_[data-slot=dropdown-menu-item]]:cursor-pointer">
        <DropdownMenuItem asChild>
          <Link href={`/${categorySlug}`} className="font-semibold">
            {categoryName}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {products.map((product) => (
          <DropdownMenuItem key={product.slug} asChild>
            <Link href={`/products/${product.slug}?from=${categorySlug}`}>
              {product.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
