"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Interactive chip — the design-language counterpart to <Badge>. Use Badge for
 * informational/static labels (renders <div>); use Chip for clickable
 * filter/nav surfaces (renders <button> with aria-pressed, or <span> for
 * read-only previews via the `preview` variant).
 *
 * Variants:
 *  - active   → bg-primary; reads as "selected/applied"
 *  - inactive → bg-secondary at 60% opacity, hover 80%; the resting state
 *  - preview  → same paint as inactive, no interactivity (read-only previews)
 *
 * Sizes:
 *  - nav    → text-sm, rounded-md — search-drawer-scale chips
 *  - filter → text-xs, rounded-full — review-pill-scale filter chips
 */
const chipVariants = cva(
  "inline-flex items-center font-medium transition-opacity transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        active: "bg-primary text-primary-foreground",
        inactive:
          "bg-secondary text-secondary-foreground opacity-60 hover:opacity-80",
        preview: "bg-secondary text-secondary-foreground opacity-60",
      },
      size: {
        nav: "text-sm px-4 py-2 rounded-md",
        filter: "text-xs px-2 py-0.5 rounded-full",
      },
    },
    defaultVariants: {
      variant: "inactive",
      size: "nav",
    },
  }
);

type ChipBaseProps = VariantProps<typeof chipVariants> & {
  className?: string;
};

export interface ChipProps
  extends ChipBaseProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** Render as a button (default) — interactive, supports aria-pressed. */
  type?: "button" | "submit" | "reset";
}

/**
 * Interactive chip rendered as a <button>. Sets `aria-pressed` automatically
 * to reflect `variant === "active"`. Pass `aria-pressed` explicitly only if
 * you need to override (e.g. tri-state).
 */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, variant, size, type = "button", "aria-pressed": ariaPressed, ...props }, ref) => {
    const computedAriaPressed =
      ariaPressed !== undefined ? ariaPressed : variant === "active";
    return (
      <button
        ref={ref}
        type={type}
        aria-pressed={computedAriaPressed}
        className={cn(chipVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Chip.displayName = "Chip";

export interface ChipPreviewProps
  extends ChipBaseProps,
    Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  children?: React.ReactNode;
}

/**
 * Read-only chip for previews (admin form surfacing what storefront chips
 * will render, etc.). Forces the `preview` variant. Renders a <span> so it
 * isn't focusable or clickable — purely visual.
 */
export const ChipPreview = React.forwardRef<HTMLSpanElement, ChipPreviewProps>(
  ({ className, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(chipVariants({ variant: "preview", size }), className)}
      {...props}
    />
  )
);
ChipPreview.displayName = "ChipPreview";

export { chipVariants };
