import {
  LayoutDashboard,
  Package,
  ClipboardList,
  FileText,
  Users,
  Settings,
  LifeBuoy,
} from "lucide-react";
import type { RouteEntry, RouteRegistry } from "./types";
import { ADMIN_PAGES } from "@/lib/config/admin-pages";

/**
 * Route Registry - Single Source of Truth for Navigation
 *
 * All navigable admin routes are defined here with:
 * - Parent/child hierarchy via parentId
 * - Match modes (exact, prefix, param)
 * - Labels and icons
 * - Breadcrumb resolvers for dynamic routes
 */

const routeEntries: RouteEntry[] = [
  // ==================== ROOT ====================
  {
    id: "admin",
    pathname: "/admin",
    matchMode: "exact",
    label: "Home",
    parentId: undefined,
    icon: LayoutDashboard,
    isNavigable: true,
  },

  // ==================== DASHBOARD ====================
  {
    id: "admin.dashboard",
    pathname: "/admin",
    matchMode: "exact",
    label: "Dashboard",
    parentId: undefined,
    icon: LayoutDashboard,
    isNavigable: false, // Grouping only
  },
  {
    id: "admin.dashboard.overview",
    pathname: ADMIN_PAGES.overview.href,
    matchMode: "exact",
    label: ADMIN_PAGES.overview.label,
    parentId: "admin.dashboard",
    isNavigable: true,
  },
  {
    id: "admin.dashboard.sales",
    pathname: ADMIN_PAGES.sales.href,
    matchMode: "exact",
    label: ADMIN_PAGES.sales.label,
    parentId: "admin.dashboard",
    isNavigable: true,
  },
  {
    id: "admin.dashboard.analytics",
    pathname: ADMIN_PAGES.analytics.href,
    matchMode: "exact",
    label: ADMIN_PAGES.analytics.label,
    parentId: "admin.dashboard",
    isNavigable: true,
  },

  // ==================== PRODUCTS ====================
  {
    id: "admin.products",
    pathname: "/admin/products",
    matchMode: "prefix",
    label: "Products",
    parentId: undefined,
    icon: Package,
    isNavigable: false, // Grouping only
  },
  {
    id: "admin.products.coffees",
    pathname: "/admin/products",
    matchMode: "exact",
    label: "Coffees",
    parentId: "admin.products",
    isNavigable: true,
  },
  // Coffee edit page - dynamic breadcrumb via BreadcrumbContext
  {
    id: "admin.products.edit",
    pathname: "/admin/products",
    matchMode: "prefix-nested",
    label: null, // Resolved at runtime via BreadcrumbContext
    parentId: "admin.products.coffees",
    isNavigable: true,
  },
  // Coffee new page
  {
    id: "admin.products.new",
    pathname: "/admin/products/new",
    matchMode: "exact",
    label: "New Product",
    parentId: "admin.products.coffees",
    isNavigable: true,
  },
  {
    id: "admin.products.merch",
    pathname: "/admin/merch",
    matchMode: "exact",
    label: "Merch",
    parentId: "admin.products",
    isNavigable: true,
  },
  // Merch edit page - dynamic breadcrumb via BreadcrumbContext
  {
    id: "admin.products.merch.edit",
    pathname: "/admin/merch",
    matchMode: "prefix-nested",
    label: null, // Resolved at runtime via BreadcrumbContext
    parentId: "admin.products.merch",
    isNavigable: true,
  },
  // Merch new page
  {
    id: "admin.products.merch.new",
    pathname: "/admin/merch/new",
    matchMode: "exact",
    label: "New Product",
    parentId: "admin.products.merch",
    isNavigable: true,
  },

  // ==================== MENU BUILDER ====================
  // Parent grouping for Menu Builder items under Products
  {
    id: "admin.menu-builder",
    pathname: "/admin/product-menu",
    matchMode: "prefix",
    label: "Menu Builder",
    parentId: "admin.products",
    isNavigable: false, // Grouping only
  },
  // All Categories view
  {
    id: "admin.menu-builder.all-categories",
    pathname: "/admin/product-menu",
    queryParams: { view: "all-categories" },
    matchMode: "param",
    label: "Categories",
    parentId: "admin.products",
    isNavigable: true,
  },
  // All Labels view
  {
    id: "admin.menu-builder.all-labels",
    pathname: "/admin/product-menu",
    queryParams: { view: "all-labels" },
    matchMode: "param",
    label: "Labels",
    parentId: "admin.products",
    isNavigable: true,
  },
  // Menu view
  {
    id: "admin.menu-builder.menu",
    pathname: "/admin/product-menu",
    queryParams: { view: "menu" },
    matchMode: "param",
    label: "Menu",
    parentId: "admin.products",
    isNavigable: true,
  },
  // Single category view - dynamic breadcrumb
  {
    id: "admin.menu-builder.category",
    pathname: "/admin/product-menu",
    queryParams: { view: "category" },
    matchMode: "param",
    label: null, // Resolved at runtime
    parentId: "admin.menu-builder.all-categories",
    breadcrumbResolver: "categoryView",
    isNavigable: true,
  },
  // Single label view - dynamic breadcrumb
  {
    id: "admin.menu-builder.label",
    pathname: "/admin/product-menu",
    queryParams: { view: "label" },
    matchMode: "param",
    label: null, // Resolved at runtime
    parentId: "admin.menu-builder.all-labels",
    breadcrumbResolver: "labelView",
    isNavigable: true,
  },

  // ==================== ORDERS ====================
  {
    id: "admin.orders",
    pathname: "/admin/orders",
    matchMode: "prefix",
    label: "Orders",
    parentId: undefined,
    icon: ClipboardList,
    isNavigable: false, // Grouping only
  },
  {
    id: "admin.orders.all",
    pathname: "/admin/orders",
    matchMode: "exact",
    label: "All Orders",
    parentId: "admin.orders",
    isNavigable: true,
  },
  {
    id: "admin.orders.subscriptions",
    pathname: "/admin/subscriptions",
    matchMode: "exact",
    label: "Subscriptions",
    parentId: "admin.orders",
    isNavigable: true,
  },
  // Order detail page - path segment dynamic route (e.g., /admin/orders/abc123)
  {
    id: "admin.orders.detail",
    pathname: "/admin/orders",
    matchMode: "prefix-nested", // Only matches /admin/orders/xxx, NOT /admin/orders
    label: null, // Resolved at runtime via BreadcrumbContext
    parentId: "admin.orders.all",
    breadcrumbResolver: "orderDetail",
    isNavigable: true,
  },

  // ==================== PAGES ====================
  {
    id: "admin.pages",
    pathname: "/admin/pages",
    matchMode: "prefix",
    label: "Pages",
    parentId: undefined,
    icon: FileText,
    isNavigable: false, // Grouping only
  },
  {
    id: "admin.pages.about",
    pathname: "/admin/pages/about",
    matchMode: "exact",
    label: "About",
    parentId: "admin.pages",
    isNavigable: true,
  },
  {
    id: "admin.pages.cafe",
    pathname: "/admin/pages/cafe",
    matchMode: "exact",
    label: "Cafe",
    parentId: "admin.pages",
    isNavigable: true,
  },
  {
    id: "admin.pages.faq",
    pathname: "/admin/pages/faq",
    matchMode: "exact",
    label: "FAQ",
    parentId: "admin.pages",
    isNavigable: true,
  },

  // ==================== MANAGEMENT ====================
  {
    id: "admin.management",
    pathname: "/admin/users",
    matchMode: "prefix",
    label: "Management",
    parentId: undefined,
    icon: Users,
    isNavigable: false, // Grouping only
  },
  {
    id: "admin.management.users",
    pathname: "/admin/users",
    matchMode: "exact",
    label: "All Users",
    parentId: "admin.management",
    isNavigable: true,
  },
  {
    id: "admin.management.newsletter",
    pathname: "/admin/newsletter",
    matchMode: "exact",
    label: "Newsletter",
    parentId: "admin.management",
    isNavigable: true,
  },
  {
    id: "admin.management.reviews",
    pathname: "/admin/reviews",
    matchMode: "exact",
    label: "Reviews",
    parentId: "admin.management",
    isNavigable: true,
  },
  {
    id: "admin.management.support",
    pathname: "/admin/support",
    matchMode: "exact",
    label: "Support",
    parentId: "admin.management",
    icon: LifeBuoy,
    isNavigable: true,
  },

  // ==================== SETTINGS ====================
  {
    id: "admin.settings",
    pathname: "/admin/settings",
    matchMode: "prefix",
    label: "Settings",
    parentId: undefined,
    icon: Settings,
    isNavigable: false, // Grouping only
  },
  {
    id: "admin.settings.general",
    pathname: "/admin/settings",
    matchMode: "exact",
    label: "General",
    parentId: "admin.settings",
    isNavigable: true,
  },
  {
    id: "admin.settings.storefront",
    pathname: "/admin/settings/storefront",
    matchMode: "exact",
    label: "Store Front",
    parentId: "admin.settings",
    isNavigable: true,
  },
  {
    id: "admin.settings.appearance",
    pathname: "/admin/settings/appearance",
    matchMode: "exact",
    label: "Appearance",
    parentId: "admin.settings",
    isNavigable: true,
  },
  {
    id: "admin.settings.location",
    pathname: "/admin/settings/location",
    matchMode: "exact",
    label: "Location",
    parentId: "admin.settings",
    isNavigable: true,
  },
  {
    id: "admin.settings.commerce",
    pathname: "/admin/settings/commerce",
    matchMode: "exact",
    label: "Commerce",
    parentId: "admin.settings",
    isNavigable: true,
  },
  {
    id: "admin.settings.ai",
    pathname: "/admin/settings/ai",
    matchMode: "exact",
    label: "AI",
    parentId: "admin.settings",
    isNavigable: true,
  },
  {
    id: "admin.settings.marketing",
    pathname: "/admin/settings/marketing",
    matchMode: "exact",
    label: "Marketing",
    parentId: "admin.settings",
    isNavigable: true,
  },
  {
    id: "admin.settings.contact",
    pathname: "/admin/settings/contact",
    matchMode: "exact",
    label: "Contact",
    parentId: "admin.settings",
    isNavigable: true,
  },
  {
    id: "admin.settings.shipping",
    pathname: "/admin/settings/shipping",
    matchMode: "exact",
    label: "Shipping",
    parentId: "admin.settings",
    isNavigable: true,
  },
  {
    id: "admin.settings.scheduled-jobs",
    pathname: "/admin/settings/scheduled-jobs",
    matchMode: "exact",
    label: "Scheduled Jobs",
    parentId: "admin.settings",
    isNavigable: true,
  },
  {
    id: "admin.settings.social-links",
    pathname: "/admin/social-links",
    matchMode: "exact",
    label: "Social Links",
    parentId: "admin.settings",
    isNavigable: true,
  },

  // ==================== PROFILE (USER MENU) ====================
  {
    id: "admin.profile",
    pathname: "/admin/profile",
    matchMode: "exact",
    label: "Profile",
    parentId: undefined,
    isNavigable: true,
  },
];

