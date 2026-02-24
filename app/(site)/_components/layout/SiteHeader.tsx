"use client";

import { ShoppingCart } from "@/app/(site)/_components/cart/ShoppingCart";
import { UserMenu } from "@/app/(site)/_components/navigation/UserMenu";
import { DynamicIcon, type IconName } from "@/components/shared/icons/DynamicIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNavOverflow } from "@/hooks/useNavOverflow";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";
import { ChevronDown, CircleUserRound, FileText, Home, LogIn, LogOut, Menu, MoreHorizontal, PackageSearch, Search, User } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CategoryMenuColumns } from "../navigation/CategoryMenuColumns";
import { SiteBanner, type BannerVariant } from "./SiteBanner";

const ListItem = React.forwardRef<React.ElementRef<"a">, React.ComponentPropsWithoutRef<"a">>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              className
            )}
            {...props}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
          </a>
        </NavigationMenuLink>
      </li>
    );
  }
);
ListItem.displayName = "ListItem";

interface PageLink {
  id: string;
  slug: string;
  title: string;
  icon: string | null;
  headerOrder: number | null;
  type: string;
  url: string | null;
}

interface BannerConfig {
  variant?: BannerVariant;
  message: string;
  icon?: IconName;
  dismissible?: boolean;
  link?: {
    href: string;
    label: string;
  };
}

interface NavCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
}

interface SiteHeaderProps {
  categoryGroups: Record<string, NavCategory[]>;
  labelIcons?: Record<string, string>;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  pages: PageLink[];
  banner?: BannerConfig;
  productMenuIcon?: string;
  productMenuText?: string;
}

/**
 * The site-wide header. This is a Client Component because
 * it uses the ThemeSwitcher, which is a Client Component.
 */
