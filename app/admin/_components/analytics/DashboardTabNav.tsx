"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_PAGES } from "@/lib/config/admin-pages";

const TABS = [
  ADMIN_PAGES.overview,
  ADMIN_PAGES.sales,
  ADMIN_PAGES.analytics,
];

export function DashboardTabNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("mb-4", className)}>
      <div className="bg-muted inline-flex h-9 items-center rounded-lg p-[3px]">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex h-[calc(100%-1px)] items-center rounded-md px-3 py-1 text-sm font-medium transition-[color,box-shadow]",
              pathname === tab.href
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
