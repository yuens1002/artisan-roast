"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const actionClasses = "text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors";

interface ChartTab {
  key: string;
  label: string;
}

interface ChartCardProps {
  title: string;
  titleIcon?: React.ComponentType<{ className?: string }>;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  tabs?: ChartTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  loading?: boolean;
  className?: string;
}

export function ChartCard({
  title,
  titleIcon: TitleIcon,
  description,
  action,
  children,
  tabs,
  activeTab,
  onTabChange,
  loading,
  className,
}: ChartCardProps) {
  return (
    <Card className={cn("flex flex-col overflow-hidden shadow-none", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-1.5">
            {TitleIcon && <TitleIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        {tabs && tabs.length > 1 ? (
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="h-8">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="text-xs px-2.5"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : action ? (
          <div className="text-sm">{action}</div>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        {loading ? (
          <Skeleton className="h-[250px] w-full rounded-md" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/* ── Reusable action links / buttons for the ChartCard action slot ── */

interface ChartCardLinkActionProps {
  href: string;
  label?: string;
}

/** Navigation link action — "View All →" style */
export function ChartCardLinkAction({ href, label = "View All" }: ChartCardLinkActionProps) {
  return (
    <Link href={href} className={actionClasses}>
      {label} <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

interface ChartCardToggleActionProps {
  expanded: boolean;
  onToggle: () => void;
  collapsedLabel?: string;
  expandedLabel?: string;
}

/** Toggle button action — "View all ›" / "Top 10" style */
export function ChartCardToggleAction({
  expanded,
  onToggle,
  collapsedLabel = "View all",
  expandedLabel = "Top 10",
}: ChartCardToggleActionProps) {
  return (
    <button
      type="button"
      className={cn(actionClasses, "cursor-pointer")}
      onClick={onToggle}
    >
      {expanded ? expandedLabel : collapsedLabel} <ArrowRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
    </button>
  );
}
