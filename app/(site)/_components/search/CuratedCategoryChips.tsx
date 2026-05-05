"use client";

import type { SearchDrawerChip } from "@/lib/data";
import { Chip } from "@/components/ui/chip";

/**
 * Chip row in the search drawer. Clicking a chip filters the drawer body
 * in-place to that category's products (the parent owns the active state).
 * Clicking the active chip again deselects it.
 */
export function CuratedCategoryChips({
  heading,
  chips,
  activeChipSlug,
  onChipClick,
}: {
  heading: string;
  chips: SearchDrawerChip[];
  activeChipSlug: string | null;
  onChipClick: (slug: string) => void;
}) {
  if (chips.length === 0) return null;

  return (
    <section aria-labelledby="search-drawer-chips-heading">
      <h2
        id="search-drawer-chips-heading"
        className="text-base font-semibold mb-4"
      >
        {heading}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.slug}>
            <Chip
              variant={activeChipSlug === chip.slug ? "active" : "inactive"}
              size="nav"
              onClick={() => onChipClick(chip.slug)}
            >
              {chip.name}
            </Chip>
          </li>
        ))}
      </ul>
    </section>
  );
}