export default function SiteHeader({
  categoryGroups,
  labelIcons,
  user,
  pages,
  banner,
  productMenuIcon = "ShoppingBag",
  productMenuText = "Shop",
}: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { settings } = useSiteSettings();
  const { visible: visiblePages, overflow: overflowPages } = useNavOverflow(
    pages,
    { 768: 3, 1024: 5 },
    pages.length
  );

  // Controlled NavigationMenu — debounce close to prevent hover/click race condition.
  // When hover opens the menu, an immediate click tries to close it, but the mouse
  // is still over the trigger so hover re-opens it → flicker. Debouncing the close
  // by 300ms lets the hover "stick" and ignores the spurious click-to-close.
  const [navValue, setNavValue] = useState("");
  const navOpenedAt = useRef(0);
  const handleNavValueChange = useCallback((val: string) => {
    if (val) {
      setNavValue(val);
      navOpenedAt.current = Date.now();
    } else if (Date.now() - navOpenedAt.current > 300) {
      setNavValue(val);
    }
  }, []);

  const handleScroll = useCallback(() => {
    // Keep navbar always visible on mobile (< md breakpoint)
    if (window.innerWidth < 768) return;

    const currentScrollY = window.scrollY;
    const threshold = 10;

    // Always show header when at top of page
    if (currentScrollY < threshold) {
      setIsHeaderVisible(true);
      lastScrollY.current = currentScrollY;
      return;
    }

    // Determine scroll direction with threshold to avoid jitter
    const scrollDiff = currentScrollY - lastScrollY.current;
    if (Math.abs(scrollDiff) < threshold) return;

    if (scrollDiff > 0) {
      // Scrolling down - hide header
      setIsHeaderVisible(false);
    } else {
      // Scrolling up - show header
      setIsHeaderVisible(true);
    }

    lastScrollY.current = currentScrollY;
  }, []);

  useEffect(() => {
    // Mounted flag guards Radix IDs from mismatching between SSR and client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  }

  return (
    <header
      className={cn(
        "bg-background/90 shadow-md sticky top-0 z-50 w-full backdrop-blur-md transition-transform duration-300",
        isHeaderVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      {/* Site Banner - inline above header content */}
      {banner && !isBannerDismissed && (
        <SiteBanner
          variant={banner.variant}
          message={banner.message}
          icon={banner.icon}
          dismissible={banner.dismissible}
          onDismiss={() => setIsBannerDismissed(true)}
          link={banner.link}
        />
      )}
      <div className="mx-auto max-w-screen-2xl px-4 md:px-8 py-2 md:py-4 flex items-center">
        {/* Container A: hamburger (mobile) / nav (desktop) — swaps from left to center */}
        <div className="order-1 md:order-2 md:flex-1 flex md:justify-center">
          {isClient && (
            <>
              {/* Mobile hamburger */}
              <Sheet>
                <SheetTrigger asChild className="md:hidden">
                  <Button
                    variant="outline"
                    size="icon"
                    className="focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Menu className="w-6 h-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-full sm:w-[320px] bg-background p-0 flex flex-col"
                >
                  <div className="px-4 pt-6 pb-1">
                    <div className="flex items-center justify-between mb-1">
                      <SheetHeader>
                        <SheetTitle className="text-2xl font-bold tracking-tight text-foreground text-left">
                          Menu
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                          Navigate to different sections of the site including home and coffee
                          categories
                        </SheetDescription>
                      </SheetHeader>
                    </div>
                    <div className="flex w-full">
                      <SheetClose asChild>
                        <Link
                          href="/"
                          className="inline-flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-md text-foreground hover:text-primary hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Home className="w-5 h-5" />
                          <span className="text-[10px] uppercase tracking-wide font-medium">
                            Home
                          </span>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/search"
                          className="inline-flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-md text-foreground hover:text-primary hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Search className="w-5 h-5" />
                          <span className="text-[10px] uppercase tracking-wide font-medium">
                            Search
                          </span>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/orders"
                          className="inline-flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-md text-foreground hover:text-primary hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <PackageSearch className="w-5 h-5" />
                          <span className="text-[10px] uppercase tracking-wide font-medium">
                            Orders
                          </span>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/account"
                          className="inline-flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-md text-foreground hover:text-primary hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <CircleUserRound className="w-5 h-5" />
                          <span className="text-[10px] uppercase tracking-wide font-medium">
                            Account
                          </span>
                        </Link>
                      </SheetClose>
                    </div>
                  </div>
                  <nav
                    aria-label="Mobile"
                    className="flex-1 overflow-y-auto px-6 pt-8 pb-4 border-t border-border"
                  >
                    {Object.entries(categoryGroups).map(([label, categories]) => (
                      <div key={label} className="mb-6">
                        <div className="flex items-center gap-2 mb-2 px-4">
                          {labelIcons?.[label] ? (
                            <DynamicIcon name={labelIcons[label]} className="w-5 h-5" />
                          ) : (
                            <DynamicIcon name={productMenuIcon as IconName} className="w-5 h-5" />
                          )}
                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {label}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {categories.map((category) => (
                            <li key={category.slug}>
                              <SheetClose asChild>
                                <Button
                                  variant="ghost"
                                  asChild
                                  className="w-full justify-start font-normal"
                                >
                                  <Link href={`/${category.slug}`}>{category.name}</Link>
                                </Button>
                              </SheetClose>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    {/* Dynamic Pages */}
                    {pages.length > 0 && (
                      <div className="mb-6 pt-4 border-t border-border">
                        <ul className="space-y-1">
                          {pages.map((page) => (
                            <li key={page.id}>
                              <SheetClose asChild>
                                <Button
                                  variant="ghost"
                                  asChild
                                  className="w-full justify-start font-normal"
                                >
                                  <Link
                                    href={
                                      page.type === "LINK" && page.url
                                        ? page.url
                                        : `/pages/${page.slug}`
                                    }
                                    className="flex items-center gap-2"
                                  >
                                    {page.icon && <DynamicIcon name={page.icon} size={16} />}
                                    {page.title}
                                  </Link>
                                </Button>
                              </SheetClose>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </nav>
                  <div className="px-6 pb-6 mt-auto">
                    {user ? (
                      <SheetClose asChild>
                        <Button
                          className="w-full"
                          variant="secondary"
                          onClick={() => signOut({ callbackUrl: "/" })}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </Button>
                      </SheetClose>
                    ) : (
                      <SheetClose asChild>
                        <Button className="w-full" variant="secondary" asChild>
                          <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`}>
                            <LogIn className="w-4 h-4 mr-2" />
                            Sign In
                          </Link>
                        </Button>
                      </SheetClose>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center">
                <NavigationMenu value={navValue} onValueChange={handleNavValueChange} delayDuration={200}>
                  <NavigationMenuList>
                    <NavigationMenuItem value="shop">
                      <NavigationMenuTrigger className="h-auto px-2 py-2 text-foreground [&>svg]:hidden">
                        <div className="flex flex-col items-center gap-1">
                          <DynamicIcon name={productMenuIcon as IconName} className="w-5 h-5" />
                          <div className="flex items-center gap-0.5">
                            <span className="text-[10px] uppercase tracking-wide font-medium leading-3">
                              {productMenuText}
                            </span>
                            <ChevronDown
                              className="h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-[600px] p-6 h-[330px] overflow-y-auto">
                          <CategoryMenuColumns
                            categoryGroups={categoryGroups}
                            labelIcons={labelIcons}
                          />
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>

                    {visiblePages.map((page) => (
                      <NavigationMenuItem key={page.id}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={
                              page.type === "LINK" && page.url ? page.url : `/pages/${page.slug}`
                            }
                            className={cn(
                              navigationMenuTriggerStyle(),
                              "h-auto flex-col gap-1 px-2 py-2 text-foreground"
                            )}
                          >
                            {page.icon ? (
                              <DynamicIcon name={page.icon} className="w-5 h-5" />
                            ) : (
                              <FileText className="w-5 h-5" />
                            )}
                            <span className="text-[10px] uppercase tracking-wide font-medium leading-3">
                              {page.title}
                            </span>
                          </Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>

                {/* "More" dropdown — outside NavigationMenu so it positions below its own trigger */}
                {overflowPages.length > 0 && (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="h-auto px-2 py-2 text-foreground hover:text-primary transition-colors bg-transparent border-none cursor-pointer inline-flex items-center outline-none"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <MoreHorizontal className="w-5 h-5" />
                          <span className="text-[10px] uppercase tracking-wide font-medium leading-3">
                            More
                          </span>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {overflowPages.map((page) => (
                        <DropdownMenuItem key={page.id} asChild>
                          <Link
                            href={
                              page.type === "LINK" && page.url
                                ? page.url
                                : `/pages/${page.slug}`
                            }
                            className="flex items-center gap-2"
                          >
                            {page.icon ? (
                              <DynamicIcon name={page.icon} size={16} />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                            {page.title}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </>
          )}
        </div>

        {/* Container B: logo — swaps from center to left */}
        <div className="order-2 md:order-1 flex-1 md:flex-none flex justify-center md:justify-start">
          <Link
            href="/"
            className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-foreground"
          >
            <Image
              src={settings.storeLogoUrl}
              alt={`${settings.storeName} Logo`}
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="hidden text-[10px] md:text-lg lg:text-xl md:inline md:normal-case tracking-wide md:tracking-normal font-medium md:font-bold">
              {settings.storeName}
            </span>
          </Link>
        </div>

        {/* Container C: icons — always right */}
        <div className="order-3 flex items-center gap-4">
          {isClient ? (
            <>
              {/* Search - desktop only */}
              <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden md:flex">
                    <Search className="h-5 w-5" />
                    <span className="sr-only">Search products</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Search Products</DialogTitle>
                    <DialogDescription>
                      Search for your favorite specialty coffees
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSearch} className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Try 'Ethiopian' or 'fruity'..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                  </form>
                </DialogContent>
              </Dialog>

              {/* Account - desktop only */}
              <div className="hidden md:flex">
                {user ? (
                  <UserMenu user={user} />
                ) : (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`}>
                      <User className="w-4 h-4 lg:mr-2" />
                      <span className="hidden lg:inline">Sign In</span>
                    </Link>
                  </Button>
                )}
              </div>

              {/* Cart - always visible */}
              <ShoppingCart />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
