"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

/**
 * Single-select Combobox for the curated products category. Searchable.
 * Allows clearing the selection (sets curatedCategory to null on save).
 */
export function CuratedCategorySelect({
  categories,
  selectedSlug,
  onChange,
}: {
  categories: CategoryOption[];
  selectedSlug: string | null;
  onChange: (slug: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.slug === selectedSlug) ?? null;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between font-normal"
            type="button"
          >
            <span className={cn(!selected && "text-muted-foreground")}>
              {selected ? selected.name : "Select a category…"}
            </span>
            <ChevronDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search categories…" />
            <CommandList>
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup>
                {categories.map((c) => (
                  <CommandItem
                    key={c.slug}
                    value={`${c.name} ${c.slug}`}
                    onSelect={() => {
                      onChange(c.slug === selectedSlug ? null : c.slug);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        selectedSlug === c.slug ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          aria-label="Clear curated category"
          type="button"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
