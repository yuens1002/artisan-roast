"use client";

import { Crown, MapPin, Search } from "lucide-react";
import { ChartCard, ChartCardLinkAction } from "../analytics/ChartCard";
import { RankedList } from "../analytics/RankedList";
import type { RankedItem } from "@/lib/admin/analytics/contracts";

interface TopMoversSectionProps {
  topLocations: RankedItem[];
  topSearches: RankedItem[];
  topCustomers: RankedItem[];
}

export function TopMoversSection({
  topLocations,
  topSearches,
  topCustomers,
}: TopMoversSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ChartCard title="Top Locations" titleIcon={MapPin} description="Revenue by customer location">
        <RankedList
          items={topLocations}
          valueLabel="Revenue"
          limit={5}
        />
      </ChartCard>
      <ChartCard
        title="Top Searches"
        titleIcon={Search}
        description="Most popular search terms"
        action={<ChartCardLinkAction href="/admin/analytics" />}
      >
        <RankedList
          items={topSearches}
          valueLabel="Count"
          limit={5}
        />
      </ChartCard>
      <ChartCard title="Top Customers" titleIcon={Crown} description="Highest spending customers">
        <RankedList
          items={topCustomers}
          valueLabel="Revenue"
          limit={5}
        />
      </ChartCard>
    </div>
  );
}
