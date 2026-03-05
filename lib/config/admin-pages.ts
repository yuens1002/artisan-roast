/**
 * Centralized admin dashboard page labels.
 *
 * Single source of truth consumed by:
 * - admin-nav.ts (sidebar / mobile nav)
 * - route-registry.ts (breadcrumbs / active-link matching)
 * - DashboardTabNav.tsx (tab bar)
 * - Individual page.tsx files (PageTitle)
 */

export const ADMIN_PAGES = {
  overview: {
    label: "Overview",
    href: "/admin",
  },
  sales: {
    label: "Sales Analytics",
    description: "Revenue, orders & product performance",
    href: "/admin/sales",
  },
  analytics: {
    label: "Trends & User Activities",
    description: "Behavior funnel, searches & activity trends",
    href: "/admin/analytics",
  },
} as const;
