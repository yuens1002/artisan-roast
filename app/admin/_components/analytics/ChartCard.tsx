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
import { cn } from "@/lib/utils";

interface ChartTab {
  key: string;
  label: string;
}

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  tabs?: ChartTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  loading?: boolean;
  className?: string;
}

export function ChartCard({
  title,
  description,
  children,
  tabs,
  activeTab,
  onTabChange,
  loading,
  className,
}: ChartCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        {tabs && tabs.length > 1 && (
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
        )}
      </CardHeader>
      <CardContent className="pb-4">
        {loading ? (
          <Skeleton className="h-[250px] w-full rounded-md" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
