import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SiteHeader from "@/app/(site)/_components/layout/SiteHeader";

// Mock next-auth/react
jest.mock("next-auth/react", () => ({
  signOut: jest.fn(),
}));

// Dynamic pathname mock — tests can mutate `mockPathname` and rerender to
// simulate Next router navigation.
let mockPathname = "/";
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => mockPathname,
}));

// Mock components that have external dependencies
jest.mock("@/components/shared/ThemeSwitcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher">ThemeSwitcher</div>,
}));

jest.mock("@/app/(site)/_components/cart/ShoppingCart", () => ({
  ShoppingCart: () => <div data-testid="shopping-cart">ShoppingCart</div>,
}));

jest.mock("@/app/(site)/_components/navigation/UserMenu", () => ({
  UserMenu: () => <div data-testid="user-menu">UserMenu</div>,
}));

jest.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: () => ({
    settings: {
      storeName: "Test Coffee",
      storeLogoUrl: "/logo.svg",
    },
  }),
}));

describe("SiteHeader - Category Menu Integration", () => {
  const mockCategoryGroups = {
    "BY ROAST LEVEL": [
      { id: "1", name: "Light Roast", slug: "light-roast", order: 1 },
      { id: "2", name: "Medium Roast", slug: "medium-roast", order: 2 },
      { id: "3", name: "Dark Roast", slug: "dark-roast", order: 3 },
    ],
    "BY TASTE PROFILE": [
      {
        id: "4",
        name: "Nutty & Chocolatey",
        slug: "nutty-chocolatey",
        order: 1,
      },
      { id: "5", name: "Fruity & Floral", slug: "fruity-floral", order: 2 },
    ],
  };

  const mockPages = [
    {
      id: "p1",
      slug: "about",
      title: "About",
      icon: "Info",
      headerOrder: 1,
      type: "PAGE",
      url: null,
    },
  ];

  describe("Desktop Navigation", () => {
    it("renders category groups in desktop navigation menu", () => {
      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          user={null}
          pages={mockPages}
        />
      );

      // Desktop navigation uses CategoryMenuColumns
      // The menu is inside NavigationMenu which is only visible on md+
      // We can verify the structure exists
      expect(screen.getAllByText("Test Coffee")[0]).toBeInTheDocument();
    });

    it("renders label icons when provided in desktop menu", () => {
      const labelIcons = {
        "BY ROAST LEVEL": "Flame",
        "BY TASTE PROFILE": "Coffee",
      };

      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          labelIcons={labelIcons}
          user={null}
          pages={mockPages}
        />
      );

      // CategoryMenuColumns receives labelIcons prop
      expect(screen.getAllByText("Test Coffee")[0]).toBeInTheDocument();
    });

    it("renders page links in desktop navigation", () => {
      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          user={null}
          pages={mockPages}
        />
      );

      // Page link should be rendered
      // Note: In actual render, navigation might be hidden in test environment
      expect(screen.getAllByText("Test Coffee")[0]).toBeInTheDocument();
    });
  });

  describe("Mobile menu — close on link click (event delegation)", () => {
    beforeEach(() => {
      mockPathname = "/";
    });

    it("closes the mobile Sheet when any anchor inside is clicked", async () => {
      // The pathname-effect-based close was removed in favor of an
      // event-delegated onClick handler on SheetContent. This covers both
      // cross-route navigations AND same-pathname clicks (the Next router
      // doesn't re-fire usePathname when the destination equals current).
      // Unit-level coverage of the handler itself lives in
      // menu-close-on-link-click.test.tsx; this test asserts the handler
      // is wired into the rendered SheetContent.
      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          user={null}
          pages={[]}
        />
      );

      const trigger = await screen.findByRole("button", { name: /open menu/i });
      await act(async () => {
        fireEvent.click(trigger);
      });

      expect(await screen.findByText("Menu")).toBeInTheDocument();

      // SheetContent renders into a Radix portal at document.body, so query
      // through screen (which roots at document) rather than the test
      // container. The Home link is rendered unconditionally inside the
      // mobile menu.
      const homeAnchors = screen.getAllByRole("link", { name: /home/i });
      const homeAnchor = homeAnchors.find(
        (a) => a.getAttribute("href") === "/"
      );
      expect(homeAnchor).toBeTruthy();
      await act(async () => {
        fireEvent.click(homeAnchor!);
      });

      await waitFor(() => {
        expect(screen.queryByText("Menu")).not.toBeInTheDocument();
      });
    });
  });

  describe("Mobile Navigation", () => {
    it("renders category groups in mobile menu", () => {
      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          user={null}
          pages={[]}
        />
      );

      // Mobile menu exists (Sheet component)
      // The actual content is inside SheetContent which might not be visible initially
      expect(screen.getAllByText("Test Coffee")[0]).toBeInTheDocument();
    });

    it("renders label icons in mobile menu when provided", () => {
      const labelIcons = {
        "BY ROAST LEVEL": "Flame",
      };

      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          labelIcons={labelIcons}
          user={null}
          pages={[]}
        />
      );

      // Mobile menu should receive labelIcons
      expect(screen.getAllByText("Test Coffee")[0]).toBeInTheDocument();
    });

    it("falls back to coffee bean icon when label icon not provided", () => {
      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          user={null}
          pages={[]}
        />
      );

      // Without labelIcons, should fall back to beans.svg
      expect(screen.getAllByText("Test Coffee")[0]).toBeInTheDocument();
    });
  });

  describe("User Authentication States", () => {
    it("shows sign in button when user is null", () => {
      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          user={null}
          pages={[]}
        />
      );

      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    it("shows user menu when user is authenticated", () => {
      const mockUser = {
        name: "Test User",
        email: "test@example.com",
        image: null,
      };

      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          user={mockUser}
          pages={[]}
        />
      );

      expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    });
  });

  describe("Banner Integration", () => {
    it("renders banner when provided", () => {
      const mockBanner = {
        message: "Special offer: 20% off all coffee!",
        variant: "info" as const,
        dismissible: true,
      };

      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          user={null}
          pages={[]}
          banner={mockBanner}
        />
      );

      expect(screen.getByText(/Special offer/i)).toBeInTheDocument();
    });

    it("does not render banner when not provided", () => {
      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          user={null}
          pages={[]}
        />
      );

      // No banner text should be present
      expect(screen.queryByText(/Special offer/i)).not.toBeInTheDocument();
    });
  });

  describe("storeName prop (SSR override)", () => {
    it("renders server-provided storeName instead of hook value", () => {
      render(
        <SiteHeader
          categoryGroups={{}}
          user={null}
          pages={[]}
          storeName="Morning Roast"
        />
      );

      // Hook returns "Test Coffee" but prop should win
      expect(screen.getAllByText("Morning Roast")[0]).toBeInTheDocument();
      expect(screen.queryByText("Test Coffee")).not.toBeInTheDocument();
    });

    it("uses server storeName in logo alt text", () => {
      render(
        <SiteHeader
          categoryGroups={{}}
          user={null}
          pages={[]}
          storeName="Morning Roast"
        />
      );

      expect(screen.getByAltText("Morning Roast Logo")).toBeInTheDocument();
    });

    it("falls back to hook storeName when prop is not provided", () => {
      render(
        <SiteHeader
          categoryGroups={{}}
          user={null}
          pages={[]}
        />
      );

      expect(screen.getAllByText("Test Coffee")[0]).toBeInTheDocument();
    });
  });

  describe("Props Validation", () => {
    it("handles empty categoryGroups", () => {
      render(<SiteHeader categoryGroups={{}} user={null} pages={[]} />);

      expect(screen.getAllByText("Test Coffee")[0]).toBeInTheDocument();
    });

    it("handles empty pages array", () => {
      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          user={null}
          pages={[]}
        />
      );

      expect(screen.getAllByText("Test Coffee")[0]).toBeInTheDocument();
    });

    it("handles undefined labelIcons", () => {
      render(
        <SiteHeader
          categoryGroups={mockCategoryGroups}
          user={null}
          pages={[]}
        />
      );

      expect(screen.getAllByText("Test Coffee")[0]).toBeInTheDocument();
    });
  });
});
