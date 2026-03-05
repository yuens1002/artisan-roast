"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbItems } from "./BreadcrumbContext";
import { useBreadcrumbTrail } from "@/lib/navigation/hooks";
import { AdminBreadcrumbDropdown } from "./AdminBreadcrumbDropdown";

/**
 * Shared styles for breadcrumb items.
 * All items use default foreground color.
 * Navigable items show underline on hover.
 */
const linkStyles = "underline-offset-4 hover:underline";

/**
 * Renders breadcrumb item content with consistent styling.
 */
function BreadcrumbItemContent({
  item,
  isLast
}: {
  item: { label: string; href?: string | null };
  isLast: boolean;
}) {
  // Non-navigable: last item or no href - plain text
  if (isLast || !item.href) {
    return <span>{item.label}</span>;
  }

  // Navigable: underline on hover
  return (
    <Link href={item.href} className={linkStyles}>
      {item.label}
    </Link>
  );
}

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const navBreadcrumbs = useBreadcrumbTrail();
  const customItems = useBreadcrumbItems();

  // Hide breadcrumb on overview page (/admin) — tab nav replaces it there
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return null;
  }

  // Combine nav breadcrumbs with custom items
  // Nav breadcrumbs provide the base trail, custom items are appended for entity names
  const allItems: Array<{ id: string; label: string; href: string | null }> = [
    ...navBreadcrumbs.map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
    })),
    ...customItems.map((item, index) => ({
      id: `custom-${index}`,
      label: item.label,
      href: item.href || null,
    })),
  ];

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList className="text-foreground pl-0">
        {allItems.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === allItems.length - 1;

          // First item (Home) gets special icon treatment
          if (isFirst && item.id === "admin") {
            return (
              <BreadcrumbItem key={item.id}>
                <Link href="/admin" className={linkStyles}>
                  <Home className="h-4 w-4" />
                  <span className="sr-only">Dashboard</span>
                </Link>
              </BreadcrumbItem>
            );
          }

          const isCustom = item.id.startsWith("custom-");

          // Nav items: AdminBreadcrumbDropdown renders its own separator + item
          if (!isCustom) {
            return (
              <AdminBreadcrumbDropdown
                key={item.id}
                item={item}
                isLast={isLast}
              />
            );
          }

          // Custom items: plain separator + text/link
          return (
            <span key={item.id} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbItemContent item={item} isLast={isLast} />
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
