import {
  resolveRoute,
  getAncestorIds,
  buildHref,
  getNavigableChildren,
  isRouteActive,
  hasActiveDescendant,
  getMenuBuilderView,
  findRouteByHref,
} from "../navigation-core";
import { getRouteById } from "../route-registry";
import type { RouteEntry } from "../types";

describe("navigation-core", () => {
  describe("resolveRoute", () => {
    it("should resolve exact route matches", () => {
      const result = resolveRoute("/admin", new URLSearchParams());
      expect(result).not.toBeNull();
      expect(result?.route.id).toBe("admin");
    });

    it("should resolve route with query params (param mode)", () => {
      const result = resolveRoute(
        "/admin/product-menu",
        new URLSearchParams("view=all-categories")
      );
      expect(result).not.toBeNull();
      expect(result?.route.id).toBe("admin.menu-builder.all-categories");
    });

    it("should NOT match all-categories when on all-labels view", () => {
      // This is the bug fix test
      const result = resolveRoute(
        "/admin/product-menu",
        new URLSearchParams("view=all-labels")
      );
      expect(result).not.toBeNull();
      expect(result?.route.id).toBe("admin.menu-builder.all-labels");
      expect(result?.route.id).not.toBe("admin.menu-builder.all-categories");
    });

    it("should NOT match all-labels when on menu view", () => {
      const result = resolveRoute(
        "/admin/product-menu",
        new URLSearchParams("view=menu")
      );
      expect(result).not.toBeNull();
      expect(result?.route.id).toBe("admin.menu-builder.menu");
      expect(result?.route.id).not.toBe("admin.menu-builder.all-labels");
    });

    it("should resolve prefix route matches", () => {
      const result = resolveRoute("/admin/settings/storefront", new URLSearchParams());
      expect(result).not.toBeNull();
      expect(result?.route.id).toBe("admin.settings.storefront");
    });

    it("should return null for non-existent routes", () => {
      const result = resolveRoute("/admin/nonexistent", new URLSearchParams());
      // Should still return a prefix match for admin.products or similar
      // but won't match exactly
      expect(result).toBeNull();
    });

    it("should match category view with categoryId param", () => {
      const result = resolveRoute(
        "/admin/product-menu",
        new URLSearchParams("view=category&categoryId=abc123")
      );
      expect(result).not.toBeNull();
      expect(result?.route.id).toBe("admin.menu-builder.category");
    });

    it("should match label view with labelId param", () => {
      const result = resolveRoute(
        "/admin/product-menu",
        new URLSearchParams("view=label&labelId=xyz789")
      );
      expect(result).not.toBeNull();
      expect(result?.route.id).toBe("admin.menu-builder.label");
    });
  });

  describe("getAncestorIds", () => {
    it("should return empty set for root route", () => {
      const ancestors = getAncestorIds("admin");
      expect(ancestors.size).toBe(0);
    });

    it("should return parent IDs for nested routes", () => {
      const ancestors = getAncestorIds("admin.menu-builder.all-categories");
      expect(ancestors.has("admin.products")).toBe(true);
    });

    it("should return all ancestors up the chain", () => {
      const ancestors = getAncestorIds("admin.settings.storefront");
      expect(ancestors.has("admin.settings")).toBe(true);
    });
  });

  describe("isRouteActive", () => {
    it("should return true for exact route match", () => {
      const activeRoute = { id: "admin.products.coffees" } as Partial<RouteEntry> as RouteEntry;
      const ancestors = new Set<string>(["admin.products"]);
      expect(isRouteActive("admin.products.coffees", activeRoute, ancestors)).toBe(true);
    });

    it("should return true for ancestor of active route", () => {
      const activeRoute = { id: "admin.products.coffees" } as Partial<RouteEntry> as RouteEntry;
      const ancestors = new Set<string>(["admin.products"]);
      expect(isRouteActive("admin.products", activeRoute, ancestors)).toBe(true);
    });

    it("should return false for unrelated route", () => {
      const activeRoute = { id: "admin.products.coffees" } as Partial<RouteEntry> as RouteEntry;
      const ancestors = new Set<string>(["admin.products"]);
      expect(isRouteActive("admin.orders", activeRoute, ancestors)).toBe(false);
    });
  });

  describe("hasActiveDescendant", () => {
    it("should return true when route is ancestor of active", () => {
      const activeRoute = { id: "admin.menu-builder.all-categories" } as Partial<RouteEntry> as RouteEntry;
      const ancestors = new Set<string>(["admin.products"]);
      expect(hasActiveDescendant("admin.products", activeRoute, ancestors)).toBe(true);
    });

    it("should return false when route is the active route itself", () => {
      const activeRoute = { id: "admin.products" } as Partial<RouteEntry> as RouteEntry;
      const ancestors = new Set<string>();
      // hasActiveDescendant checks if route is an ancestor, not if it's the route itself
      expect(hasActiveDescendant("admin.products", activeRoute, ancestors)).toBe(false);
    });

    it("should return false for unrelated routes", () => {
      const activeRoute = { id: "admin.orders.all" } as Partial<RouteEntry> as RouteEntry;
      const ancestors = new Set<string>(["admin.orders"]);
      expect(hasActiveDescendant("admin.products", activeRoute, ancestors)).toBe(false);
    });
  });

  describe("getMenuBuilderView", () => {
    it("should return view from query params", () => {
      expect(
        getMenuBuilderView("/admin/product-menu", new URLSearchParams("view=all-categories"))
      ).toBe("all-categories");
    });

    it("should return menu as default for product-menu without view", () => {
      expect(getMenuBuilderView("/admin/product-menu", new URLSearchParams())).toBe("menu");
    });

    it("should return null for non-menu-builder pages", () => {
      expect(getMenuBuilderView("/admin/products", new URLSearchParams())).toBeNull();
    });

    it("should handle all valid view types", () => {
      expect(
        getMenuBuilderView("/admin/product-menu", new URLSearchParams("view=menu"))
      ).toBe("menu");
      expect(
        getMenuBuilderView("/admin/product-menu", new URLSearchParams("view=label"))
      ).toBe("label");
      expect(
        getMenuBuilderView("/admin/product-menu", new URLSearchParams("view=category"))
      ).toBe("category");
      expect(
        getMenuBuilderView("/admin/product-menu", new URLSearchParams("view=all-labels"))
      ).toBe("all-labels");
      expect(
        getMenuBuilderView("/admin/product-menu", new URLSearchParams("view=all-categories"))
      ).toBe("all-categories");
    });
  });

  describe("findRouteByHref", () => {
    it("should find route by exact href", () => {
      const route = findRouteByHref("/admin/products");
      expect(route).not.toBeNull();
      expect(route?.id).toBe("admin.products.coffees");
    });

    it("should find route by href with query params", () => {
      const route = findRouteByHref("/admin/product-menu?view=all-categories");
      expect(route).not.toBeNull();
      expect(route?.id).toBe("admin.menu-builder.all-categories");
    });

    it("should distinguish between different query param routes", () => {
      const categoriesRoute = findRouteByHref("/admin/product-menu?view=all-categories");
      const labelsRoute = findRouteByHref("/admin/product-menu?view=all-labels");
      const menuRoute = findRouteByHref("/admin/product-menu?view=menu");

      expect(categoriesRoute?.id).toBe("admin.menu-builder.all-categories");
      expect(labelsRoute?.id).toBe("admin.menu-builder.all-labels");
      expect(menuRoute?.id).toBe("admin.menu-builder.menu");

      // Most importantly, they should all be different
      expect(categoriesRoute?.id).not.toBe(labelsRoute?.id);
      expect(categoriesRoute?.id).not.toBe(menuRoute?.id);
      expect(labelsRoute?.id).not.toBe(menuRoute?.id);
    });
  });

  describe("Dynamic Route Matching", () => {
    // Tests for routes with dynamic entity IDs (categories, labels, products)

    describe("Category View - Dynamic categoryId", () => {
      it("should match category view regardless of categoryId value", () => {
        const result1 = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=category&categoryId=cat_abc123")
        );
        const result2 = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=category&categoryId=cat_xyz789")
        );
        const result3 = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=category&categoryId=cmkvd9r8f0003jtxphs6t7zx9")
        );

        expect(result1?.route.id).toBe("admin.menu-builder.category");
        expect(result2?.route.id).toBe("admin.menu-builder.category");
        expect(result3?.route.id).toBe("admin.menu-builder.category");
      });

      it("should have all-categories as ancestor for category view", () => {
        const result = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=category&categoryId=cat_abc123")
        );
        expect(result?.route.id).toBe("admin.menu-builder.category");
        expect(result?.route.parentId).toBe("admin.menu-builder.all-categories");

        const ancestors = getAncestorIds("admin.menu-builder.category");
        expect(ancestors.has("admin.menu-builder.all-categories")).toBe(true);
        expect(ancestors.has("admin.products")).toBe(true);
      });

      it("should NOT match category view when on all-categories (no categoryId)", () => {
        const result = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=all-categories")
        );
        expect(result?.route.id).toBe("admin.menu-builder.all-categories");
        expect(result?.route.id).not.toBe("admin.menu-builder.category");
      });
    });

    describe("Label View - Dynamic labelId", () => {
      it("should match label view regardless of labelId value", () => {
        const result1 = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=label&labelId=lbl_abc123")
        );
        const result2 = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=label&labelId=lbl_xyz789")
        );
        const result3 = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=label&labelId=cmkvd9s2g0005jtxp4t8k3m1n")
        );

        expect(result1?.route.id).toBe("admin.menu-builder.label");
        expect(result2?.route.id).toBe("admin.menu-builder.label");
        expect(result3?.route.id).toBe("admin.menu-builder.label");
      });

      it("should have all-labels as ancestor for label view", () => {
        const result = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=label&labelId=lbl_abc123")
        );
        expect(result?.route.id).toBe("admin.menu-builder.label");
        expect(result?.route.parentId).toBe("admin.menu-builder.all-labels");

        const ancestors = getAncestorIds("admin.menu-builder.label");
        expect(ancestors.has("admin.menu-builder.all-labels")).toBe(true);
        expect(ancestors.has("admin.products")).toBe(true);
      });

      it("should NOT match label view when on all-labels (no labelId)", () => {
        const result = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=all-labels")
        );
        expect(result?.route.id).toBe("admin.menu-builder.all-labels");
        expect(result?.route.id).not.toBe("admin.menu-builder.label");
      });
    });

    describe("Product Edit - Dynamic productId", () => {
      it("should match product edit view regardless of product id value", () => {
        const result1 = resolveRoute(
          "/admin/products/prod_abc123",
          new URLSearchParams()
        );
        const result2 = resolveRoute(
          "/admin/products/prod_xyz789",
          new URLSearchParams()
        );
        const result3 = resolveRoute(
          "/admin/products/cmkvd9abc0001jtxp1234abcd",
          new URLSearchParams()
        );

        expect(result1?.route.id).toBe("admin.products.edit");
        expect(result2?.route.id).toBe("admin.products.edit");
        expect(result3?.route.id).toBe("admin.products.edit");
      });

      it("should have coffees as parent for breadcrumb chain", () => {
        // Product edit has parentId: admin.products.coffees for proper breadcrumb
        // The actual product name is added via BreadcrumbContext
        const result = resolveRoute(
          "/admin/products/prod_abc123",
          new URLSearchParams()
        );
        expect(result?.route.id).toBe("admin.products.edit");
        expect(result?.route.parentId).toBe("admin.products.coffees");
      });

      it("should still be under admin.products prefix match for nav highlighting", () => {
        // prefix-nested matching ensures Products group is highlighted
        const result = resolveRoute(
          "/admin/products/prod_abc123",
          new URLSearchParams()
        );
        expect(result?.route.pathname).toBe("/admin/products");
        // The Products nav group uses prefix matching on /admin/products
      });
    });

    describe("Extra query params should not break matching", () => {
      it("should match with additional unrelated query params", () => {
        const result = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=all-categories&foo=bar&timestamp=123456")
        );
        expect(result?.route.id).toBe("admin.menu-builder.all-categories");
      });

      it("should match category view with extra params", () => {
        const result = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=category&categoryId=cat_123&sort=name&page=2")
        );
        expect(result?.route.id).toBe("admin.menu-builder.category");
      });
    });

    describe("Active state for dynamic routes", () => {
      it("parent 'Categories' should be highlighted when viewing a specific category", () => {
        const result = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=category&categoryId=cat_abc123")
        );
        const ancestors = getAncestorIds(result!.route.id);

        // all-categories should be an ancestor
        expect(hasActiveDescendant("admin.menu-builder.all-categories", result!.route, ancestors)).toBe(true);
        // Products group should also be highlighted
        expect(hasActiveDescendant("admin.products", result!.route, ancestors)).toBe(true);
      });

      it("parent 'Labels' should be highlighted when viewing a specific label", () => {
        const result = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=label&labelId=lbl_abc123")
        );
        const ancestors = getAncestorIds(result!.route.id);

        // all-labels should be an ancestor
        expect(hasActiveDescendant("admin.menu-builder.all-labels", result!.route, ancestors)).toBe(true);
        // Products group should also be highlighted
        expect(hasActiveDescendant("admin.products", result!.route, ancestors)).toBe(true);
      });

      it("'Menu' should NOT be highlighted when viewing a category", () => {
        const result = resolveRoute(
          "/admin/product-menu",
          new URLSearchParams("view=category&categoryId=cat_abc123")
        );
        const ancestors = getAncestorIds(result!.route.id);

        expect(hasActiveDescendant("admin.menu-builder.menu", result!.route, ancestors)).toBe(false);
        expect(isRouteActive("admin.menu-builder.menu", result!.route, ancestors)).toBe(false);
      });
    });
  });

  describe("Path-Segment Dynamic Routes", () => {
    // Tests for routes like /admin/orders/[id] that use path segments instead of query params

    describe("Order Detail - Path Segment ID", () => {
      it("should match order detail route with any order ID in path", () => {
        const result1 = resolveRoute("/admin/orders/ord_abc123", new URLSearchParams());
        const result2 = resolveRoute("/admin/orders/ord_xyz789", new URLSearchParams());
        const result3 = resolveRoute("/admin/orders/cmkvd9abc0001jtxp1234abcd", new URLSearchParams());

        expect(result1?.route.id).toBe("admin.orders.detail");
        expect(result2?.route.id).toBe("admin.orders.detail");
        expect(result3?.route.id).toBe("admin.orders.detail");
      });

      it("should NOT match order detail for exact /admin/orders (list page)", () => {
        const result = resolveRoute("/admin/orders", new URLSearchParams());
        expect(result?.route.id).toBe("admin.orders.all");
        expect(result?.route.id).not.toBe("admin.orders.detail");
      });

      it("should have all-orders as parent for breadcrumb chain", () => {
        const result = resolveRoute("/admin/orders/ord_abc123", new URLSearchParams());
        expect(result?.route.id).toBe("admin.orders.detail");
        expect(result?.route.parentId).toBe("admin.orders.all");
      });

      it("should have orders group as ancestor for nav highlighting", () => {
        const result = resolveRoute("/admin/orders/ord_abc123", new URLSearchParams());
        const ancestors = getAncestorIds(result!.route.id);

        expect(ancestors.has("admin.orders.all")).toBe(true);
        expect(ancestors.has("admin.orders")).toBe(true);
      });

      it("should highlight Orders nav group when viewing order detail", () => {
        const result = resolveRoute("/admin/orders/ord_abc123", new URLSearchParams());
        const ancestors = getAncestorIds(result!.route.id);

        expect(hasActiveDescendant("admin.orders", result!.route, ancestors)).toBe(true);
        expect(hasActiveDescendant("admin.orders.all", result!.route, ancestors)).toBe(true);
      });

      it("should work with deeply nested paths", () => {
        // Even paths like /admin/orders/abc123/items/456 would match
        // because prefix matching checks if path starts with /admin/orders/
        const result = resolveRoute("/admin/orders/abc123/items/456", new URLSearchParams());
        expect(result?.route.id).toBe("admin.orders.detail");
      });

      it("should have null label for dynamic breadcrumb via BreadcrumbContext", () => {
        const result = resolveRoute("/admin/orders/ord_abc123", new URLSearchParams());
        expect(result?.route.label).toBeNull();
        expect(result?.route.breadcrumbResolver).toBe("orderDetail");
      });
    });

    describe("Path segment vs Query param routing", () => {
      it("should correctly distinguish path segment routes from exact routes", () => {
        // /admin/orders = exact match for list page
        const listPage = resolveRoute("/admin/orders", new URLSearchParams());
        expect(listPage?.route.id).toBe("admin.orders.all");

        // /admin/orders/abc = prefix match for detail page
        const detailPage = resolveRoute("/admin/orders/abc", new URLSearchParams());
        expect(detailPage?.route.id).toBe("admin.orders.detail");
      });

      it("exact match should score higher than prefix match for same pathname", () => {
        // When pathname is exactly /admin/orders, exact match (100) beats prefix (50+)
        const result = resolveRoute("/admin/orders", new URLSearchParams());
        expect(result?.route.matchMode).toBe("exact");
        expect(result?.route.id).toBe("admin.orders.all");
      });
    });
  });

  describe("Menu Builder Bug Fix", () => {
    // These tests specifically verify the bug is fixed:
    // Previously, when on /admin/product-menu?view=all-categories,
    // all three Menu Builder nav items would show as active

    it("should only activate all-categories when view=all-categories", () => {
      const pathname = "/admin/product-menu";
      const searchParams = new URLSearchParams("view=all-categories");

      const resolved = resolveRoute(pathname, searchParams);
      expect(resolved?.route.id).toBe("admin.menu-builder.all-categories");

      // Check that the other Menu Builder routes do NOT match
      const labelsRoute = findRouteByHref("/admin/product-menu?view=all-labels");
      const menuRoute = findRouteByHref("/admin/product-menu?view=menu");

      // These should be different routes
      expect(resolved?.route.id).not.toBe(labelsRoute?.id);
      expect(resolved?.route.id).not.toBe(menuRoute?.id);
    });

    it("should only activate all-labels when view=all-labels", () => {
      const pathname = "/admin/product-menu";
      const searchParams = new URLSearchParams("view=all-labels");

      const resolved = resolveRoute(pathname, searchParams);
      expect(resolved?.route.id).toBe("admin.menu-builder.all-labels");
    });

    it("should only activate menu when view=menu", () => {
      const pathname = "/admin/product-menu";
      const searchParams = new URLSearchParams("view=menu");

      const resolved = resolveRoute(pathname, searchParams);
      expect(resolved?.route.id).toBe("admin.menu-builder.menu");
    });
  });

  describe("buildHref", () => {
    it("should return pathname for exact route", () => {
      const route = getRouteById("admin.products.coffees")!;
      expect(buildHref(route)).toBe("/admin/products");
    });

    it("should append query params for param routes", () => {
      const route = getRouteById("admin.menu-builder.all-categories")!;
      expect(buildHref(route)).toBe("/admin/product-menu?view=all-categories");
    });

    it("should return '#' for non-navigable routes", () => {
      const route = getRouteById("admin.products")!;
      expect(route.isNavigable).toBe(false);
      expect(buildHref(route)).toBe("#");
    });

    it("should handle routes without query params", () => {
      const route = getRouteById("admin.settings.storefront")!;
      expect(buildHref(route)).toBe("/admin/settings/storefront");
    });

    it("should handle menu view query param", () => {
      const route = getRouteById("admin.menu-builder.menu")!;
      expect(buildHref(route)).toBe("/admin/product-menu?view=menu");
    });
  });

  describe("getNavigableChildren", () => {
    it("should return 5 children for admin.products", () => {
      const children = getNavigableChildren("admin.products");
      const labels = children.map((c) => c.label);
      expect(labels).toEqual(["Coffees", "Merch", "Categories", "Labels", "Menu"]);
    });

    it("should return 2 children for admin.orders", () => {
      const children = getNavigableChildren("admin.orders");
      const labels = children.map((c) => c.label);
      expect(labels).toEqual(["All Orders", "Subscriptions"]);
    });

    it("should return 3 children for admin.pages", () => {
      const children = getNavigableChildren("admin.pages");
      const labels = children.map((c) => c.label);
      expect(labels).toEqual(["About", "Cafe", "FAQ"]);
    });

    it("should return 10 children for admin.settings", () => {
      const children = getNavigableChildren("admin.settings");
      expect(children).toHaveLength(10);
      expect(children[0].label).toBe("General");
      expect(children[9].label).toBe("Social Links");
    });

    it("should exclude label:null children (e.g., admin.products.coffees has edit with null label)", () => {
      const children = getNavigableChildren("admin.products.coffees");
      const labels = children.map((c) => c.label);
      expect(labels).toContain("New Product");
      expect(labels).not.toContain(null);
      // edit route has label: null and should be excluded
      expect(children).toHaveLength(1);
    });

    it("should return empty array for route with no children", () => {
      const children = getNavigableChildren("admin.profile");
      expect(children).toEqual([]);
    });

    it("should return empty array for non-existent route", () => {
      const children = getNavigableChildren("admin.nonexistent");
      expect(children).toEqual([]);
    });

    it("should produce correct query string hrefs for param routes", () => {
      const children = getNavigableChildren("admin.products");
      const categoriesChild = children.find((c) => c.label === "Categories");
      const labelsChild = children.find((c) => c.label === "Labels");
      const menuChild = children.find((c) => c.label === "Menu");

      expect(categoriesChild?.href).toBe("/admin/product-menu?view=all-categories");
      expect(labelsChild?.href).toBe("/admin/product-menu?view=all-labels");
      expect(menuChild?.href).toBe("/admin/product-menu?view=menu");
    });

    it("should produce non-empty href strings (not '#') for all items", () => {
      const groups = [
        "admin.products",
        "admin.orders",
        "admin.pages",
        "admin.settings",
        "admin.management",
      ];
      for (const groupId of groups) {
        const children = getNavigableChildren(groupId);
        for (const child of children) {
          expect(child.href).not.toBe("#");
          expect(child.href.length).toBeGreaterThan(0);
        }
      }
    });

    it("should return 4 children for admin.management", () => {
      const children = getNavigableChildren("admin.management");
      const labels = children.map((c) => c.label);
      expect(labels).toEqual(["All Users", "Newsletter", "Reviews", "Support"]);
    });
  });
});
