"use client";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  mobileNavConfig,
  type NavChild,
  type NavItem,
} from "@/lib/config/admin-nav";
import { useIsHrefActive, useActiveRoute } from "@/lib/navigation/hooks";
import { cn } from "@/lib/utils";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, ChevronRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { useUnreadReviews } from "./useUnreadReviews";

interface AdminMobileDrawerProps {
  storeName: string;
  storeLogoUrl?: string;
}

/**
 * Individual nav child link with active state via hook.
 */
function NavChildLink({
  child,
  onNavigate,
  showBadge,
}: {
  child: NavChild;
  onNavigate: () => void;
  showBadge?: boolean;
}) {
  const isChildActive = useIsHrefActive(child.href);

  if (child.disabled) {
    return (
      <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground opacity-50 min-h-[48px]">
        <span>{child.label}</span>
        {child.disabledLabel && <span className="text-xs">({child.disabledLabel})</span>}
      </div>
    );
  }

  return (
    <Link
      href={child.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center px-4 py-3 text-sm rounded-md min-h-[48px] transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isChildActive && "bg-accent text-accent-foreground font-medium"
      )}
    >
      <span>
        {child.label}
        {child.description && (
          <span className="block text-xs text-muted-foreground font-normal">
            {child.description}
          </span>
        )}
        {showBadge && (
          <span className="relative -top-2 -ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-label="New reviews" />
        )}
      </span>
    </Link>
  );
}

function NavSection({
  item,
  isExpanded,
  onToggle,
  onNavigate,
  unreadCount,
}: {
  item: NavItem;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  unreadCount: number;
}) {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  // For direct link items
  const directHref = item.href || "";
  const isDirectActive = useIsHrefActive(directHref);

  // Direct link (no children)
  if (!hasChildren && item.href) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md min-h-[48px] transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isDirectActive && "bg-accent text-accent-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
        {item.label}
      </Link>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium rounded-md min-h-[48px] transition-colors hover:bg-accent hover:text-accent-foreground">
        <span className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          {item.label}
        </span>
        <ChevronRight
          className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-90")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="pl-8 pr-2 py-1">
          {item.children?.map((child) => (
            <NavChildLink key={child.href} child={child} onNavigate={onNavigate} showBadge={child.badgeId === "unread-reviews" && unreadCount > 0} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Wrapper component to render nav sections.
 */
function MobileNavContent({
  navItems,
  expandedSections,
  setExpandedSections,
  onNavigate,
  unreadCount,
}: {
  navItems: NavItem[];
  expandedSections: Record<string, boolean>;
  setExpandedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onNavigate: () => void;
  unreadCount: number;
}) {
  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <>
      {navItems.map((item) => (
        <NavSection
          key={item.label}
          item={item}
          isExpanded={expandedSections[item.label] ?? false}
          onToggle={() => toggleSection(item.label)}
          onNavigate={onNavigate}
          unreadCount={unreadCount}
        />
      ))}
    </>
  );
}

export function AdminMobileDrawer({ storeName, storeLogoUrl }: AdminMobileDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const activeRoute = useActiveRoute();
  const { unreadCount } = useUnreadReviews();

  const mobileNavItems = mobileNavConfig;

  // State for expanded sections
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});

  // When drawer opens, expand only the section with the best matching child
  React.useEffect(() => {
    if (open && activeRoute) {
      const routePathname = activeRoute.pathname;

      // Find the best matching section by scoring each child
      let bestMatch: { label: string; score: number } | null = null;

      for (const item of mobileNavItems) {
        for (const child of item.children ?? []) {
          const childPathname = child.href.split("?")[0];
          let score = 0;

          // Exact pathname match - high score
          if (childPathname === routePathname) {
            score = 100 + childPathname.length;
          }
          // Prefix match (nested routes) - lower score
          // e.g., child is /admin/settings, route is /admin/settings/storefront
          // Exclude /admin root to avoid matching all admin routes
          else if (
            childPathname !== "/admin" &&
            routePathname.startsWith(childPathname + "/")
          ) {
            score = 50 + childPathname.length;
          }

          if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { label: item.label, score };
          }
        }
      }

      // Only expand the section with the best match
      const initial: Record<string, boolean> = {};
      for (const item of mobileNavItems) {
        initial[item.label] = bestMatch?.label === item.label;
      }
      setExpandedSections(initial);
    }
  }, [open, activeRoute, mobileNavItems]);

  const handleNavigate = () => {
    setOpen(false);
  };

  return (
    <SheetPrimitive.Root open={open} onOpenChange={setOpen}>
      <SheetPrimitive.Trigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetPrimitive.Trigger>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <SheetPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 h-full w-80 bg-background shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header with logo OR store name */}
          <div className="flex items-center justify-between px-4 py-4">
            {storeLogoUrl ? (
              <>
                <Image
                  src={storeLogoUrl}
                  alt={storeName}
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
                <SheetPrimitive.Title className="sr-only">{storeName}</SheetPrimitive.Title>
              </>
            ) : (
              <SheetPrimitive.Title className="font-semibold text-lg">
                {storeName}
              </SheetPrimitive.Title>
            )}
            <SheetPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" tabIndex={-1}>
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </SheetPrimitive.Close>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-2">
            <MobileNavContent
              navItems={mobileNavItems}
              expandedSections={expandedSections}
              setExpandedSections={setExpandedSections}
              onNavigate={handleNavigate}
              unreadCount={unreadCount}
            />
          </nav>

          {/* Footer - Back to public site */}
          <div className="border-t px-2 py-3">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleNavigate}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md min-h-[48px] transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
              Open public site
            </Link>
          </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
