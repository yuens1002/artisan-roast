"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SaveStatus, SaveStatusState } from "@/app/admin/_components/forms/SaveStatus";

interface ProductPageLayoutProps {
  title: string;
  description?: string;
  saveStatus?: SaveStatusState;
  saveErrorMessage?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  /** Manual save handler — when provided, shows "Create Product" button instead of SaveStatus */
  onManualSave?: () => void;
  /** Whether the manual save is in progress */
  isSaving?: boolean;
  /** Left column (50%) — product info */
  productInfo: ReactNode;
  /** Right column (50%) — variants & pricing */
  variants: ReactNode;
  /** Left column (50%) — specs (coffee or merch details) */
  specs?: ReactNode;
  /** Right column (50%) — categories */
  categories?: ReactNode;
  /** Full-width — add-ons */
  addOns?: ReactNode;
}

export function ProductPageLayout({
  title,
  description,
  saveStatus = "saved",
  saveErrorMessage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onManualSave,
  isSaving,
  productInfo,
  variants,
  specs,
  categories,
  addOns,
}: ProductPageLayoutProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Sentinel for stuck detection */}
      <div ref={sentinelRef} className="h-0" />

      {/* Sticky action bar */}
      <div
        className="sticky top-[calc(4rem-1px)] z-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-4 pb-1 flex justify-end pointer-events-none"
      >
        <div className={`pointer-events-auto px-3 py-3 ${
          isStuck ? "bg-background rounded-b-lg border border-t-0 border-border" : ""
        }`}>
          {onManualSave ? (
            <Button
              type="button"
              onClick={onManualSave}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? "Creating…" : "Create Product"}
            </Button>
          ) : (
            <SaveStatus
              status={saveStatus}
              errorMessage={saveErrorMessage}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={onUndo}
              onRedo={onRedo}
            />
          )}
        </div>
      </div>

      <div className="space-y-12">
        {/* Product Info (2-col at lg via ProductInfoSection's own grid) */}
        <div className="min-w-0">{productInfo}</div>

        {/* Variants — full width */}
        <div className="min-w-0">{variants}</div>

        {/* Row 2: Specs (50%) + Categories (50%) */}
        {(specs || categories) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-x-16">
            <div>{specs}</div>
            <div>{categories}</div>
          </div>
        )}

        {/* Row 3: Add-ons (100%) */}
        {addOns}
      </div>
    </div>
  );
}
