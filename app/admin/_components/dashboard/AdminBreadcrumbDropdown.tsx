"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavigableChildren } from "@/lib/navigation";
import {
  BreadcrumbItem,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminBreadcrumbDropdownProps {
  item: { id: string; label: string; href: string | null };
  isLast: boolean;
}

const linkStyles = "underline-offset-4 hover:underline";

/**
 * Renders a breadcrumb item.
 * When the item has navigable children, the label becomes a dropdown trigger
 * and an animated chevron is rendered BEFORE the label (acting as separator).
 * Non-dropdown items render a standard leading separator.
 */
export function AdminBreadcrumbDropdown({
  item,
  isLast,
}: AdminBreadcrumbDropdownProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const children = isLast
    ? []
    : getNavigableChildren(item.id).filter((child) => child.href !== pathname);

  // No children — plain separator + text/link
  if (children.length === 0) {
    return (
      <>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {isLast || !item.href ? (
            <span>{item.label}</span>
          ) : (
            <Link href={item.href} className={linkStyles}>
              {item.label}
            </Link>
          )}
        </BreadcrumbItem>
      </>
    );
  }

  // Has children — animated chevron before label, no trailing separator
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <BreadcrumbItem>
        <DropdownMenuTrigger
          className={cn(
            linkStyles,
            "inline-flex items-center gap-1.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm"
          )}
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-[rotate] duration-200",
              open && "-rotate-90"
            )}
            aria-hidden="true"
          />
          {item.label}
        </DropdownMenuTrigger>
      </BreadcrumbItem>
      <DropdownMenuContent
        align="start"
        className="max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_[data-slot=dropdown-menu-item]]:cursor-pointer"
      >
        {item.href && (
          <>
            <DropdownMenuItem asChild>
              <Link href={item.href} className="font-semibold">
                {item.label}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {children.map((child) => (
          <DropdownMenuItem key={child.href} asChild>
            <Link href={child.href}>{child.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
