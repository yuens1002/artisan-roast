"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChipPreview } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

interface LabelOption {
  id: string;
  name: string;
  categories: { category: { name: string; slug: string } }[];
}

/**
 * Single-select Combobox for the search drawer's chip label. Below the
 * dropdown, a read-only chip preview shows the categories that will appear
 * under the selected label in the drawer (matches storefront chip styling,
 * slightly muted to signal non-interactive).
 */
export function LabelSelect({
  labels,
  selectedId,
  onChange,
}: {
  labels: LabelOption[];
  selectedId: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = labels.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            type="button"
          >
            <span className={cn(!selected && "text-muted-foreground")}>
              {selected ? selected.name : "Select a label…"}
            </span>
            <ChevronDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search labels…" />
            <CommandList>
              <CommandEmpty>No label found.</CommandEmpty>
              <CommandGroup>
                {labels.map((l) => (
                  <CommandItem
                    key={l.id}
                    value={l.name}
                    onSelect={() => {
                      onChange(l.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        selectedId === l.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {l.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Read-only chip preview — admin sees exactly what visitors will see
          before any chip is clicked. <ChipPreview> renders the inactive
          variant (bg-secondary at 60% opacity) as a non-interactive <span>. */}
      {selected && selected.categories.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Chip preview">
          {selected.categories.map((c) => (
            <li key={c.category.slug}>
              <ChipPreview size="nav">{c.category.name}</ChipPreview>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