/**
 * Build the route registry map from route entries.
 * Provides O(1) lookup by route ID.
 */
function buildRegistry(entries: RouteEntry[]): RouteRegistry {
  const registry = new Map<string, RouteEntry>();
  for (const entry of entries) {
    registry.set(entry.id, entry);
  }
  return registry;
}

/**
 * The route registry - single source of truth for all navigation routes.
 */
export const routeRegistry: RouteRegistry = buildRegistry(routeEntries);

/**
 * Get all route entries as an array (for iteration).
 */
export function getAllRoutes(): RouteEntry[] {
  return routeEntries;
}

/**
 * Get a route by ID.
 */
export function getRouteById(id: string): RouteEntry | undefined {
  return routeRegistry.get(id);
}

/**
 * Get child routes for a given parent ID.
 */
export function getChildRoutes(parentId: string): RouteEntry[] {
  return routeEntries.filter((route) => route.parentId === parentId);
}

/**
 * Get all navigable routes (for menu rendering).
 */
export function getNavigableRoutes(): RouteEntry[] {
  return routeEntries.filter((route) => route.isNavigable);
}

/**
 * Get top-level navigation groups (routes with no parentId and not navigable).
 */
export function getTopLevelGroups(): RouteEntry[] {
  return routeEntries.filter(
    (route) => route.parentId === undefined && !route.isNavigable
  );
}
