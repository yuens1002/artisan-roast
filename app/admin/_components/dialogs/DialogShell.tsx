"use client";

import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface DialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  headerExtra?: ReactNode;
  size?: DialogSize;
  children: ReactNode;
  // Option 1: Built-in action buttons (most common)
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  isSaving?: boolean;
  // Option 2: Custom footer (for complex cases)
  footer?: ReactNode;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "!max-w-5xl sm:!max-w-5xl",
  "2xl": "!max-w-[72rem] sm:!max-w-[72rem]",
};

/**
 * DialogShell - Unified dialog shell combining best of BlockDialog + BlockEditDialog
 *
 * Features:
 * - Configurable size (sm, md, lg, xl, 2xl)
 * - Built-in action buttons OR custom footer
 * - Scrollable content area
 * - No separator above footer
 * - Consistent spacing and layout
 *
 * Use this for all admin dialogs going forward.
 * Replaces both BlockDialog and BlockEditDialog.
 *
 * @example Built-in action buttons (most common)
 * ```tsx
 * <DialogShell
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Edit Settings"
 *   description="Configure your settings"
 *   size="md"
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 *   isSaving={loading}
 * >
 *   <FieldGroup>...</FieldGroup>
 * </StandardDialog>
 * ```
 *
 * @example Custom footer (for complex layouts)
 * ```tsx
 * <DialogShell
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Advanced Editor"
 *   size="xl"
 *   footer={
 *     <>
 *       <Button variant="secondary">Preview</Button>
 *       <Button onClick={handleSave}>Save</Button>
 *     </>
 *   }
 * >
 *   <ComplexEditor />
 * </StandardDialog>
 * ```
 *
 * @example No footer (read-only dialogs)
 * ```tsx
 * <DialogShell
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="View Details"
 *   size="md"
 * >
 *   <Details />
 * </StandardDialog>
 * ```
 */
export function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  headerExtra,
  size = "md",
  children,
  onSave,
  onCancel,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  isSaving = false,
  footer,
}: DialogShellProps) {
  // Determine which footer to render
  const showBuiltInButtons = onSave && onCancel && !footer;
  const showCustomFooter = footer && !onSave && !onCancel;
  const _showNoFooter = !footer && !onSave && !onCancel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${sizeClasses[size]} max-h-[90vh] flex flex-col p-0`}
      >
        <DialogHeader className="px-6 pt-6 pb-0 pr-12 shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          {headerExtra}
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>

        {/* Built-in action buttons */}
        {showBuiltInButtons && (
          <div className="flex justify-end gap-2 px-6 pb-6 pt-2 shrink-0">
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              {cancelLabel}
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving..." : saveLabel}
            </Button>
          </div>
        )}

        {/* Custom footer slot */}
        {showCustomFooter && (
          <div className="flex justify-end gap-2 px-6 pb-6 pt-2 shrink-0">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
