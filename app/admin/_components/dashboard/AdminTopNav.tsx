"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDesktopNavConfig, NavChild, NavItem } from "@/lib/config/admin-nav";
import { useIsHrefActive, useHasActiveDescendant } from "@/lib/navigation/hooks";
import { findRouteByHref } from "@/lib/navigation/navigation-core";
import { cn } from "@/lib/utils";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { ArrowLeftIcon, ChevronDown, KeyRound, LogOut, Moon, Sun, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import * as React from "react";
import { AdminMobileDrawer } from "./AdminMobileDrawer";
import { StoreBrand } from "./StoreBrand";
import { useUnreadReviews } from "./useUnreadReviews";

interface AdminTopNavProps {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  storeName: string;
  storeLogoUrl: string;
}

/**
 * Individual nav child link with active state via hook.
 * Extracted to allow hook usage (hooks can't be called in map callbacks).
 */
function NavChildLink({ child, showBadge }: { child: NavChild; showBadge?: boolean }) {
  const isChildActive = useIsHrefActive(child.href);

  return (
    <NavigationMenuPrimitive.Link asChild>
      <Link
        href={child.href}
        className={cn(
          "block rounded-sm px-2 py-1.5 text-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isChildActive && "bg-accent font-medium"
        )}
      >
        {child.label}
        {showBadge && (
          <span className="relative -top-2 -ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-label="New reviews" />
        )}
      </Link>
    </NavigationMenuPrimitive.Link>
  );
}

function NavDropdown({ item, unreadCount }: { item: NavItem; unreadCount: number }) {
  // Find the parent route ID by looking at the first child's route
  const firstChildRoute = item.children?.[0]
    ? findRouteByHref(item.children[0].href)
    : null;
  const parentRouteId = firstChildRoute?.parentId || "";

  // Check if any child is active (parent should be highlighted)
  const hasActiveChild = useHasActiveDescendant(parentRouteId);

  // Also need to check direct match for parent items with a direct href
  const directHref = item.href || "";
  const isDirectActive = useIsHrefActive(directHref);

  const isActive = hasActiveChild || (item.href ? isDirectActive : false);
  const Icon = item.icon;

  return (
    <NavigationMenuPrimitive.Item value={item.label} className="relative">
      <NavigationMenuPrimitive.Trigger
        className={cn(
          "group inline-flex h-auto items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "hover:bg-accent/50 hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "data-[state=open]:bg-accent/50",
          isActive && "bg-accent text-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{item.label}</span>
        <ChevronDown
          className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </NavigationMenuPrimitive.Trigger>
      <NavigationMenuPrimitive.Content
        className={cn(
          "absolute left-0 top-full mt-1.5 w-48 rounded-md border bg-popover p-2 text-popover-foreground shadow-lg",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        )}
      >
        <ul>
          {item.children?.map((child, index) => {
            // Render section header if present
            const SectionIcon = child.sectionIcon;
            const sectionHeader = child.section ? (
              <li
                key={`section-${child.section}`}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground",
                  index > 0 && "mt-2 border-t pt-2"
                )}
              >
                {SectionIcon && <SectionIcon className="h-3.5 w-3.5" />}
                {child.section}
              </li>
            ) : null;

            if (child.disabled) {
              return (
                <React.Fragment key={child.href}>
                  {sectionHeader}
                  <li className="flex items-center justify-between px-2 py-1.5 text-sm text-muted-foreground opacity-50">
                    {child.label}
                    {child.disabledLabel && (
                      <span className="text-xs">({child.disabledLabel})</span>
                    )}
                  </li>
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={child.href}>
                {sectionHeader}
                <li>
                  <NavChildLink child={child} showBadge={child.badgeId === "unread-reviews" && unreadCount > 0} />
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </NavigationMenuPrimitive.Content>
    </NavigationMenuPrimitive.Item>
  );
}

export function AdminTopNav({ user, storeName, storeLogoUrl }: AdminTopNavProps) {
  const { theme, setTheme } = useTheme();
  const { visible: visibleNavItems, overflow: overflowNavItem } = React.useMemo(
    () => getDesktopNavConfig(),
    []
  );
  const { unreadCount } = useUnreadReviews();

  // Debounce nav close to prevent click-to-close racing with hover-to-reopen.
  // Same fix as SiteHeader — ignore close events within 300ms of open.
  const [navValue, setNavValue] = React.useState("");
  const navOpenedAt = React.useRef(0);
  const handleNavValueChange = React.useCallback((val: string) => {
    if (val) {
      setNavValue(val);
      navOpenedAt.current = Date.now();
    } else if (Date.now() - navOpenedAt.current > 300) {
      setNavValue(val);
    }
  }, []);

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "A";

  return (
    <header className="sticky top-0 z-[60] w-full border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Left section */}
          <div className="flex items-center gap-2">
            {/* Mobile menu drawer */}
            <div className="lg:hidden">
              <AdminMobileDrawer storeName={storeName} storeLogoUrl={storeLogoUrl} />
            </div>

            {/* Back to public site - desktop only */}

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="sr-only">Open public site</span>
            </Link>

            {/* Logo/Brand - desktop only (in left section) */}
            <div className="hidden lg:flex items-center">
              <StoreBrand storeName={storeName} storeLogoUrl={storeLogoUrl} />
            </div>
          </div>

          {/* Center: Store branding for mobile/tablet - absolutely positioned */}
          <div className="absolute left-1/2 -translate-x-1/2 lg:hidden">
            <StoreBrand storeName={storeName} storeLogoUrl={storeLogoUrl} />
          </div>

          {/* Center: Navigation menu - desktop only */}
          <NavigationMenuPrimitive.Root className="hidden lg:flex" value={navValue} onValueChange={handleNavValueChange} delayDuration={200}>
            <NavigationMenuPrimitive.List className="flex items-center gap-2">
              {visibleNavItems.map((item) => (
                <NavDropdown key={item.label} item={item} unreadCount={unreadCount} />
              ))}
              {overflowNavItem && (
                <NavDropdown key={overflowNavItem.label} item={overflowNavItem} unreadCount={unreadCount} />
              )}
            </NavigationMenuPrimitive.List>
          </NavigationMenuPrimitive.Root>

          {/* Right: Theme toggle + Avatar */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-11 w-11"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Avatar Dropdown */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-full text-sm font-semibold"
                >
                  {initials}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                  <Link href="/admin/profile">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="gap-2 opacity-50">
                  <KeyRound className="h-4 w-4" />
                  Password
                  <span className="ml-auto text-xs text-muted-foreground">(demo - disabled)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-red-600 dark:text-red-400 cursor-pointer"
                  onClick={() => signOut({ callbackUrl: "/auth/admin-signin" })}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
