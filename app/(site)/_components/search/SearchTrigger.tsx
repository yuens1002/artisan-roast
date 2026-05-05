"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchDrawerStore } from "./store";
import { cn } from "@/lib/utils";

/**
 * Search drawer trigger button. Opens the SearchDrawer overlay.
 * Mounted in SiteHeader (desktop icon + mobile sheet item).
 *
 * `onBeforeOpen` runs synchronously before the search drawer opens — used
 * by the mobile-sheet variant to close the parent menu Sheet so the two
 * overlays don't stack. Desktop variant ignores it (no parent overlay).
 */
export function SearchTrigger({
  variant = "icon",
  className,
  onBeforeOpen,
}: {
  variant?: "icon" | "mobile-sheet";
  className?: string;
  onBeforeOpen?: () => void;
}) {
  const open = useSearchDrawerStore((s) => s.open);

  const handleClick = () => {
    onBeforeOpen?.();
    open();
  };

  if (variant === "mobile-sheet") {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-md text-foreground hover:text-primary hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className
        )}
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px] uppercase tracking-wide font-medium">
          Search
        </span>
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn("hidden md:flex", className)}
    >
      <Search className="h-5 w-5" />
      <span className="sr-only">Search products</span>
    </Button>
  );
}
