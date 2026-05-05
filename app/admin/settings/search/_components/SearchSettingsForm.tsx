"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { LabelSelect } from "./LabelSelect";
import { CuratedCategorySelect } from "./CuratedCategorySelect";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface LabelOption {
  id: string;
  name: string;
  isVisible: boolean;
  categories: { category: { name: string; slug: string } }[];
}

interface SearchSettings {
  chipLabelId: string | null;
  curatedCategorySlug: string | null;
}

interface SearchSettingsFormProps {
  initialSettings: SearchSettings;
  labels: LabelOption[];
  categories: CategoryOption[];
  defaultLabelId: string | null;
  defaultCategorySlug: string | null;
}

/** Per-field transient error indicator displayed under the dropdown. */
const ERROR_VISIBLE_MS = 4000;

/**
 * Two-section admin form with no Save button. Each change auto-saves via
 * partial PUT; on failure, the field silently rolls back to its prior value
 * AND surfaces an inline error hint for ~4s so the admin sees their change
 * didn't persist.
 *
 * Initial display shows the persisted value if any, otherwise the platform
 * default (1st label / category by `order`). Empty-string curated value is
 * the "explicitly cleared" sentinel and renders as no selection.
 */
export function SearchSettingsForm({
  initialSettings,
  labels,
  categories,
  defaultLabelId,
  defaultCategorySlug,
}: SearchSettingsFormProps) {
  const initialLabelId = initialSettings.chipLabelId ?? defaultLabelId;
  const initialCuratedSlug =
    initialSettings.curatedCategorySlug === null
      ? defaultCategorySlug
      : initialSettings.curatedCategorySlug === ""
        ? null
        : initialSettings.curatedCategorySlug;

  const [chipLabelId, setChipLabelId] = useState<string | null>(initialLabelId);
  const [curatedSlug, setCuratedSlug] = useState<string | null>(
    initialCuratedSlug
  );
  // Per-field error timestamps. Set on rollback, auto-cleared after
  // ERROR_VISIBLE_MS via the effect below; cleared immediately on a
  // subsequent successful save so the indicator goes away once the admin
  // recovers.
  const [labelErrorAt, setLabelErrorAt] = useState<number | null>(null);
  const [curatedErrorAt, setCuratedErrorAt] = useState<number | null>(null);

  useEffect(() => {
    if (!labelErrorAt) return;
    const timer = setTimeout(() => setLabelErrorAt(null), ERROR_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [labelErrorAt]);
  useEffect(() => {
    if (!curatedErrorAt) return;
    const timer = setTimeout(() => setCuratedErrorAt(null), ERROR_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [curatedErrorAt]);

  async function autoSave(
    body: { chipLabelId?: string; curatedCategorySlug?: string },
    onSuccess: () => void,
    rollback: () => void
  ) {
    try {
      const res = await fetch("/api/admin/settings/search-drawer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        rollback();
        return;
      }
      onSuccess();
    } catch {
      rollback();
    }
  }

  // Race-safe rollback: only revert to `prev` if the field still holds the
  // optimistic value we set. If the user fired a newer change before this
  // request resolved, leave their newer value alone — preserve user intent
  // over a failed earlier write.
  function handleLabelChange(id: string) {
    const prev = chipLabelId;
    setChipLabelId(id); // optimistic
    void autoSave(
      { chipLabelId: id },
      () => setLabelErrorAt(null),
      () => {
        setChipLabelId((current) => (current === id ? prev : current));
        setLabelErrorAt(Date.now());
      }
    );
  }

  function handleCuratedChange(slug: string | null) {
    const prev = curatedSlug;
    setCuratedSlug(slug);
    void autoSave(
      { curatedCategorySlug: slug ?? "" },
      () => setCuratedErrorAt(null),
      () => {
        setCuratedSlug((current) => (current === slug ? prev : current));
        setCuratedErrorAt(Date.now());
      }
    );
  }

  return (
    <div className="space-y-12">
      {/* Section 1: Search drawer chips */}
      <div className="space-y-3 max-w-[72ch]">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Search drawer chips</Label>
          <p className="text-sm text-muted-foreground">
            Use Menu Builder to add or select an existing label to showcase
            categories.
          </p>
        </div>
        {labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No labels yet —{" "}
            <Link
              href="/admin/product-menu"
              className="underline underline-offset-2 hover:text-foreground"
            >
              create one in Menu Builder
            </Link>{" "}
            to use search chips.
          </p>
        ) : (
          <>
            <LabelSelect
              labels={labels}
              selectedId={chipLabelId}
              onChange={handleLabelChange}
            />
            {labelErrorAt && (
              <p
                className="text-xs text-destructive"
                role="status"
                aria-live="polite"
              >
                Couldn&apos;t save — try again.
              </p>
            )}
          </>
        )}
      </div>

      {/* Section 2: Curated products */}
      <div className="space-y-3 max-w-[72ch]">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Curated products</Label>
          <p className="text-sm text-muted-foreground">
            Select a product category to show as the default or when no search
            is found.
          </p>
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories yet —{" "}
            <Link
              href="/admin/product-menu"
              className="underline underline-offset-2 hover:text-foreground"
            >
              create one in Menu Builder
            </Link>
            .
          </p>
        ) : (
          <>
            <CuratedCategorySelect
              categories={categories}
              selectedSlug={curatedSlug}
              onChange={handleCuratedChange}
            />
            {curatedErrorAt && (
              <p
                className="text-xs text-destructive"
                role="status"
                aria-live="polite"
              >
                Couldn&apos;t save — try again.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
