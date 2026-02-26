import {
  LayoutDashboard,
  Package,
  ClipboardList,
  FileText,
  MoreHorizontal,
  Users,
  Settings,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

export type NavChild = {
  label: string;
  href: string;
  icon?: LucideIcon;
  disabled?: boolean;
  disabledLabel?: string; // e.g., "coming soon"
  section?: string; // Section header for grouping
  sectionIcon?: LucideIcon; // Icon for section header
  badgeId?: string; // ID for dynamic badge rendering (e.g., "unread-reviews")
};

export type NavItem = {
  label: string;
  icon: LucideIcon;
  href?: string; // Direct link (no dropdown)
  children?: NavChild[];
};

export const adminNavConfig: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    children: [
      { label: "Overview", href: "/admin" },
      { label: "Analytics", href: "/admin/analytics" },
    ],
  },
  {
    label: "Products",
    icon: Package,
    children: [
      { label: "Coffees", href: "/admin/products" },
      { label: "Merch", href: "/admin/merch" },
      { label: "Categories", href: "/admin/product-menu?view=all-categories" },
      { label: "Labels", href: "/admin/product-menu?view=all-labels" },
      { label: "Menu", href: "/admin/product-menu?view=menu" },
    ],
  },
  {
    label: "Orders",
    icon: ClipboardList,
    children: [
      { label: "All Orders", href: "/admin/orders" },
      { label: "Subscriptions", href: "/admin/subscriptions" },
    ],
  },
  {
    label: "Pages",
    icon: FileText,
    children: [
      { label: "About", href: "/admin/pages/about" },
      { label: "Cafe", href: "/admin/pages/cafe" },
      { label: "FAQ", href: "/admin/pages/faq" },
    ],
  },
  {
    label: "Management",
    icon: Users,
    children: [
      { label: "All Users", href: "/admin/users" },
      { label: "Newsletter", href: "/admin/newsletter" },
      { label: "Reviews", href: "/admin/reviews", badgeId: "unread-reviews" },
      { label: "Support", href: "/admin/support", icon: LifeBuoy },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    children: [
      { label: "General", href: "/admin/settings" },
      { label: "Store Front", href: "/admin/settings/storefront" },
      { label: "Appearance", href: "/admin/settings/appearance" },
      { label: "Location", href: "/admin/settings/location" },
      { label: "Commerce", href: "/admin/settings/commerce" },
      { label: "Shipping", href: "/admin/settings/shipping" },
      { label: "Marketing", href: "/admin/settings/marketing" },
      { label: "Contact", href: "/admin/settings/contact" },
      { label: "Scheduled Jobs", href: "/admin/settings/scheduled-jobs" },
      { label: "Social Links", href: "/admin/social-links" },
    ],
  },
];

/** Max nav items shown before overflow goes into "More" dropdown */
const DESKTOP_NAV_MAX_VISIBLE = 4;

/**
 * Get desktop nav items, grouping overflow into a "More" dropdown.
 */
export function getDesktopNavConfig(): {
  visible: NavItem[];
  overflow: NavItem | null;
} {
  if (adminNavConfig.length <= DESKTOP_NAV_MAX_VISIBLE) {
    return { visible: adminNavConfig, overflow: null };
  }

  const visible = adminNavConfig.slice(0, DESKTOP_NAV_MAX_VISIBLE);
  const overflowItems = adminNavConfig.slice(DESKTOP_NAV_MAX_VISIBLE);

  const overflowChildren: NavChild[] = overflowItems.flatMap((item) =>
    (item.children ?? []).map((child, index) => ({
      ...child,
      ...(index === 0 ? { section: item.label, sectionIcon: item.icon } : {}),
    }))
  );

  return {
    visible,
    overflow: {
      label: "More",
      icon: MoreHorizontal,
      children: overflowChildren,
    },
  };
}

/**
 * Core matching logic for nav child links.
 *
 * @deprecated Use useIsHrefActive() from lib/navigation/hooks.ts instead.
 * This function has a bug where all Menu Builder routes match when any one is active.
 * The new navigation system uses proper query param matching.
 *
 * @param allowNestedMatch - When true, /admin/products/123 matches /admin/products.
 *                           Used for parent highlighting, not for exact child highlighting.
 */
function matchesNavChild(
  child: NavChild,
  pathname: string,
  searchParams?: URLSearchParams,
  allowNestedMatch = false
): boolean {
  const childPathname = child.href.split("?")[0];

  // Query param match (for links like /admin/product-menu?view=menu)
  if (child.href.includes("?") && searchParams) {
    const currentUrl = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    if (currentUrl === child.href) {
      return true;
    }
  }

  // Exact pathname match
  if (pathname === childPathname) {
    return true;
  }

  // Nested route match (e.g. /admin/products/123 matches /admin/products)
  // But not for /admin root to avoid matching all admin routes
  if (
    allowNestedMatch &&
    childPathname !== "/admin" &&
    pathname.startsWith(childPathname + "/")
  ) {
    return true;
  }

  return false;
}

/**
 * Find the active navigation match for a given URL.
 * Returns both the parent item and specific child.
 *
 * @deprecated Use useBreadcrumbTrail() from lib/navigation/hooks.ts instead.
 * The new navigation system provides more accurate route matching and breadcrumb generation.
 */
export function findActiveNavigation(
  pathname: string,
  searchParams?: URLSearchParams
): { parent: NavItem | null; child: NavChild | null } {
  for (const item of adminNavConfig) {
    // Direct link item (no children)
    if (item.href && pathname === item.href) {
      return { parent: item, child: null };
    }

    if (!item.children) continue;

    // First try exact/query param match
    const exactMatch = item.children.find((child) =>
      matchesNavChild(child, pathname, searchParams, false)
    );
    if (exactMatch) {
      return { parent: item, child: exactMatch };
    }

    // Then try nested route match
    const nestedMatch = item.children.find((child) =>
      matchesNavChild(child, pathname, searchParams, true)
    );
    if (nestedMatch) {
      return { parent: item, child: nestedMatch };
    }
  }

  return { parent: null, child: null };
}

/**
 * Check if a nav child link is active (exact match only).
 *
 * @deprecated Use useIsHrefActive(child.href) from lib/navigation/hooks.ts instead.
 * The new hook provides more accurate query param matching.
 */
export function isNavChildActive(
  child: NavChild,
  pathname: string,
  searchParams?: URLSearchParams
): boolean {
  return matchesNavChild(child, pathname, searchParams, false);
}

/**
 * Check if a nav item (parent) is active.
 * Returns true if any child matches, including nested routes.
 *
 * @deprecated Use useHasActiveDescendant(routeId) from lib/navigation/hooks.ts instead.
 * The new hook provides more accurate parent highlighting.
 */
export function isNavItemActive(
  item: NavItem,
  pathname: string,
  searchParams?: URLSearchParams
): boolean {
  if (item.href) {
    return pathname === item.href;
  }

  if (item.children) {
    return item.children.some((child) =>
      matchesNavChild(child, pathname, searchParams, true)
    );
  }

  return false;
}

/**
 * Get the active child item for a nav item.
 * Includes nested route matching.
 *
 * @deprecated Use useIsHrefActive() from lib/navigation/hooks.ts for each child instead.
 */
export function getActiveChild(
  item: NavItem,
  pathname: string,
  searchParams?: URLSearchParams
): NavChild | undefined {
  if (!item.children) return undefined;

  // First try exact match, then nested
  return (
    item.children.find((child) =>
      matchesNavChild(child, pathname, searchParams, false)
    ) ||
    item.children.find((child) =>
      matchesNavChild(child, pathname, searchParams, true)
    )
  );
}

export const mobileNavConfig: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    children: [
      { label: "Overview", href: "/admin" },
      { label: "Analytics", href: "/admin/analytics" },
    ],
  },
  {
    label: "Products",
    icon: Package,
    children: [
      { label: "Coffees", href: "/admin/products" },
      { label: "Merch", href: "/admin/merch" },
      { label: "Categories", href: "/admin/product-menu?view=all-categories" },
      { label: "Labels", href: "/admin/product-menu?view=all-labels" },
      { label: "Menu", href: "/admin/product-menu?view=menu" },
    ],
  },
  {
    label: "Orders",
    icon: ClipboardList,
    children: [
      { label: "All Orders", href: "/admin/orders" },
      { label: "Subscriptions", href: "/admin/subscriptions" },
    ],
  },
  {
    label: "Pages",
    icon: FileText,
    children: [
      { label: "About", href: "/admin/pages/about" },
      { label: "Cafe", href: "/admin/pages/cafe" },
      { label: "FAQ", href: "/admin/pages/faq" },
    ],
  },
  {
    label: "Management",
    icon: Users,
    children: [
      { label: "All Users", href: "/admin/users" },
      { label: "Newsletter", href: "/admin/newsletter" },
      { label: "Reviews", href: "/admin/reviews", badgeId: "unread-reviews" },
      { label: "Support", href: "/admin/support", icon: LifeBuoy },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    children: [
      { label: "General", href: "/admin/settings" },
      { label: "Store Front", href: "/admin/settings/storefront" },
      { label: "Appearance", href: "/admin/settings/appearance" },
      { label: "Location", href: "/admin/settings/location" },
      { label: "Commerce", href: "/admin/settings/commerce" },
      { label: "Shipping", href: "/admin/settings/shipping" },
      { label: "Marketing", href: "/admin/settings/marketing" },
      { label: "Contact", href: "/admin/settings/contact" },
      { label: "Scheduled Jobs", href: "/admin/settings/scheduled-jobs" },
      { label: "Social Links", href: "/admin/social-links" },
    ],
  },
];
